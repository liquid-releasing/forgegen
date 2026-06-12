use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct DirEntry {
    name: String,
    #[serde(rename = "isDirectory")]
    is_directory: bool,
    #[serde(rename = "isFile")]
    is_file: bool,
}

#[derive(Serialize)]
pub struct FileStat {
    size: u64,
    #[serde(rename = "mtimeMs")]
    mtime_ms: u64,
}

#[tauri::command]
pub async fn library_fs_readdir(path: String) -> Result<Vec<DirEntry>, String> {
    let mut rd = tokio::fs::read_dir(&path)
        .await
        .map_err(|e| format!("readdir {}: {}", path, e))?;
    let mut entries = Vec::new();
    while let Some(entry) = rd
        .next_entry()
        .await
        .map_err(|e| format!("readdir next {}: {}", path, e))?
    {
        let file_type = entry
            .file_type()
            .await
            .map_err(|e| format!("file_type: {}", e))?;
        entries.push(DirEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            is_directory: file_type.is_dir(),
            is_file: file_type.is_file(),
        });
    }
    Ok(entries)
}

#[tauri::command]
pub async fn library_fs_stat(path: String) -> Result<FileStat, String> {
    let meta = tokio::fs::metadata(&path)
        .await
        .map_err(|e| format!("stat {}: {}", path, e))?;
    let mtime_ms = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    Ok(FileStat {
        size: meta.len(),
        mtime_ms,
    })
}

#[tauri::command]
pub async fn library_fs_exists(path: String) -> bool {
    tokio::fs::try_exists(&path).await.unwrap_or(false)
}

#[tauri::command]
pub async fn library_fs_read_json(path: String) -> Result<serde_json::Value, String> {
    let text = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("read_text {}: {}", path, e))?;
    serde_json::from_str(&text).map_err(|e| format!("parse_json {}: {}", path, e))
}

#[tauri::command]
pub async fn library_fs_read_text(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("read_text {}: {}", path, e))
}

#[tauri::command]
pub async fn library_fs_write_text(path: String, text: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("mkdir_p {}: {}", parent.display(), e))?;
    }
    tokio::fs::write(&path, text)
        .await
        .map_err(|e| format!("write_text {}: {}", path, e))
}

#[tauri::command]
pub fn library_config_path(app: AppHandle) -> Result<String, String> {
    let dir: PathBuf = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("app_config_dir: {}", e))?;
    Ok(dir.join("library.json").to_string_lossy().to_string())
}

#[tauri::command]
pub fn library_reveal_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| format!("explorer: {}", e))?;
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| format!("open -R: {}", e))?;
        return Ok(());
    }
    #[cfg(target_os = "linux")]
    {
        let parent = std::path::Path::new(&path)
            .parent()
            .ok_or_else(|| "no parent dir".to_string())?;
        std::process::Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| format!("xdg-open: {}", e))?;
        Ok(())
    }
}

#[tauri::command]
pub async fn library_pick_folder(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |maybe_path| {
        let s = maybe_path.and_then(|fp| fp.as_path().map(|p| p.to_string_lossy().to_string()));
        let _ = tx.send(s);
    });
    rx.await.map_err(|_| "folder picker cancelled internally".to_string())
}
