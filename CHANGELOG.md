# Changelog

All notable changes to forgegen are recorded here. Format loosely follows [Keep a Changelog](https://keepachangelog.com); versions follow semver-ish (alpha tags during pre-1.0).

---

## v0.3.0 — 2026-05-14

First "complete app" release. Real end-to-end flow: pick a media file, analyse, author per-chapter recipes, generate, inspect the funscript. Output tab is new in this release; the Generate flow gained a cancel button, a recipe summary, and sequential next-tab CTAs across the four tabs. Multiple Windows-only bridge fixes (cancel didn't actually kill python, Open-in-Explorer silently fell back to My Documents, copy-onto-self locked the file, Generate could delete the prior funscript mid-run on long files).

### Added

- **Output tab v0.1 — funscript inspector.** Summary card (path / actions / BPM / duration / source partial-MD5), rolling actions-per-second density chart with chapter dividers, per-chapter breakdown table joining the funscript's `generated_from` block with the sidecar's chapter names, **Open in Explorer** (file selected in the host file manager), and **Save a copy…** (copies to a user-picked destination; original stays put).
- **Version dropdown.** The Output tab enumerates the canonical funscript plus all `<stem>.funscript.<ts>.bak` files left by prior runs. Switching to a backup re-reads it and shows an orange "Viewing backup" header so the user always knows which version they're inspecting.
- **Cancel mid-Generate.** Warning-colour button that swaps in for the primary CTA during generation, kills the in-flight videoflow run, and returns to idle without showing an error. Same plumbing as auto-chapter's cancel.
- **Recipe summary on Generate.** Busy block and result card show `Style: X · Density: Y · Shape: Z`; per-field "mixed" appears when chapters differ.
- **Sequential CTA flow.** Each tab's forward CTA names the next tab: Project → "View Analysis →", Analysis → "Build Funscript →", Generate → "View Output ↗" + "Regenerate" link.
- **Style speed hint** in the dropdown labels: "Percussive — drums lead (slower)" / "Full mix — vocals + melody (faster)". HPSS percussive separation is what makes percussive slower; the label now sets expectation at the point of choice.

### Fixed

- **Cancel hangs during HPSS-bound beats analysis.** The bridge spawns `cmd /C python.exe …`; `TerminateProcess(cmd)` does NOT cascade to the python grandchild, so python kept holding the stderr pipe and the bridge's stderr-drain task hung forever. New `kill_process_tree` helper shells out to `taskkill /F /T /PID` on Windows; "Cancelling…" now resolves in ~1s for both Generate and Project-load runs.
- **Generate could destroy the prior funscript mid-run on long files.** The bridge was renaming the existing `<stem>.funscript` → `.bak` BEFORE videoflow ran; clicking into the Output tab during a long Generate showed ENOENT because the canonical was already gone. Now writes to a unique temp path and atomic-renames on success; backups happen AFTER the new file is ready, not before. Cancelled or failed runs leave the prior canonical untouched.
- **Open in Explorer silently opened My Documents.** Rust's `Command::arg` applies CommandLineToArgvW-style quoting that Explorer's argv parser rejects on any path with spaces/parens. Switched to `raw_arg` on Windows so `/select,"<path>"` is passed verbatim.
- **Save-as picker defaulted to the canonical path** — naive Save click triggered the OS replace-prompt then hit our same-source-and-destination guard. Now suggests `<stem> (copy).funscript` so the dialog points at a distinct name; the same-path guard remains as a safety net.
- **Save-as on the same file** failed with Windows os error 32 ("being used by another process"). `save_funscript_copy` now canonicalises both sides and returns a friendly error pointing the user at picking a different folder/name.

### Changed

- `dialog:allow-save` capability added (required by `pickSaveAsPath`).
- Beats-stage regex on the Generate Stepper extended to match per-chapter labels (`Analyzing chapter N/M`, `Detecting beats`, `Computing phrases`) — long-file Beats stage now ticks chapter-by-chapter instead of looking frozen.

### Notes for developers

- The `cmd /C` python wrapper isn't going away — it's still the only way to get Python's stderr through Tokio on Windows. The process-tree kill is the right pattern when you wrap a subprocess; copy it if you spawn similar shells elsewhere.
- "v0.3.0" is the first non-`mvp` tag and clears the MSI numeric-only constraint — `tauri.conf.json` carries `0.3.0` verbatim with no suffix stripping needed.

---

## v0.2.1-mvp3 — 2026-05-12

CI validation cut. First tag pushed through the new Tauri build matrix (`release.yml` rewritten in v0.2.0-mvp2). No app-behaviour changes.

### Changed

- Bumps versions across `package.json`, `Cargo.toml`, `tauri.conf.json` to exercise the cross-platform matrix (windows-latest / macos-latest / ubuntu-latest) and the `notify-web` dispatch step that updates `forgegen-web`'s `latest-version.json` automatically.

If the matrix lands `.msi`, `.dmg`, and `.AppImage` artifacts on the release and the version badge on forgegen.app catches up without manual intervention, the release pipeline is solid for future tags.

---

## v0.2.0-mvp2 — 2026-05-12

Second MVP cut on the Tauri+React rewrite. Live per-stage progress (the visible piece that was missing in mvp1) now works end-to-end, with sub-stage progress for the long ffmpeg extract.

### Added

- **Live Stepper progress** — both auto-chapter and Generate runs light up dots as each stage completes (Extract / Load / Detect / Beats / Phrases / Sidecar). Detail line shows the current label, including ffmpeg sub-stage time-codes ("Extracting audio… 1:23 done") that tick up every wall-clock second during long extracts.
- **Side-channel progress bridge** — Tokio's piped reader can't read python.exe's stdio on Windows (verified: `EOF after 0 lines` before any write). Forgegen now points videoflow at a temp file via `VIDEOFLOW_PROGRESS_FILE`; a 200ms-tick polling task in the bridge drains new lines and emits Tauri events. Existing stderr/stdout tasks stay (free win on Linux/macOS).
- **Python error surfacing** — `_err()` mirrors to side-channel, and `cli.main()` writes uncaught-exception tracebacks there too. Forgegen sees real failure causes instead of opaque exit codes.
- **Tests** — 15 new (`test_cli_emit_progress.py`, `test_ffmpeg_progress.py`); full videoflow suite is 343 passing.

### Fixed

- **Stepper dots used to stay hollow.** Root cause: `print(file=sys.stderr, flush=True)` in `_emit_progress` raised `BrokenPipeError` from the second call onward (Tokio closes its read side immediately on Windows), and `structural._progress`'s broad `except Exception` swallowed it silently — so only the first `_emit_progress` ever reached the side-channel write below the print. One-line fix: `try/except OSError` around the print.
- **ffmpeg extract gave no progress.** Was using `-progress pipe:1`, which ffmpeg block-buffers until exit. Switched to `-progress <tempfile>` polled in a daemon thread.

### Notes for developers

- videoflow companion release: **v0.0.6-alpha** (`fix(cli): catch BrokenPipeError on stderr so all stage emits land`). Reinstall the editable install if you're tracking versions.
- forgegen Cargo features now require `tokio` `time` + `sync`.

---

## v0.1.0-alpha — 2026-04-29

First v0.1 milestone alpha. Audio-only path is functionally complete; remaining v0.1 items (FunscriptForge reader, preview/playback) ship in subsequent releases.

### Added

- **Analysis sidecar** — Save to folder now emits `<stem>.analysis.json` next to the funscript. v1.0 schema, minimal in this release: `version`, `generated_by`, `source` (path, duration, partial-MD5), `structural.chapter_proposals` (from embedded mp4 chapters or a `<stem>.chapters.json` sidecar). Future releases additively fill in `audio_features`, `event_proposals`, etc.
- **forgegen → FunscriptForge handoff** — architecture decision recorded in [docs/architecture/funscriptforge-handoff.md](docs/architecture/funscriptforge-handoff.md). Vehicle is the analysis.json sidecar; FunscriptForge auto-loads it on funscript open. One-way (forgegen → FF) in Phase 1; round-trip planned in Phase 3.
- **Reference doc** — [Analysis output](docs/reference/analysis-output.md) explains what forgegen analyses and what the sidecar contains.
- **UI notice** — file picker now surfaces the v0.1 ~10-minute media-length expectation and points at the v0.5 long-form scaling roadmap.
- **CHANGELOG** — this file.

### Changed

- `forgegen_core.about.VERSION` bumped from `0.0.1` (stale) to `0.1.0-alpha`. The version now appears correctly in the analysis.json `generated_by.tool_version` field.
- `requirements.txt` declares `forge-ui-components` explicitly so a fresh `pip install -r requirements.txt` doesn't surprise.
- `docs/quick-start.md` and `docs/ui/generate.md` updated for the new Save flow (funscript + sidecar).
- ROADMAP — long-form chapter processing remains v0.5; preview / playback deferred past v0.5 in favour of building the canonical `forgemoment` widget reused across the forge tool family.

### Cross-app handoff status (v0.1 milestone)

- ✅ forgegen writer side — shipped this release
- ⏳ FunscriptForge reader side — spec'd ([forgegen-handoff doc in FF](https://github.com/liquid-releasing/funscriptforge/blob/main/docs/architecture/ARCHITECTURE_forgegen_handoff.md)), not yet implemented
- 🟡 Preview / playback — deferred past v0.5; will ship as the `forgemoment` Web Component reusable across the forge family

### Notes for developers

- `forge-ui-components` is now an explicit requirement; pull and `pip install -r requirements.txt` before next run.
- `videoflow` editable installs that point at the legacy `Projects/videoflow` path will break — reinstall from `_lqr/videoflow`.

---

## v0.0.4 — 2026 (prior)

Comparison strips, colored chart, stats, and PyInstaller bundle fixes. Pre-CHANGELOG era; see git log for details.
