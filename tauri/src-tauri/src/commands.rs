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

/// Locate the videoflow binary. Lookup order:
///   1. VIDEOFLOW_BIN env var (explicit override)
///   2. forgegen/.venv/{Scripts|bin}/videoflow{.exe} (dev default)
///   3. "videoflow" on PATH (last resort)
fn videoflow_bin() -> PathBuf {
    if let Ok(p) = std::env::var("VIDEOFLOW_BIN") {
        return PathBuf::from(p);
    }

    // CARGO_MANIFEST_DIR is .../forgegen/tauri/src-tauri at build time.
    // Walk up two levels to reach .../forgegen, then into .venv.
    if let Some(forgegen_root) = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
    {
        let venv_bin = if cfg!(windows) {
            forgegen_root.join(".venv/Scripts/videoflow.exe")
        } else {
            forgegen_root.join(".venv/bin/videoflow")
        };
        if venv_bin.exists() {
            return venv_bin;
        }
    }

    // Fall back to PATH lookup.
    PathBuf::from("videoflow")
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
    let bin = videoflow_bin();

    let output = Command::new(&bin)
        .args(args)
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

/// Spawn videoflow and stream stderr line-by-line. Lines prefixed with
/// `progress: ` are emitted as Tauri events on `event_name` so the React
/// UI can render per-stage status during long runs. Other stderr lines
/// are accumulated for the error path. After the process exits, stdout
/// is parsed as JSON the same way `spawn_videoflow` does.
async fn spawn_videoflow_streaming(
    app: &AppHandle,
    event_name: &str,
    args: &[&str],
) -> Result<Value, String> {
    let bin = videoflow_bin();

    let mut child = Command::new(&bin)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawn '{}' failed: {}", bin.display(), e))?;

    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "failed to capture videoflow stderr".to_string())?;

    let app_for_task = app.clone();
    let event_name_owned = event_name.to_string();
    let stderr_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
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

    let output = child
        .wait_with_output()
        .await
        .map_err(|e| format!("wait videoflow failed: {}", e))?;
    let other_stderr = stderr_task.await.unwrap_or_default();

    if !output.status.success() {
        return Err(format!(
            "videoflow exit {} — stderr: {}",
            output.status.code().unwrap_or(-1),
            other_stderr.trim()
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout).map_err(|e| {
        let preview: String = stdout.chars().take(200).collect();
        format!("JSON parse failed: {} — stdout preview: {}", e, preview)
    })
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
#[tauri::command]
pub async fn auto_chapter(app: AppHandle, path: String) -> Result<Value, String> {
    spawn_videoflow_streaming(&app, "auto_chapter_progress", &["auto-chapter", &path]).await?;

    // Read the sidecar that was just written
    let sidecar = sidecar_path_for(&path)?;
    read_sidecar_at(&sidecar).await?.ok_or_else(|| {
        format!(
            "auto-chapter completed but expected sidecar not found: {}",
            sidecar.display()
        )
    })
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
/// next to the media file.
#[tauri::command]
pub async fn generate_funscript(
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

    spawn_videoflow(&[
        "generate-funscript",
        &path,
        &out_str,
        "--source",
        &options.source,
        "--stroke-density",
        &options.density,
        "--tone",
        &options.tone,
    ])
    .await
}
