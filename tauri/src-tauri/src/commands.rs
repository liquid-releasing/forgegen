// videoflow CLI bridge — spawn-per-call (v0 per ../../BRIDGE_DESIGN.md).
//
// Each Tauri command shells out to `videoflow <subcommand>`, captures
// JSON from stdout, returns it to React. v1 will switch to a persistent
// process with JSON-RPC over stdio when forgegen Generate's live preview
// demands sub-100ms latency.

use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::oneshot;

// ---------------------------------------------------------------------------
// Cancel registry — lets the UI abort an in-flight videoflow run
// ---------------------------------------------------------------------------
//
// Keyed by the same event_name the spawn function uses for streaming progress
// (`auto_chapter_progress`, `generate_funscript_progress`). When the frontend
// calls `cancel_run(event_name)`, we look up the oneshot sender, fire it,
// and the spawn task aborts: it kills the child process and returns an error
// the UI recognises as a user cancel rather than a real failure.
//
// Single-run-per-event semantics: spawning a new run with the same event
// replaces (and effectively cancels) any prior sender for that event.

pub struct CancelRegistry(pub Mutex<HashMap<String, oneshot::Sender<()>>>);

impl CancelRegistry {
    pub fn new() -> Self {
        Self(Mutex::new(HashMap::new()))
    }
}

#[tauri::command]
pub fn cancel_run(state: State<'_, CancelRegistry>, event_name: String) -> Result<(), String> {
    let sender = state
        .0
        .lock()
        .map_err(|e| format!("cancel_run lock: {}", e))?
        .remove(&event_name);
    if let Some(tx) = sender {
        let _ = tx.send(());
    }
    Ok(())
}

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

    // Register a cancel channel under the streaming event name. The UI's
    // cancel_run command fires the sender; we select between it and
    // child.wait() below, killing the child if cancel wins.
    let (cancel_tx, mut cancel_rx) = oneshot::channel::<()>();
    if let Some(state) = app.try_state::<CancelRegistry>() {
        if let Ok(mut map) = state.0.lock() {
            map.insert(event_name.to_string(), cancel_tx);
        }
    }

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

    // Race: child finishes naturally vs. user clicks Cancel. On cancel we
    // kill the child (SIGKILL on unix, TerminateProcess on Windows), drain
    // the same downstream tasks the natural-exit path uses, and surface a
    // sentinel error string the React side recognises as a user cancel
    // (handlePick checks for "cancelled" and falls back to IDLE silently).
    let cancelled;
    let status = tokio::select! {
        s = child.wait() => {
            cancelled = false;
            s.map_err(|e| format!("wait videoflow failed: {}", e))?
        }
        _ = &mut cancel_rx => {
            cancelled = true;
            let _ = child.kill().await;
            // Reap so we don't leak a zombie. Any wait error here is moot —
            // we already know the run is dead.
            child.wait().await.ok();
            std::process::ExitStatus::default()
        }
    };

    // Always drop the registry entry on exit so a stale sender can't fire on
    // a future run that reuses the same event_name.
    if let Some(state) = app.try_state::<CancelRegistry>() {
        if let Ok(mut map) = state.0.lock() {
            map.remove(event_name);
        }
    }

    let _ = shutdown_tx.send(());
    let _ = poll_task.await;

    let stderr_other = stderr_task.await.unwrap_or_default();
    let stdout_bytes = stdout_task.await.unwrap_or_default();

    let _ = tokio::fs::remove_file(&progress_file).await;

    if cancelled {
        return Err("cancelled".to_string());
    }

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

    // User cancel beats the resilience check: an existing sidecar from a
    // previous run is not the right answer here, and we don't want a partial
    // sidecar from this run leaking through either.
    if matches!(&bridge_result, Err(e) if e == "cancelled") {
        return Err("cancelled".to_string());
    }

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

/// Per-track funscript generation options.
///
/// Single-recipe path (default): `source` / `density` / `tone` /
/// `emphasize_beats` apply to the whole track and the bridge passes them
/// as videoflow CLI flags. Used when `chapters` + `recipes` are absent.
///
/// Per-chapter path: when `chapters` and `recipes` are both present (and
/// the same length), the bridge writes a recipe-bundle JSON to a temp file
/// and passes `--recipe-bundle <path>` instead. videoflow loops chapters
/// with each row's stroke-density + tone (source stays global per run).
/// The funscript metadata embeds a `generated_from` block with full
/// provenance — chapters used, recipes applied, source partial-MD5 — so
/// downstream tools can detect drift if the source video is later edited.
#[derive(serde::Deserialize)]
pub struct GenerateOptions {
    /// `--source`: "full" or "percussive"
    pub source: String,
    /// `--stroke-density`: "half" | "full" | "1" | "2" | "4" | "8"
    pub density: String,
    /// `--tone`: "flat" | "rise" | "fall" | "auto"
    pub tone: String,
    /// UI-only for the single-recipe path; the per-chapter path emits this
    /// per row in the bundle JSON.
    #[serde(default)]
    pub emphasize_beats: bool,
    /// Optional per-chapter authoring grid. Every entry corresponds 1:1
    /// with `chapters[i]`; videoflow rejects a count mismatch.
    #[serde(default)]
    pub recipes: Option<Vec<RecipeRow>>,
    /// Chapter time-windows for the per-chapter path. From the sidecar's
    /// `chapters[i].at_ms` / `end_ms` (or `null` for the trailing chapter).
    #[serde(default)]
    pub chapters: Option<Vec<ChapterBound>>,
}

#[derive(serde::Deserialize, serde::Serialize, Clone)]
pub struct RecipeRow {
    pub source: String,
    pub stroke_density: String,
    pub tone: String,
    #[serde(default)]
    pub emphasize_beats: bool,
}

#[derive(serde::Deserialize, serde::Serialize, Clone)]
pub struct ChapterBound {
    pub at_ms: u64,
    /// `None` means "to end of track" — videoflow substitutes the
    /// beat-map's duration_ms.
    #[serde(default)]
    pub end_ms: Option<u64>,
}

/// Compute the partial-MD5 of `path` — first 64KB + middle 64KB + last 64KB,
/// hashed together with their offsets. Cheap on multi-GB media, stable across
/// re-encodes-of-the-same-bytes, and good enough for the drift-detection use
/// in the funscript's `generated_from.source` block. Returns hex.
fn partial_md5(path: &Path) -> Result<String, String> {
    use md5::{Digest, Md5};
    use std::io::{Read, Seek, SeekFrom};
    const CHUNK: usize = 64 * 1024;
    let mut file = std::fs::File::open(path)
        .map_err(|e| format!("partial_md5 open {}: {}", path.display(), e))?;
    let len = file
        .metadata()
        .map_err(|e| format!("partial_md5 metadata: {}", e))?
        .len();
    let mut hasher = Md5::new();
    // Mix the file size in so two files with the same head/middle/tail but
    // different lengths don't collide.
    hasher.update(len.to_le_bytes());
    let mut buf = vec![0u8; CHUNK];
    let read_at = |file: &mut std::fs::File, off: u64, buf: &mut Vec<u8>| -> Result<usize, String> {
        file.seek(SeekFrom::Start(off))
            .map_err(|e| format!("partial_md5 seek: {}", e))?;
        let n = file
            .read(buf)
            .map_err(|e| format!("partial_md5 read: {}", e))?;
        Ok(n)
    };
    let n = read_at(&mut file, 0, &mut buf)?;
    hasher.update(&buf[..n]);
    if len > (CHUNK as u64) * 2 {
        let mid = len / 2 - (CHUNK as u64) / 2;
        let n = read_at(&mut file, mid, &mut buf)?;
        hasher.update(&buf[..n]);
    }
    if len > CHUNK as u64 {
        let tail = len.saturating_sub(CHUNK as u64);
        let n = read_at(&mut file, tail, &mut buf)?;
        hasher.update(&buf[..n]);
    }
    let digest = hasher.finalize();
    Ok(digest.iter().map(|b| format!("{:02x}", b)).collect())
}

/// Run `videoflow generate-funscript <input> <output>` with either single-
/// recipe args (`--source`, `--stroke-density`, `--tone`) or, when the
/// caller supplies `chapters` + `recipes`, with `--recipe-bundle <temp.json>`
/// for per-chapter synthesis. Output path defaults to `<stem>.funscript`
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

    // Don't silently overwrite a previous funscript — rename it with a
    // local-time timestamp so iterating on settings never destroys earlier
    // generations. The canonical <stem>.funscript stays the latest so player
    // auto-pairing keeps working.
    if out_path.exists() {
        let ts = chrono::Local::now().format("%Y-%m-%dT%H-%M-%S");
        let backup = parent.join(format!("{}.funscript.{}.bak", stem, ts));
        if let Err(e) = tokio::fs::rename(&out_path, &backup).await {
            return Err(format!(
                "failed to back up existing funscript {} → {}: {}",
                out_path.display(),
                backup.display(),
                e
            ));
        }
    }

    let _ = options.emphasize_beats; // accepted for forward-compat; bundle path emits per row

    // Per-chapter path: build the recipe-bundle JSON, write to a unique
    // temp file, pass via --recipe-bundle. Cleanup the file after the run
    // regardless of outcome (success, error, cancel). Single-recipe path
    // is the legacy fallback when chapters/recipes aren't supplied.
    let bundle_temp: Option<PathBuf> = if let (Some(chapters), Some(recipes)) =
        (options.chapters.as_ref(), options.recipes.as_ref())
    {
        if chapters.len() != recipes.len() {
            return Err(format!(
                "recipe-bundle length mismatch: {} chapters vs {} recipes",
                chapters.len(),
                recipes.len()
            ));
        }
        // Source provenance for the funscript metadata. partial_md5 lets
        // FunscriptForge / ForgePlayer detect drift if the source video
        // gets re-edited; size_bytes is a cheap second-line check.
        let (size_bytes, partial) = match std::fs::metadata(p) {
            Ok(m) => (Some(m.len()), partial_md5(p).ok()),
            Err(_) => (None, None),
        };
        let bundle = serde_json::json!({
            "version": 1,
            "chapters": chapters,
            "recipes": recipes,
            "source": {
                "path": &path,
                "size_bytes": size_bytes,
                "partial_md5": partial,
            },
        });
        let tmp = std::env::temp_dir().join(format!(
            "forgegen_bundle_{}_{}.json",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        tokio::fs::write(&tmp, serde_json::to_vec_pretty(&bundle).unwrap_or_default())
            .await
            .map_err(|e| format!("write recipe-bundle {}: {}", tmp.display(), e))?;
        Some(tmp)
    } else {
        None
    };

    let bundle_str_opt = bundle_temp.as_ref().map(|p| p.to_string_lossy().to_string());
    let mut args: Vec<&str> = vec!["generate-funscript", &path, &out_str];
    if let Some(ref bundle_path) = bundle_str_opt {
        args.extend_from_slice(&["--recipe-bundle", bundle_path]);
    } else {
        args.extend_from_slice(&[
            "--source", &options.source,
            "--stroke-density", &options.density,
            "--tone", &options.tone,
        ]);
    }

    let bridge_result = spawn_videoflow_streaming(
        &app,
        "generate_funscript_progress",
        &args,
    )
    .await;

    if let Some(tmp) = bundle_temp {
        let _ = tokio::fs::remove_file(&tmp).await;
    }

    // User cancel beats resilience — see auto_chapter doc.
    if matches!(&bridge_result, Err(e) if e == "cancelled") {
        return Err("cancelled".to_string());
    }

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

// ---------------------------------------------------------------------------
// Recents — most-recently-used file list
// ---------------------------------------------------------------------------
//
// Persists up to MAX_RECENTS file paths in <appDataDir>/recents.json so the
// Project tab can offer one-click reload of recent media. Path is the only
// natural identity (we don't store sidecar contents). `added_at` is unix
// seconds — JS converts via `new Date(added_at * 1000)`.

const MAX_RECENTS: usize = 8;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct RecentItem {
    pub path: String,
    pub added_at: u64,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct RecentsFile {
    version: u32,
    items: Vec<RecentItem>,
}

/// Same as RecentItem but augmented with a freshly-checked `exists` flag so
/// the UI can render missing files as greyed-out without doing its own
/// filesystem probe round-trip.
#[derive(serde::Serialize)]
pub struct RecentItemWithExists {
    pub path: String,
    pub added_at: u64,
    pub exists: bool,
}

fn recents_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {}", e))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("create_dir {}: {}", dir.display(), e))?;
    Ok(dir.join("recents.json"))
}

fn now_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

async fn load_recents(path: &Path) -> Vec<RecentItem> {
    if !path.exists() {
        return Vec::new();
    }
    let Ok(txt) = tokio::fs::read_to_string(path).await else {
        return Vec::new();
    };
    serde_json::from_str::<RecentsFile>(&txt)
        .map(|d| d.items)
        .unwrap_or_default()
}

async fn save_recents(path: &Path, items: Vec<RecentItem>) -> Result<(), String> {
    let data = RecentsFile { version: 1, items };
    let txt = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("serialize recents: {}", e))?;
    tokio::fs::write(path, txt)
        .await
        .map_err(|e| format!("write {}: {}", path.display(), e))
}

#[tauri::command]
pub async fn read_recents(app: AppHandle) -> Result<Vec<RecentItemWithExists>, String> {
    let path = recents_path(&app)?;
    let items = load_recents(&path).await;
    Ok(items
        .into_iter()
        .map(|i| RecentItemWithExists {
            exists: Path::new(&i.path).exists(),
            path: i.path,
            added_at: i.added_at,
        })
        .collect())
}

#[tauri::command]
pub async fn add_recent(app: AppHandle, path: String) -> Result<(), String> {
    let recents = recents_path(&app)?;
    let mut items = load_recents(&recents).await;
    // Dedup by path then prepend the new entry — keeps the newest at index 0
    // and bumps a re-opened file back to the top.
    items.retain(|i| i.path != path);
    items.insert(
        0,
        RecentItem {
            path,
            added_at: now_unix(),
        },
    );
    items.truncate(MAX_RECENTS);
    save_recents(&recents, items).await
}

#[tauri::command]
pub async fn remove_recent(app: AppHandle, path: String) -> Result<(), String> {
    let recents = recents_path(&app)?;
    let items = load_recents(&recents).await;
    let filtered: Vec<RecentItem> = items.into_iter().filter(|i| i.path != path).collect();
    save_recents(&recents, filtered).await
}
