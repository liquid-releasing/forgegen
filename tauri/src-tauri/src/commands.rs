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

fn forge_dir(media_path: &Path) -> Result<PathBuf, String> {
    let p = Path::new(media_path);
    let stem = p
        .file_stem()
        .ok_or_else(|| format!("invalid media path (no stem): {}", media_path.display()))?
        .to_string_lossy();
    let parent = p
        .parent()
        .ok_or_else(|| format!("invalid media path (no parent): {}", media_path.display()))?;
    Ok(parent.join(format!(".{}.forge", stem)))
}

fn sidecar_path_for(media_path: &str) -> Result<PathBuf, String> {
    let p = Path::new(media_path);
    let stem = p
        .file_stem()
        .ok_or_else(|| format!("invalid media path (no stem): {}", media_path))?
        .to_string_lossy();
    Ok(forge_dir(p)?.join(format!("{}.chapters.json", stem)))
}

fn legacy_sidecar_path_for(media_path: &str) -> Result<PathBuf, String> {
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

async fn read_sidecar_for_media(media_path: &str) -> Result<Option<Value>, String> {
    let canonical = sidecar_path_for(media_path)?;
    if let Some(data) = read_sidecar_at(&canonical).await? {
        return Ok(Some(data));
    }
    let legacy = legacy_sidecar_path_for(media_path)?;
    read_sidecar_at(&legacy).await
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
    // kill the whole process tree (see kill_process_tree below — `cmd /C
    // python.exe` means the direct child is cmd.exe, not python, and
    // TerminateProcess on cmd doesn't cascade to its python child),
    // drain the downstream tasks the natural-exit path uses, and surface
    // a sentinel error string the React side recognises as a user cancel
    // (handlePick checks for "cancelled" and falls back to IDLE silently).
    let cancelled;
    let status = tokio::select! {
        s = child.wait() => {
            cancelled = false;
            s.map_err(|e| format!("wait videoflow failed: {}", e))?
        }
        _ = &mut cancel_rx => {
            cancelled = true;
            let pid = child.id();
            kill_process_tree(pid, &mut child).await;
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

/// Force-kill a process tree given the root child handle.
///
/// On Windows we shell out to `taskkill /F /T /PID <pid>` because our spawn
/// pattern is `cmd /C python.exe -u -m videoflow…`: the direct child is
/// cmd.exe, and `TerminateProcess(cmd)` does NOT cascade to the python
/// grandchild. Without this the python process keeps running orphaned,
/// holds the stderr pipe open, and the bridge's stderr-drain task hangs
/// forever waiting for EOF — the user-visible symptom is "Cancelling…"
/// never resolving during long beats analysis.
///
/// On unix `child.kill()` is sufficient; we don't have the cmd shim there.
/// In both cases we follow up with `child.wait()` so we don't leak a
/// zombie entry, and `taskkill` failures are swallowed because the
/// fallback (`child.kill()`) is already best-effort.
async fn kill_process_tree(pid: Option<u32>, child: &mut tokio::process::Child) {
    #[cfg(target_os = "windows")]
    {
        if let Some(pid) = pid {
            let _ = tokio::process::Command::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .await;
        }
        let _ = child.kill().await;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = pid; // unused on unix
        let _ = child.kill().await;
    }
    child.wait().await.ok();
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

    if let Ok(Some(data)) = read_sidecar_for_media(&path).await {
        return Ok(data);
    }

    // No sidecar on disk → the run actually failed. Surface the bridge
    // error if we have one, otherwise a generic missing-file message.
    bridge_result?;
    let sidecar = sidecar_path_for(&path)?;
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
    read_sidecar_for_media(&path).await
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
    /// Per-chapter final motion source. "audio" keeps videoflow output for
    /// that chapter; "video" / "imported" splice candidate actions into the
    /// final funscript after the audio candidate has been generated.
    #[serde(default, alias = "sourceSelections")]
    pub source_selections: Option<Vec<String>>,
    /// Optional candidate tracks supplied by the UI. v3 milestone uses a
    /// mocked video candidate; real CV later feeds the same shape.
    #[serde(default, alias = "candidateTracks")]
    pub candidate_tracks: Option<CandidateTracks>,
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

#[derive(serde::Deserialize, Clone, Default)]
pub struct CandidateTracks {
    #[serde(default)]
    pub video: Option<Vec<FunscriptAction>>,
    #[serde(default)]
    pub imported: Option<Vec<FunscriptAction>>,
}

#[derive(serde::Deserialize, serde::Serialize, Clone)]
pub struct FunscriptAction {
    pub at: u64,
    pub pos: i64,
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

fn action_from_value(v: &Value) -> Option<FunscriptAction> {
    Some(FunscriptAction {
        at: v.get("at")?.as_u64()?,
        pos: v.get("pos")?.as_i64()?,
    })
}

fn actions_to_value(actions: &[FunscriptAction]) -> Value {
    Value::Array(
        actions
            .iter()
            .map(|a| serde_json::json!({ "at": a.at, "pos": a.pos }))
            .collect(),
    )
}

fn slice_actions(actions: &[FunscriptAction], start: u64, end: u64) -> Vec<FunscriptAction> {
    actions
        .iter()
        .filter(|a| a.at >= start && a.at < end)
        .cloned()
        .collect()
}

fn blend_seams(actions: &mut [FunscriptAction], seams: &[Value], window_ms: u64) {
    if actions.len() < 2 || seams.is_empty() {
        return;
    }
    for seam in seams {
        let Some(at) = seam.get("at_ms").and_then(|v| v.as_u64()) else {
            continue;
        };
        let idxs: Vec<usize> = actions
            .iter()
            .enumerate()
            .filter(|(_, a)| a.at.abs_diff(at) <= window_ms)
            .map(|(idx, _)| idx)
            .collect();
        if idxs.len() < 2 {
            continue;
        }
        let first = idxs[0];
        let last = *idxs.last().unwrap_or(&first);
        let a0 = actions[first].at;
        let a1 = actions[last].at;
        let p0 = actions[first].pos as f64;
        let p1 = actions[last].pos as f64;
        for idx in idxs {
            let t = if a1 == a0 {
                0.0
            } else {
                (actions[idx].at.saturating_sub(a0)) as f64 / (a1 - a0) as f64
            };
            let line = p0 + (p1 - p0) * t;
            actions[idx].pos = ((actions[idx].pos as f64 * 0.45) + (line * 0.55)).round() as i64;
        }
    }
}

fn apply_source_stitch(
    final_path: &Path,
    options: &GenerateOptions,
) -> Result<Option<(usize, usize)>, String> {
    let Some(selections) = options.source_selections.as_ref() else {
        return Ok(None);
    };
    if selections.is_empty() {
        return Ok(None);
    }
    let all_audio = selections.iter().all(|s| s == "audio");
    let Some(chapters) = options.chapters.as_ref() else {
        return Ok(None);
    };
    if chapters.len() != selections.len() {
        return Err(format!(
            "source selection length mismatch: {} chapters vs {} selections",
            chapters.len(),
            selections.len()
        ));
    }

    let text = std::fs::read_to_string(final_path)
        .map_err(|e| format!("read generated funscript {}: {}", final_path.display(), e))?;
    let mut doc: Value = serde_json::from_str(&text)
        .map_err(|e| format!("parse generated funscript {}: {}", final_path.display(), e))?;
    let audio_actions: Vec<FunscriptAction> = doc
        .get("actions")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(action_from_value).collect())
        .unwrap_or_default();
    if audio_actions.is_empty() {
        return Err("generated audio candidate has no actions to stitch".to_string());
    }

    if all_audio {
        if let Some(obj) = doc.as_object_mut() {
            let metadata = obj
                .entry("metadata".to_string())
                .or_insert_with(|| serde_json::json!({}));
            if let Some(meta_obj) = metadata.as_object_mut() {
                let generated_from = meta_obj
                    .entry("generated_from".to_string())
                    .or_insert_with(|| serde_json::json!({}));
                if let Some(gen_obj) = generated_from.as_object_mut() {
                    gen_obj.insert(
                        "source_selections".to_string(),
                        serde_json::to_value(selections).unwrap_or_else(|_| Value::Array(vec![])),
                    );
                    gen_obj.insert("seams".to_string(), Value::Array(vec![]));
                    gen_obj.insert(
                        "candidate_provenance".to_string(),
                        serde_json::json!({ "audio": "audio-synth" }),
                    );
                }
            }
        }
        let patched = serde_json::to_string_pretty(&doc)
            .map_err(|e| format!("serialize source provenance: {}", e))?;
        std::fs::write(final_path, patched)
            .map_err(|e| format!("write source provenance {}: {}", final_path.display(), e))?;
        return Ok(Some((audio_actions.len(), 0)));
    }

    let tracks = options.candidate_tracks.clone().unwrap_or_default();
    let mut stitched: Vec<FunscriptAction> = Vec::new();
    let mut seams: Vec<Value> = Vec::new();
    let duration_end = audio_actions.last().map(|a| a.at + 1).unwrap_or(0);
    for (idx, chapter) in chapters.iter().enumerate() {
        let start = chapter.at_ms;
        let end = chapter.end_ms.unwrap_or(duration_end);
        let src = selections.get(idx).map(|s| s.as_str()).unwrap_or("audio");
        let picked = match src {
            "video" => tracks.video.as_ref().unwrap_or(&audio_actions),
            "imported" => tracks.imported.as_ref().unwrap_or(&audio_actions),
            _ => &audio_actions,
        };
        stitched.extend(slice_actions(picked, start, end));
        if idx > 0 {
            let prev = selections.get(idx - 1).map(|s| s.as_str()).unwrap_or("audio");
            if prev != src {
                seams.push(serde_json::json!({
                    "at_ms": start,
                    "from": prev,
                    "to": src,
                }));
            }
        }
    }
    stitched.sort_by_key(|a| a.at);
    stitched.dedup_by_key(|a| a.at);
    if stitched.is_empty() {
        return Err("source stitching produced no actions".to_string());
    }
    blend_seams(&mut stitched, &seams, 500);

    if let Some(obj) = doc.as_object_mut() {
        obj.insert("actions".to_string(), actions_to_value(&stitched));
        let metadata = obj
            .entry("metadata".to_string())
            .or_insert_with(|| serde_json::json!({}));
        if let Some(meta_obj) = metadata.as_object_mut() {
            let generated_from = meta_obj
                .entry("generated_from".to_string())
                .or_insert_with(|| serde_json::json!({}));
            if let Some(gen_obj) = generated_from.as_object_mut() {
                gen_obj.insert(
                    "source_selections".to_string(),
                    serde_json::to_value(selections).unwrap_or_else(|_| Value::Array(vec![])),
                );
                gen_obj.insert("seams".to_string(), Value::Array(seams.clone()));
                gen_obj.insert(
                    "candidate_provenance".to_string(),
                    serde_json::json!({
                        "audio": "audio-synth",
                        "video": if tracks.video.is_some() { "video-mock" } else { "unavailable" },
                        "imported": if tracks.imported.is_some() { "imported" } else { "unavailable" },
                    }),
                );
            }
        }
    }

    let patched = serde_json::to_string_pretty(&doc)
        .map_err(|e| format!("serialize stitched funscript: {}", e))?;
    std::fs::write(final_path, patched)
        .map_err(|e| format!("write stitched funscript {}: {}", final_path.display(), e))?;
    Ok(Some((stitched.len(), seams.len())))
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
    let final_path = parent.join(format!("{}.funscript", stem));
    let final_str = final_path.to_string_lossy().to_string();

    // Write videoflow's output to a temp path next to the final destination
    // and atomic-rename on success. The canonical `<stem>.funscript` stays
    // untouched until the new run produces a valid file. This protects the
    // Output tab from a vanishing file during long Generate runs and means
    // a failed or cancelled run never destroys the prior result. Backup of
    // the prior canonical (if any) happens AFTER the new file is ready,
    // not before — see the publish step below.
    let temp_path = parent.join(format!(
        "{}.funscript.tmp.{}.{}",
        stem,
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0)
    ));
    let temp_str = temp_path.to_string_lossy().to_string();

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
    // NOTE: videoflow gets the TEMP path, not the canonical. We swap them
    // after success so the canonical never disappears mid-run.
    let mut args: Vec<&str> = vec!["generate-funscript", &path, &temp_str];
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

    // User cancel beats resilience — clean up the temp file so a cancelled
    // run leaves no detritus, and propagate the sentinel error.
    if matches!(&bridge_result, Err(e) if e == "cancelled") {
        let _ = tokio::fs::remove_file(&temp_path).await;
        return Err("cancelled".to_string());
    }

    // Did videoflow actually produce something at the temp path? (Resilience
    // for Python atexit-cleanup exit codes — see auto_chapter doc: if the
    // file was written, treat as success even when the bridge reports
    // non-zero exit.) If yes, back up any prior canonical and publish.
    if temp_path.exists() {
        if final_path.exists() {
            let ts = chrono::Local::now().format("%Y-%m-%dT%H-%M-%S");
            let backup = parent.join(format!("{}.funscript.{}.bak", stem, ts));
            if let Err(e) = tokio::fs::rename(&final_path, &backup).await {
                // Couldn't back up — bail rather than overwrite. Leave the
                // temp file in place so the user has it as a recovery option.
                return Err(format!(
                    "failed to back up existing funscript {} → {}: {} (new run is at {})",
                    final_path.display(),
                    backup.display(),
                    e,
                    temp_path.display()
                ));
            }
        }
        if let Err(e) = tokio::fs::rename(&temp_path, &final_path).await {
            return Err(format!(
                "failed to publish funscript {} → {}: {}",
                temp_path.display(),
                final_path.display(),
                e
            ));
        }

        // Patch the JSON's `output` so React sees the canonical path, not
        // the temp one videoflow wrote. (videoflow returns whatever path
        // it was given; we swapped that path before launching.)
        let mut value = match bridge_result {
            Ok(v) => v,
            Err(_) => serde_json::json!({ "synthesized": true }),
        };
        if let Some(obj) = value.as_object_mut() {
            obj.insert(
                "output".to_string(),
                serde_json::Value::String(final_str),
            );
        }
        if let Some((stitched_actions, seam_count)) = apply_source_stitch(&final_path, &options)? {
            if let Some(obj) = value.as_object_mut() {
                obj.insert(
                    "actions".to_string(),
                    serde_json::Value::Number(serde_json::Number::from(stitched_actions as u64)),
                );
                obj.insert(
                    "source_aware".to_string(),
                    serde_json::Value::Bool(true),
                );
                obj.insert(
                    "seams".to_string(),
                    serde_json::Value::Number(serde_json::Number::from(seam_count as u64)),
                );
            }
        }
        return Ok(value);
    }

    // videoflow didn't write the temp file — clean up (no-op if it's truly
    // not there) and surface the bridge error. The canonical funscript (if
    // any) is untouched.
    let _ = tokio::fs::remove_file(&temp_path).await;
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

// ---------------------------------------------------------------------------
// Output tab — funscript inspector
// ---------------------------------------------------------------------------

/// Read a funscript JSON file from disk. The Output tab uses this to render
/// the actions array (for the density-over-time chart) and the
/// `metadata.generated_from` block (chapters + recipes + source partial-MD5).
#[tauri::command]
pub async fn read_funscript(path: String) -> Result<Value, String> {
    let p = Path::new(&path);
    let contents = tokio::fs::read_to_string(p)
        .await
        .map_err(|e| format!("read funscript {}: {}", p.display(), e))?;
    serde_json::from_str(&contents)
        .map_err(|e| format!("parse funscript {}: {}", p.display(), e))
}

/// Open the host OS file manager with `path` selected.
///
/// Windows uses `explorer.exe /select,"<path>"` — but Rust's `Command::arg`
/// applies its own quoting rules that explorer.exe's quirky argv parser
/// doesn't accept, so the standard call silently falls back to opening
/// `C:\Users\<user>\Documents` whenever the path has spaces, parens, or
/// other Windows-special characters. We bypass Rust's quoting with
/// `raw_arg` (Windows-only) and pass the exact command-line explorer
/// expects: `/select,"<path>"` as one literal token.
///
/// macOS uses `open -R`. Linux falls back to `xdg-open` on the parent
/// directory (no portable per-file selection).
#[tauri::command]
pub async fn reveal_in_explorer(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("not found: {}", path));
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        // raw_arg passes the string through verbatim — explorer.exe sees
        // `/select,"C:\full\path with (special) chars.funscript"` and
        // navigates to the right folder with the file highlighted.
        let raw = format!("/select,\"{}\"", p.display());
        std::process::Command::new("explorer.exe")
            .raw_arg(&raw)
            .spawn()
            .map_err(|e| format!("explorer spawn: {}", e))?;
        // explorer.exe returns non-zero even on success — fire-and-forget.
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| format!("open spawn: {}", e))?;
        return Ok(());
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let parent = p.parent().unwrap_or(p);
        std::process::Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| format!("xdg-open spawn: {}", e))?;
        return Ok(());
    }
    #[allow(unreachable_code)]
    Err("reveal_in_explorer: unsupported platform".into())
}

/// List the current canonical funscript and all `<stem>.funscript.<ts>.bak`
/// versions next to a media file. Returned newest-first by mtime so the UI
/// can render a version-switcher dropdown in the Output tab; the user can
/// inspect the previous funscript even after a Regenerate without losing it
/// to overwrite. Returns an empty list if neither the canonical nor any
/// backups exist (rather than erroring).
#[tauri::command]
pub async fn list_funscript_versions(path: String) -> Result<Vec<FunscriptVersion>, String> {
    let p = Path::new(&path);
    let stem = p
        .file_stem()
        .ok_or_else(|| format!("invalid funscript path (no stem): {}", path))?
        .to_string_lossy()
        .to_string();
    let parent = p
        .parent()
        .ok_or_else(|| format!("invalid funscript path (no parent): {}", path))?;
    // The canonical itself ends in `.funscript`; the backups end in
    // `.funscript.<ts>.bak`. Strip a trailing `.funscript` from the stem if
    // the caller passed a backup path, so both forms produce the same set.
    let canonical_stem = stem.strip_suffix(".funscript").unwrap_or(&stem).to_string();
    let canonical = parent.join(format!("{}.funscript", canonical_stem));
    let bak_prefix = format!("{}.funscript.", canonical_stem);

    let mut entries = tokio::fs::read_dir(parent)
        .await
        .map_err(|e| format!("read_dir {}: {}", parent.display(), e))?;

    let mut out: Vec<FunscriptVersion> = Vec::new();
    while let Ok(Some(entry)) = entries.next_entry().await {
        let name = entry.file_name().to_string_lossy().to_string();
        let entry_path = entry.path();
        let is_canonical = entry_path == canonical;
        let is_backup = name.starts_with(&bak_prefix) && name.ends_with(".bak");
        if !is_canonical && !is_backup {
            continue;
        }
        let meta = match entry.metadata().await {
            Ok(m) => m,
            Err(_) => continue,
        };
        let mtime_secs = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);
        out.push(FunscriptVersion {
            path: entry_path.to_string_lossy().to_string(),
            is_current: is_canonical,
            mtime_secs,
            label: if is_canonical {
                "current".to_string()
            } else {
                // Pull the timestamp segment between `.funscript.` and `.bak`
                // for a clean dropdown label. Falls back to the filename if
                // the suffix isn't where we expect.
                name.strip_prefix(&bak_prefix)
                    .and_then(|s| s.strip_suffix(".bak"))
                    .map(|s| s.to_string())
                    .unwrap_or(name)
            },
        });
    }
    out.sort_by(|a, b| b.mtime_secs.cmp(&a.mtime_secs));
    Ok(out)
}

#[derive(serde::Serialize)]
pub struct FunscriptVersion {
    pub path: String,
    pub is_current: bool,
    pub mtime_secs: u64,
    pub label: String,
}

/// Copy a funscript file from `src` to `dst`. The Output tab's Save-as
/// workflow calls this after the user picks the destination via the dialog
/// plugin. Overwrites `dst` if it exists — the picker has already prompted
/// the user about that.
///
/// Guards against the "user clicked Save without changing the filename"
/// case: copying a file onto itself on Windows fails with a file-locked
/// error from `tokio::fs::copy` (os error 32, "being used by another
/// process") and isn't a meaningful operation anyway. We compare canonical
/// paths so casing/separator differences don't fool the check.
#[tauri::command]
pub async fn save_funscript_copy(src: String, dst: String) -> Result<(), String> {
    let s = Path::new(&src);
    let d = Path::new(&dst);
    if !s.exists() {
        return Err(format!("source not found: {}", src));
    }
    if paths_point_to_same_file(s, d) {
        return Err(
            "Source and destination are the same file. Save-as creates a \
             copy at a different location — pick a different filename or folder."
                .into(),
        );
    }
    tokio::fs::copy(s, d)
        .await
        .map_err(|e| format!("copy {} -> {}: {}", s.display(), d.display(), e))?;
    Ok(())
}

/// Best-effort same-file check. Uses `canonicalize` when both sides exist
/// (handles symlinks, different separators, casing on case-insensitive FS).
/// Falls back to a normalised string comparison if either side hasn't been
/// created yet (the destination usually hasn't).
fn paths_point_to_same_file(a: &Path, b: &Path) -> bool {
    if let (Ok(ca), Ok(cb)) = (a.canonicalize(), b.canonicalize()) {
        return ca == cb;
    }
    // The destination won't exist yet on a brand-new save-as. Compare the
    // parent's canonical path + filename instead. Falls through to a raw
    // string compare if even the parents are inscrutable.
    if let (Some(pa), Some(pb), Some(na), Some(nb)) =
        (a.parent(), b.parent(), a.file_name(), b.file_name())
    {
        if let (Ok(cpa), Ok(cpb)) = (pa.canonicalize(), pb.canonicalize()) {
            return cpa == cpb && na == nb;
        }
    }
    a == b
}
