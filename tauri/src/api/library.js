import { invoke } from '@tauri-apps/api/core';
import {
  scanRoot as scanRootImpl,
  loadConfig as loadConfigImpl,
  saveConfig as saveConfigImpl,
  addRoot as addRootImpl,
  removeRoot as removeRootImpl,
  renameRoot as renameRootImpl,
} from 'forgemoment';

function isWindowsPath(p) {
  return /[a-zA-Z]:[\\/]/.test(p) || (p.includes('\\') && !p.startsWith('/'));
}

function sepFor(p) {
  return isWindowsPath(p) ? '\\' : '/';
}

function pathJoin(...parts) {
  const filtered = parts.filter((p) => p != null && p !== '');
  if (filtered.length === 0) return '';
  const sep = sepFor(filtered[0]);
  return filtered
    .map((p, i) => {
      let s = String(p);
      if (i > 0) s = s.replace(/^[\\/]+/, '');
      if (i < filtered.length - 1) s = s.replace(/[\\/]+$/, '');
      return s;
    })
    .join(sep);
}

function pathBasename(p) {
  const idx = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function pathExtname(p) {
  const base = pathBasename(p);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot).toLowerCase();
}

function pathStem(p) {
  const base = pathBasename(p);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? base : base.slice(0, dot);
}

export const tauriFs = {
  async readdir(path) {
    return invoke('library_fs_readdir', { path });
  },
  async stat(path) {
    return invoke('library_fs_stat', { path });
  },
  async exists(path) {
    return invoke('library_fs_exists', { path });
  },
  async readJson(path) {
    return invoke('library_fs_read_json', { path });
  },
  async readText(path) {
    return invoke('library_fs_read_text', { path });
  },
  async writeText(path, text) {
    return invoke('library_fs_write_text', { path, text });
  },
  join: pathJoin,
  basename: pathBasename,
  extname: pathExtname,
  stem: pathStem,
};

let cachedConfigPath = null;

export async function getConfigPath() {
  if (cachedConfigPath) return cachedConfigPath;
  cachedConfigPath = await invoke('library_config_path');
  return cachedConfigPath;
}

export async function loadConfig() {
  return loadConfigImpl(tauriFs, await getConfigPath());
}

export async function saveConfig(config) {
  return saveConfigImpl(config, tauriFs, await getConfigPath());
}

export async function pickFolder() {
  return invoke('library_pick_folder');
}

export async function revealInExplorer(path) {
  return invoke('library_reveal_in_explorer', { path });
}

export async function scanRoot(root) {
  return scanRootImpl(root, tauriFs);
}

export const addRoot = addRootImpl;
export const removeRoot = removeRootImpl;
export const renameRoot = renameRootImpl;
