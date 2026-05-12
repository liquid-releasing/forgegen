# Changelog

All notable changes to forgegen are recorded here. Format loosely follows [Keep a Changelog](https://keepachangelog.com); versions follow semver-ish (alpha tags during pre-1.0).

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
