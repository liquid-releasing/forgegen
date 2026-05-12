// Recent-files API — wraps the Rust commands that persist
// `<appDataDir>/recents.json` (max 8 entries, deduped by path, newest first).
//
// Browser mode (npm run dev without Tauri) falls back to sessionStorage so
// the rail still works for UI iteration. Persistence between page reloads
// only — closing the tab clears it, which mirrors the dev-loop intent.

import { isTauri } from './videoflow.js';

const SESSION_KEY = 'forgegen_recents_mock';
const MAX = 8;

function readSession() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeSession(items) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(items));
  } catch { /* quota exceeded — silently drop */ }
}

/** Returns array of `{ path, added_at, exists }` newest-first. `added_at` is
 * unix seconds; `exists` is a freshly-checked filesystem probe. */
export async function getRecents() {
  if (!isTauri()) {
    return readSession().map((i) => ({ ...i, exists: true }));
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('read_recents');
}

/** Prepend `path` to recents. Existing entries with the same path are removed
 * first so a re-opened file moves to position 0. List is truncated to MAX. */
export async function addRecent(path) {
  if (!isTauri()) {
    const items = readSession().filter((i) => i.path !== path);
    items.unshift({ path, added_at: Math.floor(Date.now() / 1000) });
    writeSession(items.slice(0, MAX));
    return;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('add_recent', { path });
}

/** Drop a single entry by path (e.g. when user clicks the X on a missing file). */
export async function removeRecent(path) {
  if (!isTauri()) {
    writeSession(readSession().filter((i) => i.path !== path));
    return;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('remove_recent', { path });
}
