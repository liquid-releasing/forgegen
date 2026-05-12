// videoflow CLI bridge — spawn-per-call (v0 per ../../BRIDGE_DESIGN.md).
//
// Each Tauri command shells out to `videoflow <subcommand>`, captures
// JSON from stdout, returns it to React. v1 will switch to a persistent
// process with JSON-RPC over stdio when forgegen Generate's live preview
// demands sub-100ms latency.

use serde_json::Value;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

// ---------------------------------------------------------------------------
// videoflow binary lookup
// ---------------------------------------------------------------------------

/// Resolve the python interpreter + module-style invocation that drives
/// videoflow. We deliberately bypass the pip-installed `videoflow.exe`
/// console-script wrapper on Windows because it doesn't forward stderr
/// reliably when spawned from non-shell parents (Tokio's `Command`).
/// Calling `python.exe -m videoflow.cli` keeps stderr flowing so the
/// per-stage progress lines reach the bridge.
///
/// Lookup order for python:
///   1. VIDEOFLOW_PYTHON env var (explicit override)
///   2. forgegen/.venv/{Scripts|bin}/python{.exe} (dev default)
///   3. "python" on PATH (last resort)
fn videoflow_command() -> (PathBuf, Vec<String>) {
    let py = python_bin();
    // Windows: wrap with `cmd /C` so the child python.exe inherits a
    // console-friendly stdio environment. Without the wrapper, Tokio's
    // Command spawns python with handle inheritance that breaks Python's
    // sys.stderr writes — direct PowerShell launch produces full
    // progress output but Tokio launch produces zero stderr lines.
    // `-u` keeps stdio unbuffered so progress lines flush per-print.
    if cfg!(windows) {
        (
            PathBuf::from("cmd"),
            vec![
                "/C".into(),
                py.to_string_lossy().to_string(),
                "-u".into(),
                "-m".into(),
                "videoflow".into(),
            ],
        )
    } else {
        (py, vec!["-u".into(), "-m".into(), "videoflow".into()])
    }
}

fn python_bin() -> PathBuf {
    if let Ok(p) = std::env::var("VIDEOFLOW_PYTHON") {
        return PathBuf::from(p);
    }
    if let Some(forgegen_root) = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
    {
        let venv_py = if cfg!(windows) {
            forgegen_root.join(".venv/Scripts/python.exe")
        } else {
            forgegen_root.join(".venv/bin/python")
        };
        if venv_py.exists() {
            return venv_py;
        }
    }
    PathBuf::from("python")
}

// ---------------------------------------------------------------------------
// Sidecar path resolution (matches videoflow.sidecar.sidecar_path_for)
// ---------------------------------------------------------------------------

fn sidecar_path_for(media_path: &str) -> Result<PathBuf, String> {
    let p = Path::new(media_path);
    let stem = p
        .file_stem()
        .ok_or_else(|| format!("invalid media path (no stem): {}", media_path))?
        .to_string_lossy();
    let parent = p
        .parent()
        .ok_or_else(|| format!("invalid media path (no parent): {}", media_path))?;
    Ok(parent.join(format!("{}.chapters.json", stem)))
}

async fn read_sidecar_at(path: &Path) -> Result<Option<Value>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let contents = tokio::fs::read_to_string(path)
        .await
        .map_err(|e| format!("read sidecar {} failed: {}", path.display(), e))?;
    let parsed: Value = serde_json::from_str(&contents)
        .map_err(|e| format!("parse sidecar {} failed: {}", path.display(), e))?;
    Ok(Some(parsed))
}

// ---------------------------------------------------------------------------
// Spawn helper
// ---------------------------------------------------------------------------

async fn spawn_videoflow(args: &[&str]) -> Result<Value, String> {
    let (bin, prefix_args) = videoflow_command();
    let mut full_args: Vec<String> = prefix_args;
    full_args.extend(args.iter().map(|s| s.to_string()));

    let output = Command::new(&bin)
        .args(&full_args)
        .output()
        .await
        .map_err(|e| format!("spawn '{}' failed: {}", bin.display(), e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "videoflow exit {} — stderr: {}",
            output.status.code().unwrap_or(-1),
            stderr.trim()
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout).map_err(|e| {
        let preview: String = stdout.chars().take(200).collect();
        format!("JSON parse failed: {} — stdout preview: {}", e, preview)
    })
}

/// Spawn videoflow and stream per-stage progress as Tauri events on
/// `event_name`. Lines arrive via two independent paths:
///
///   1. **stderr line reader** — works on platforms where Tokio's piped
///      stdio actually forwards python.exe output. Linux/macOS, mostly.
///   2. **temp-file side-channel** — videoflow's `_emit_progress()` also
///      appends `progress: <label>\n` to the file pointed at by the
///      `VIDEOFLOW_PROGRESS_FILE` env var. We poll that file every 200ms
///      and emit the same Tauri events. This is the path that actually
///      works on Windows: Tokio's Command can't read python.exe's piped
///      stderr/stdout reliably here (verified — direct PowerShell launch
///      flushes everything; Tokio launch produces zero bytes on both
///      pipes). The file gets written regardless.
///
/// Both paths emit on the same event; React deduplication isn't needed
/// because the Stepper just maps the latest label to a stage.
///
/// stdout is drained in its own task (NOT via wait_with_output) so the
/// pipe never fills mid-process — earlier wait_with_output combination
/// surfaced as exit code 120 from Python's atexit on Windows.
async fn spawn_videoflow_streaming(
    app: &AppHandle,
    event_name: &str,
    args: &[&str],
) -> Result<Value, String> {
    let (bin, prefix_args) = videoflow_command();
    let mut full_args: Vec<String> = prefix_args;
    full_args.extend(args.iter().map(|s| s.to_string()));

    // Side-channel file: unique per spawn so concurrent runs don't collide.
    let progress_file = std::env::temp_dir().join(format!(
        "forgegen_progress_{}_{}.log",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0)
    ));
    // Truncate/create so polling starts from a known empty state. videoflow
    // opens it in append mode so this just resets length to 0.
    tokio::fs::write(&progress_file, b"").await.ok();

    let mut child = Command::new(&bin)
        .args(&full_args)
        .env("VIDEOFLOW_PROGRESS_FILE", &progress_file)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn '{}' failed: {}", bin.display(), e))?;

    let stdout_handle = child
        .stdout
        .take()
        .ok_or_else(|| "failed to capture videoflow stdout".to_string())?;
    let stderr_handle = child
        .stderr
        .take()
        .ok_or_else(|| "failed to capture videoflow stderr".to_string())?;

    let app_for_task = app.clone();
    let event_name_owned = event_name.to_string();
    let stderr_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stderr_handle).lines();
        let mut other = String::new();
        while let Ok(Some(line)) = reader.next_line().await {
            if let Some(msg) = line.strip_prefix("progress: ") {
                let _ = app_for_task.emit(&event_name_owned, msg.to_string());
            } else if !line.is_empty() {
                other.push_str(&line);
                other.push('\n');
            }
        }
        other
    });

    let stdout_task = tokio::spawn(async move {
        use tokio::io::AsyncReadExt;
        let mut buf = Vec::new();
        let mut reader = BufReader::new(stdout_handle);
        reader.read_to_end(&mut buf).await.ok();
        buf
    });

    // Side-channel polling task. Lives until the main task signals shutdown
    // after child.wait() returns; one final drain catches anything written
    // between the last tick and exit.
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    let app_for_poll = app.clone();
    let event_name_for_poll = event_name.to_string();
    let progress_file_for_poll = progress_file.clone();
    let poll_task = tokio::spawn(async move {
        let mut offset: u64 = 0;
        let mut leftover = String::new();
        loop {
            tokio::select! {
                _ = &mut shutdown_rx => break,
                _ = tokio::time::sleep(std::time::Duration::from_millis(200)) => {
                    offset = drain_progress_file(
                        &progress_file_for_poll,
                        offset,
                        &mut leftover,
                        &app_for_poll,
                        &event_name_for_poll,
                    ).await;
                }
            }
        }
        drain_progress_file(
            &progress_file_for_poll,
            offset,
            &mut leftover,
            &app_for_poll,
            &event_name_for_poll,
        ).await;
    });

    let status = child
        .wait()
        .await
        .map_err(|e| format!("wait videoflow failed: {}", e))?;

    let _ = shutdown_tx.send(());
    let _ = poll_task.await;

    let stderr_other = stderr_task.await.unwrap_or_default();
    let stdout_bytes = stdout_task.await.unwrap_or_default();

    let _ = tokio::fs::remove_file(&progress_file).await;

    if !status.success() {
        return Err(format!(
            "videoflow exit {} — stderr: {}",
            status.code().unwrap_or(-1),
            stderr_other.trim()
        ));
    }

    let stdout = String::from_utf8_lossy(&stdout_bytes);
    serde_json::from_str(&stdout).map_err(|e| {
        let preview: String = stdout.chars().take(200).collect();
        format!("JSON parse failed: {} — stdout preview: {}", e, preview)
    })
}

/// Read new bytes from `path` starting at `offset`, append to `leftover`,
/// emit any complete `progress: <label>` lines, and return the new file
/// length to use as the next offset. Failures are silent — polling skips
/// the tick rather than aborting the task.
async fn drain_progress_file(
    path: &Path,
    offset: u64,
    leftover: &mut String,
    app: &AppHandle,
    event_name: &str,
) -> u64 {
    use tokio::io::{AsyncReadExt, AsyncSeekExt};
    let Ok(mut file) = tokio::fs::File::open(path).await else {
        return offset;
    };
    let Ok(metadata) = file.metadata().await else {
        return offset;
    };
    let len = metadata.len();
    if len <= offset {
        return offset;
    }
    if file.seek(std::io::SeekFrom::Start(offset)).await.is_err() {
        return offset;
    }
    let mut buf = Vec::with_capacity((len - offset) as usize);
    if file.read_to_end(&mut buf).await.is_err() {
        return offset;
    }
    leftover.push_str(&String::from_utf8_lossy(&buf));
    while let Some(nl) = leftover.find('\n') {
        let line: String = leftover.drain(..=nl).collect();
        let trimmed = line.trim_end_matches(&['\r', '\n'][..]);
        if let Some(msg) = trimmed.strip_prefix("progress: ") {
            let _ = app.emit(event_name, msg.to_string());
        } else if let Some(msg) = trimmed.strip_prefix("error: ") {
            // Python errors go via the side-channel because Tokio can't
            // read python.exe's stderr on Windows. Surfaced to the dev
            // terminal so failed runs are diagnosable without devtools.
            eprintln!("[forgegen videoflow error] {}", msg);
        }
    }
    len
}

// ---------------------------------------------------------------------------
// Tauri commands (mirror src/api/videoflow.js)
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn list_patterns() -> Result<Value, String> {
    spawn_videoflow(&["patterns-list"]).await
}

#[tauri::command]
pub async fn analyze_media(path: String) -> Result<Value, String> {
    spawn_videoflow(&["analyze-beats", &path, "--beats"]).await
}

/// Run `videoflow auto-chapter` and return the full sidecar contents
/// it wrote to `<stem>.chapters.json`. Combines two calls (CLI + read)
/// so React only does one round-trip. Streams per-stage progress via
/// the `auto_chapter_progress` Tauri event so the UI can render live
/// status during multi-minute runs on long files.
///
/// Resilience: videoflow can exit with a non-zero code (commonly 120 on
/// Windows) during Python's atexit cleanup even after successfully
/// writing the sidecar — pipes between Python and Rust occasionally
/// trigger BrokenPipeError-equivalents during shutdown that surface as
/// the process exit code. The pragmatic check: if the sidecar file
/// actually exists on disk, the work completed and we treat the run
/// as success regardless of the exit code. Only when the sidecar is
/// missing do we propagate the bridge error.
#[tauri::command]
pub async fn auto_chapter(app: AppHandle, path: String) -> Result<Value, String> {
    let bridge_result =
        spawn_videoflow_streaming(&app, "auto_chapter_progress", &["auto-chapter", &path]).await;

    let sidecar = sidecar_path_for(&path)?;
    if let Ok(Some(data)) = read_sidecar_at(&sidecar).await {
        return Ok(data);
    }

    // No sidecar on disk → the run actually failed. Surface the bridge
    // error if we have one, otherwise a generic missing-file message.
    bridge_result?;
    Err(format!(
        "auto-chapter completed but expected sidecar not found: {}",
        sidecar.display()
    ))
}

/// Read `<stem>.chapters.json` next to `path` if it exists.
/// Returns null if the sidecar doesn't exist (so the caller can
/// decide whether to run auto_chapter to create one).
#[tauri::command]
pub async fn read_sidecar(path: String) -> Result<Option<Value>, String> {
    let sidecar = sidecar_path_for(&path)?;
    read_sidecar_at(&sidecar).await
}

// ---------------------------------------------------------------------------
// generate_funscript
// ---------------------------------------------------------------------------

/// Per-track funscript generation options. v0.1 uses a single recipe across
/// the whole track (the per-chapter authoring form sends row 1's values for
/// now). Per-chapter recipe support requires a videoflow CLI extension —
/// tracked in `forgegen/REFACTOR_TO_TAURI_REACT.md` v0.2 milestone.
#[derive(serde::Deserialize)]
pub struct GenerateOptions {
    /// `--source`: "full" or "percussive"
    pub source: String,
    /// `--stroke-density`: "half" | "full" | "1" | "2" | "4" | "8"
    pub density: String,
    /// `--tone`: "flat" | "rise" | "fall" | "auto"
    pub tone: String,
    /// UI-only for v0.1 (videoflow doesn't yet boost downbeats from this flag).
    /// Kept on the wire so the CLI extension lands non-breaking later.
    #[serde(default)]
    pub emphasize_beats: bool,
}

/// Run `videoflow generate-funscript <input> <output> --source ... --tone ... --stroke-density ...`
/// and return the parsed JSON result. Output path defaults to `<stem>.funscript`
/// next to the media file. Per-stage progress streams via the
/// `generate_funscript_progress` Tauri event so the React UI can render
/// the same Stepper used for auto-chapter.
#[tauri::command]
pub async fn generate_funscript(
    app: AppHandle,
    path: String,
    options: GenerateOptions,
) -> Result<Value, String> {
    let p = Path::new(&path);
    let stem = p
        .file_stem()
        .ok_or_else(|| format!("invalid media path (no stem): {}", path))?
        .to_string_lossy()
        .to_string();
    let parent = p
        .parent()
        .ok_or_else(|| format!("invalid media path (no parent): {}", path))?;
    let out_path = parent.join(format!("{}.funscript", stem));
    let out_str = out_path.to_string_lossy().to_string();

    let _ = options.emphasize_beats; // accepted for forward-compat; CLI flag pending

    let bridge_result = spawn_videoflow_streaming(
        &app,
        "generate_funscript_progress",
        &[
            "generate-funscript",
            &path,
            &out_str,
            "--source",
            &options.source,
            "--stroke-density",
            &options.density,
            "--tone",
            &options.tone,
        ],
    )
    .await;

    // Resilience for Python atexit-cleanup exit codes (see auto_chapter
    // doc): if the funscript was actually written, treat as success even
    // when the bridge reports a non-zero exit. Only error when the file
    // is missing.
    if out_path.exists() {
        if let Ok(value) = bridge_result {
            return Ok(value);
        }
        // Synthesize a minimal result so React has something to render.
        return Ok(serde_json::json!({
            "output": out_str,
            "synthesized": true,
        }));
    }
    bridge_result
}
