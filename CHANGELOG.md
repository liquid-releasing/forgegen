# Changelog

All notable changes to forgegen are recorded here. Format loosely follows [Keep a Changelog](https://keepachangelog.com); versions follow semver-ish (alpha tags during pre-1.0).

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
