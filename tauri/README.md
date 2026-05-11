# forgegen — Tauri + React scaffold (v0)

The Tauri+React rewrite of forgegen, per `../REFACTOR_TO_TAURI_REACT.md`.

This is **scaffold v0** — proves the bridge works end-to-end (Tauri → `videoflow` CLI subprocess → JSON → React), nothing more. No real UI yet.

## Prerequisites

- **Node 18+** + **npm 9+** — Node 24 / npm 11 confirmed working
- **Rust toolchain** (rustup) — for `tauri dev` / `tauri build`. Not needed for browser-only iteration via `npm run dev`. Install: <https://rustup.rs/>
- **WebView2** — pre-installed on Windows 11. Linux/macOS need their own webview deps; see Tauri prerequisites: <https://tauri.app/start/prerequisites/>
- **videoflow** — Python package built and importable. The default `forgegen/.venv` already has it editable-installed. The Tauri Rust code shells out to the `videoflow` binary in this venv.

## First run

```sh
npm install
```

That fetches React, Vite, Tauri JS APIs. Doesn't touch Rust.

## Two run modes

### Browser-only (no Rust required, mock data)

```sh
npm run dev
```

Opens Vite dev server at <http://localhost:1420>. The bridge calls return mock data because there's no Tauri runtime. Use this for UI iteration when you don't need real `videoflow` data.

### Tauri (real bridge)

Install rustup first if you haven't. Then:

```sh
npm run tauri:dev
```

Tauri builds the Rust shell, launches the desktop window, and hosts the Vite dev server inside it. Hot-reload works for React changes; Rust changes trigger a rebuild.

## Bridge — how it works

The Rust side spawns `videoflow` as a subprocess per command (per `../BRIDGE_DESIGN.md` v0). Default lookup order:

1. `VIDEOFLOW_BIN` env var (explicit path)
2. `forgegen/.venv/Scripts/videoflow.exe` on Windows / `forgegen/.venv/bin/videoflow` elsewhere
3. `videoflow` on `PATH` (last resort)

Override:

```sh
# PowerShell
$env:VIDEOFLOW_BIN = "C:\path\to\videoflow.exe"
npm run tauri:dev
```

## Layout

```
tauri/
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx               # React entry
│   ├── App.jsx                # root component
│   ├── App.css                # minimal dark theme
│   ├── api/
│   │   └── videoflow.js       # bridge client (Tauri invoke wrappers + browser mocks)
│   └── tabs/
│       └── Project.jsx        # placeholder Project tab
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    └── src/
        ├── main.rs            # Tauri entry (calls into lib)
        ├── lib.rs             # Tauri Builder + invoke handlers
        └── commands.rs        # videoflow subprocess wrappers
```

## What v0 demonstrates

- Tauri Rust ↔ React JS bridge via `invoke()`
- Subprocess spawning of `videoflow` CLI with JSON-on-stdout parsing
- One real bridge call: `videoflow patterns-list` returning the 7-pattern haptic catalog
- Browser-mode mock fallback so UI work doesn't require Rust

## What v0 does NOT do (deferred)

- Project tab is a placeholder — no file picker, no recents, no device selection yet
- No Analysis / Generate / Device / Export tabs
- No JSX from `forge-ui-design/iterations/` imported yet (placeholder UI only)
- No PyInstaller bundle of `videoflow` for distribution — bridge only works in dev (assumes venv exists)
- No `forge-reusable-ui` carve-out — primitives will get extracted from forge-ui-design's JSX once shared with FFP/beatflo

See `../REFACTOR_TO_TAURI_REACT.md` for the migration order and what comes next.
