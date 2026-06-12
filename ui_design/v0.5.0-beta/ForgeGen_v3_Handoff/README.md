# Handoff: ForgeGen v3 — Video-as-External-Source (per-chapter source selection)

## Overview
ForgeGen is a desktop app that turns audio/video into a **funscript** (a haptic motion
track). v3 adds the ability to bring in a **second source** for each chapter — a
computer-vision motion track from the bundled **Funscript-Flow** video generator (or any
imported `.funscript`) — then **compare audio-synth vs. video per chapter, choose one, and
stitch the selection into a single output** with the boundaries blended.

The headline new surface is a pipeline stage called **Sources**, inserted between
**Analysis** and **Recipes**.

## About the Design Files
The files in `source/` are **design references created in HTML/React (via in-browser
Babel)** — a working prototype showing the intended look and behavior. They are **not
production code to ship directly.** The task is to **recreate these designs in the target
codebase's environment** (the real ForgeGen desktop app — Python/Streamlit or an
Electron/Tauri shell, per `architecture/ROADMAP.md`) using its established patterns. The
prototype's engine (CV analysis, stitching) is **simulated** — see "What is mocked" below;
the production app wires the same UI to the real pipeline.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, layout, interactions, and copy are
all intended as shown. Recreate the UI to match, using the design tokens in
`source/ForgeGen_v3/tokens.css` (the single source of truth for all values below).

## How to run the prototype
Open `source/ForgeGen_v3.html` (or the offline `ForgeGen v3 (standalone).html`) in a
browser. Click **Load sample project** (Big Buck Bunny benchmark — 7 chapters, 90 BPM,
9:55) and walk the pipeline: Project → Analysis → **Sources** → Recipes → Generate → Output.
On the Sources stage, click **Analyze video motion** to populate the video candidate.

---

## The pipeline (6 stages)
A top pathway nav with an accept-bar at the bottom of each stage; each stage writes a
chained artifact the next reads. Stage gating: a stage unlocks once its upstream is accepted.

1. **Project** — load media + sidecar; new in v3: two "Add another source" cards
   (Analyze video motion · Import a .funscript).
2. **Analysis** — read-only review of detected chapters/phrases/beats.
3. **Sources** ⭐ *(new in v3)* — per-chapter compare & select of the motion source.
4. **Recipes** — per-chapter influence mix (audio) + recipe knobs.
5. **Generate** — forge run; stitches the chosen sources, seam-blends boundaries.
6. **Output** — inspect funscript, per-chapter breakdown (now with a Source column), export.

---

## ⭐ The Sources stage (the core deliverable)

### Concept / rationale (important — drives the UX hierarchy)
Audio "legs" (Beat/Bass/Voice/Ambient) are feature **envelopes** mixed on a radar. A
Video-CV track is a **finished motion track** derived from visual reality. They cannot be
mixed as radar vertices — so video is **not an influence**, it is a **per-chapter source
choice**. Hierarchy: **pick the source first, then the controls for that source.** Audio
chapters get the influence mix (in Recipes); video/imported chapters skip it.

### Layout
Two-column: a scrolling main column (left) + a fixed **inspector** rail (right,
`--inspector-w` = 360px). A sticky accept-bar sits at the bottom ("Lock sources and
continue"). Main column, top to bottom:

1. **Acquire banner** (shown only until video is analyzed): blue-accented
   (`--info` #4dabf7) card — "Analyze video motion" runs the bundled CV pass as a one-time
   batch. Shows a progress bar while running.
2. **Source-mix ribbon** — full-width horizontal bar, one segment per chapter sized by
   duration, filled with the chosen source's color; a dashed `--accent-spark` vertical
   marker at each boundary where the source **changes** (a "seam"). Source icon centered
   in each segment.
3. **Bulk bar** — "Use suggested" · "All audio" · "All video" (disabled until analyzed) ·
   "Import a .funscript…" + a live mix readout ("5 audio · 2 video").
4. **Per-chapter compare cards** (one per chapter, stacked).

### Compare card (per chapter)
- Header: chapter index (`01`–`07`), name, contentType pill, duration pill, and a right-
  aligned "using **<Source>**" chip in the source's color.
- Body: a row of **candidate panels** (Audio-synth, Video CV, and Imported if present),
  each a clickable button:
  - Source icon + label + a **SUGGESTED** badge (warm `--accent-warm-2`) on the
    higher-confidence source + a checkbox (filled in the source color when selected).
  - A **mini funscript curve** (SVG polyline, source-colored, faint center line) showing
    that chapter's slice of the candidate track. Non-selected/non-suggested panels render
    at 0.45 opacity.
  - A **confidence bar** (0–100%) + a one-line **rationale**. Imported panels show
    "User-provided · trusted" instead of a score.
- Clicking a panel selects that source for the chapter (and focuses the card → updates
  inspector). Selecting is the whole interaction — no separate confirm.

### Source identity (used everywhere: ribbon, cards, pills, Recipes, Generate, Output)
| Source | id | label | icon (lucide) | color token | value |
|---|---|---|---|---|---|
| Audio-synth | `audio` | "Audio-synth" | `audio-lines` | `--accent` | #ff4b4b |
| Video CV | `video` | "Video CV" | `video` | `--info` | #4dabf7 |
| Imported | `imported` | "Imported" | `file-down` | `--mode-chaotic` | #c084fc |

### Inspector rail (focused chapter)
- Chapter header + a chosen-source chip.
- **Source confidence**: audio vs. video bars + rationales; SUGGESTED + "chosen" tags;
  two quick-select buttons (Audio / Video).
- **Downstream** note: the per-chapter `source` is stamped into the sidecar so the
  downstream editor (FunscriptForge) can pick refine defaults (video → CV smoothing/
  de-jitter; imported → trusted, refine off; audio → standard).
- **Imported tracks** panel (import button / loaded-file readout).
- **Jump to chapter** list with a source icon per row.

---

## Interactions & behavior
- **Analyze video motion** (Project card or Sources banner): simulated ~2.6s progress, then
  `videoAnalyzed = true`, video candidate becomes available, and per-chapter sources reset
  to the **suggested** mix (auto-suggest, never start blank).
- **Import .funscript**: adds an `imported` candidate available on every chapter.
- **Per-chapter select**: instant; updates ribbon, mix counts, seam count, inspector.
- **Bulk**: Use suggested / All audio / All video.
- **Generate**: per-chapter sweep animation; on completion builds the stitched output and
  routes to Output. Toast reports "N actions · 5 audio · 2 video · 2 seams blended".
- **Undo/redo**: source changes are snapshotted alongside recipes/influence (⌘Z / ⌘⇧Z).
- **Output**: Tweaks panel toggles the funscript between **Multi-source** (the stitched
  selection) and **Audio only** (all-audio baseline) so the value of video is visible.

## State management (prototype shape — mirror in production)
Top-level app state added in v3:
- `sources: ("audio"|"video"|"imported")[]` — one per chapter (the selection).
- `videoAnalyzed: boolean`, `analyzing: boolean`, `analyzeProgress: 0..1`.
- `imported: { name, actions } | null`.
- Derived: `suggested[]` (higher-confidence source per chapter), `candidates`
  (`{ audio, video, imported }` action arrays), `stitched` & `audioOnly`
  (`{ actions, seams }`).
- Pipeline acceptance gains a `sources` key; stage order is
  project → analysis → **sources** → recipes → generate → output.

## What is mocked (replace with real pipeline in production)
- The **video CV candidate** is synthesized (`fgBuildVideoCandidate`) — more irregular than
  the beat-locked audio track, jittery in low-confidence chapters. Production: run
  Funscript-Flow as a subprocess (Mode 1 — consume its `.funscript` output) and ingest.
- **Per-chapter confidence + rationale** (`FG_SOURCE_CONF`) are hand-authored for the BBB
  sample. Production: derive audio confidence from beat/energy clarity and video confidence
  from CV tracking quality.
- **Stitching/seam-blend** (`fgStitchSources` / `fgBlendSeams`) is prototype-grade. Production:
  reuse the engine's existing `--blend-seams` seam logic at chapter boundaries.
- Architecture rationale and build order: `architecture/VIDEO_VIA_EXTERNAL_GENERATOR.md`.

## Design tokens (authoritative: `source/ForgeGen_v3/tokens.css`)
- **Surfaces**: bg #0e1117 · surface #1a1d27 · surface-2 #12151e · surface-3 #232735 ·
  border #2d3148 · border-strong #3a3f5c
- **Text**: #fafafa / muted #9ba3c4 / dim #6b7390
- **Accents**: red #ff4b4b (#ff7b7b, #c93535) · forge-warm #ff8c42 / #ffb547 / spark #ffd166
  · electric #5b9dff
- **Status**: success #3ed598 · warn #ffb547 · danger #ff5470 · info #4dabf7
- **Source colors**: audio #ff4b4b · video #4dabf7 · imported #c084fc
- **Chapter palette**: --ch-1…7 (#ff4b4b, #ff8c42, #ffb547, #3ed598, #4dabf7, #c084fc, #ff5fa2)
- **Velocity gradient**: --chart-v0…v6 (blue→red, perceptual)
- **Type**: Inter (sans), JetBrains Mono (mono); scale --t-display 56 → --t-caption 11.5
- **Radius**: 4/6/8/10/12 + pill 999 · **Elevation**: --elev-1…3 · **Motion**: --ease-standard
  cubic-bezier(.2,0,0,1), --dur-base 180ms
- **Layout**: header 60 · status 28 · rail 264 · inspector 360

## Assets
None required for the Sources feature — all visuals are CSS/SVG + lucide icons
(`lucide@0.469`). Fonts are Google Fonts (Inter, JetBrains Mono). No raster assets.

## Files (in `source/`)
- `ForgeGen_v3.html` — entry; loads tokens + scripts, defines the `App` (state, pipeline,
  stitching, Tweaks).
- `ForgeGen_v3/SourcesTab.jsx` — ⭐ the new stage (compare cards, ribbon, inspector).
- `ForgeGen_v3/data.js` — sample project + **v3 source engine** (`FG_SOURCES`,
  `FG_SOURCE_CONF`, `fgBuildVideoCandidate`, `fgBuildImportedCandidate`, `fgSuggestSources`,
  `fgStitchSources`, `fgBlendSeams`, `fgSourceMix`).
- `ForgeGen_v3/AppShell.jsx` — pathway/topbar/accept-bar/status (the `sources` stage).
- `ForgeGen_v3/ProjectTab.jsx` — adds the two acquire cards.
- `ForgeGen_v3/RecipesTab.jsx` — greys the influence radar for video/imported chapters.
- `ForgeGen_v3/GenerateTab.jsx` — source-aware plan + seam count.
- `ForgeGen_v3/OutputTab.jsx` — Source column + source-mix summary + provenance handoff.
- `ForgeGen_v3/FunscriptChart.jsx`, `AnalysisTab.jsx`, `primitives.jsx`, `tweaks-panel.jsx`,
  `tokens.css` — supporting (largely unchanged from v2).
