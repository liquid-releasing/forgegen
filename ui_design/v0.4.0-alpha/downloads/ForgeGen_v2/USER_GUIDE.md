# ForgeGen v2 — User Guide

**Audio to funscript — in seconds, not hours.**

ForgeGen is a haptic content generation engine. Drop in a media file, decide
what should *influence* the haptics for each chapter, and the engine outputs
a `.funscript` ready to drive any device.

This guide walks through the v2 design end-to-end and explains the
conceptual model behind the new **Recipes** stage.

---

## The five-stage pathway

ForgeGen v2 splits the work into five linear stages. Each stage writes a
chained artifact the next reads:

| # | Stage      | Writes                  | What you do here                          |
|---|------------|-------------------------|-------------------------------------------|
| 1 | Project    | `project.input.json`    | Pick / drop a media file.                 |
| 2 | Analysis   | `<stem>.chapters.json`  | Review the auto-detected structure.       |
| 3 | Recipes    | `<stem>.recipes.json`   | Mix per-chapter influences + recipe knobs.|
| 4 | Generate   | `<stem>.funscript`      | Run the forge.                            |
| 5 | Output     | `<stem>.exported`       | Inspect, scrub, export.                   |

The pathway is gated — you can't skip ahead. Each stage's "Accept and
continue" lights its dot green, which unlocks the next.

Keyboard:

| Key            | Action                              |
|----------------|-------------------------------------|
| `1`-`5`        | Jump to any unlocked stage          |
| `⌘Z` / `⌘⇧Z`  | Undo / redo (recipes + influence)   |
| `⌘S`           | Save project sidecar                |
| `⌘K`           | Toggle Tweaks panel                 |
| `Space` (Output) | Play / pause                      |
| `Esc` (Output)   | Reset zoom                        |

---

## Stage 1 · Project

Drop an audio or video file. ForgeGen will reuse an existing
`.chapters.json` sidecar if one is found next to the file, or run
videoflow auto-chapter to detect natural sections.

**Sample project.** The "Load sample project" button (rail or main pane)
loads the bundled Big Buck Bunny benchmark — 7 chapters, 90 BPM, 9:55.
Use this to explore the UI before bringing your own media.

**Recents rail.** Switch between recently-loaded projects on the left.

---

## Stage 2 · Analysis

Read-only viewer for the chapter sidecar. ForgeGen never modifies
analysis output — if you want different chapters, re-analyse or hand-edit
the sidecar.

Top to bottom on this stage:

- **Script overview** — colored chapter strip, click to focus.
- **Beat strength · per-beat envelope** — every beat as a vertical bar,
  downbeats lit orange. The chapter ribbon underneath maps beats to
  chapters.
- **Energy heat ribbon** — each chapter colored by mean energy
  (cool-to-hot gradient). The phrase-mode tile bar runs along the
  bottom of each chapter (break / tease / slow / steady / fast / edging).
- **Pre-generation stats** — KPI strip: chapter count, phrase count,
  beat count, mean energy, auto-chapter confidence.
- **Category tabs** — Structure / Beats / Phrases / Energy. Each shows
  a different cross-section of the analyzer's output.

Accept the stage when the structure looks sensible. ForgeGen will let
you go forward with low-confidence analysis, but reviewing it here
catches bad chapter boundaries before they corrupt downstream work.

---

## Stage 3 · Recipes — the headline of v2

This is the only stage where you make decisions. Everything in
ForgeGen's pipeline is decided **per chapter**. Sub-chapter editing is
explicitly out of scope — that is FunscriptForge's job.

The stage has three big surfaces:

### Track defaults
Top of the stage. Sets fallbacks for new chapters and lets you bulk-
apply changes:

- **Target device** — Handy/Keon · OSR2/SR6 · bHaptics suit · Estim
  audio · Shaker. Each target advertises a recommended density and a
  max safe density.
- **Default style** — Full mix or Percussive.
- **Default density** — 1×, 2×, 4×, or 8× strokes per beat.
- **Default shape** — Flat / Rise / Fall / Auto (match energy curve).
- **Apply recipe to all** — copies these defaults across every chapter
  row, replacing any previous recipe.
- **Apply influence to all** — copies the currently focused chapter's
  influence mix to every chapter.

### Author this chapter
The headline novel surface, split in two:

**Influence mix (left).** A draggable polygon radar with four live axes:

- **Beat** — rhythmic onset grid (strokes lock to downbeats)
- **Bass** — sub-200Hz energy envelope (drives intensity)
- **Voice** — vocal / dialog band (slower, melodic curves)
- **Ambient** — overall envelope (mood, pacing, breath)

Drag any vertex outward to weight that influence more, or use the four
horizontal channel faders below for precision. The center of the radar
shows the dominant influence as a label. "Suggested" resets the mix to
the analyzer's auto-pick for that chapter.

Two future-tagged influences are ghosted below: **Video motion** (v0.5)
and **Focus zone** (v0.6). The metaphor reads end-to-end even though
the analyzers don't exist yet.

**Recipe knobs (right).** Once you know *what* influences this chapter,
the knobs shape *how* that mix becomes strokes:

- Style (segmented, with explanation hints)
- Density (1× / 2× / 4× / 8×)
- Shape (Flat / Rise / Fall / Auto with glyph previews)
- Emphasize downbeats (toggle)

An "Estimated output" mini-waveform sits at the bottom of the knobs
card, showing roughly how the strokes will look — amplitude, density,
emphasis. Pure visual cue; not actual stroke data.

### All chapters · influence at a glance
A row of chapter cards across the bottom, each showing a thumbnail of
its influence polygon plus its style/density chips. Click any card to
switch the "Author this chapter" pane to that chapter. The polygon
thumbnails make it easy to spot inconsistencies in the mix (e.g. one
chapter that's much more voice-heavy than its neighbours).

### Right rail · Inspector
A persistent panel on the right shows:

- Analyzer KPIs for the focused chapter
- Current recipe summary
- Influence mix as horizontal bars + numbers
- "Jump to chapter" list with every chapter

---

## Stage 4 · Generate

Pressing **Forge funscript** runs the engine. The Generate stage is
intentionally barebones — there's nothing to edit here, only to watch:

- **Forge ember** — pulses on every beat at the project BPM
- **Stepper** — Extract → Load → Beats → Shape → Write
- **Chapter sweep** — each chapter's bar lights as the forger reaches it,
  with a small hammer icon following the sweep cursor
- **The plan grid** — read-only summary of all 7 chapters' recipes +
  influence bars, lighting up green as each one completes

If you spot something wrong during the forge, hit the pathway tab back
to Recipes and edit — your changes will be live for the next forge run.

---

## Stage 5 · Output

Inspect the forged funscript and export.

### Summary card
Path, action count + BPM + duration, recipes summary, source MD5.

### Funscript visualization
The position curve, coloured by per-segment stroke velocity. Stacked
underneath:

- Stroke-amplitude band (peak-to-peak amplitude over time)
- Density heatmap (actions-per-bin as a warm gradient)
- Beat-tick row (every beat as a vertical tick; downbeats brighter)
- Chapter ribbon (click to zoom to that chapter)
- Phrase-mode ribbon

**Auto-zoom to current chapter** (toggle, top-right of section) — as
the playhead crosses a chapter boundary, the chart snaps to that
chapter automatically. Disable to scrub freely without the chart
re-zooming.

### Export targets (5 formats)
Cards with checkboxes for what to export:

| Format            | Extension       | Contains                                                                                  |
|-------------------|-----------------|-------------------------------------------------------------------------------------------|
| Audio             | `.mp4`/source   | Passthrough of the source media (so the bundle is self-contained).                        |
| Beat-track audio  | `.beat.wav`     | Source audio mixed with a click track + downbeat accents. For monitoring sync.            |
| Funscript         | `.funscript`    | The canonical haptic script. Compatible with every major player and editor.               |
| Haptic script     | `.haptic.json`  | Device-agnostic intent format. Per-event intensity + duration + body-zone target.         |
| **Forge metadata**| `.forge.json`   | NEW. Chapter sidecar + influence mix + recipes + provenance. Reproduce the run later.     |

### Destinations
Where the bundle goes:

- **Local disk** — `~/Downloads/forgegen/` (changeable)
- **Mega cloud** — encrypted upload to your Mega.nz account. Connection
  state, storage usage, target folder, and a preview of the upload
  filename are all shown.

The "Export bundle" button reads `(N targets → M destinations)` so you
can see at a glance what's about to happen.

### Actions
- **Reveal in finder** — opens the source file location
- **Save copy as…** — single-file save dialog
- **Open in FunscriptForge →** — handoff to FunscriptForge with the
  chapter sidecar attached, ready for sub-chapter editing

---

## Tweaks

Press ⌘K or click the Tweaks button (top right) to toggle the
funscript chart between **Forged** (the polished output) and **Raw**
(the analyzer's straight-up emission) views. Useful for understanding
what the curve-shaping step actually did.

---

## What ForgeGen is NOT

- **Not a per-stroke editor.** Every decision in ForgeGen is
  chapter-granular. To edit specific strokes, click "Open in
  FunscriptForge" on the Output stage.
- **Not a chapter editor.** Chapter detection is upstream of ForgeGen
  (videoflow auto-chapter). If chapters look wrong, re-analyse or
  hand-edit the `.chapters.json` sidecar — ForgeGen will pick up the
  changes on the next load.
- **Not a video player.** The Output stage scrubs the haptic curve
  only. Real-time preview against video is FunscriptForge or your
  player.

---

## Troubleshooting

**The polygon won't drag.** Click directly on a vertex dot (the
coloured circle). The hit zone extends ~10px beyond the visible dot.

**The forge stops at "Shape".** This stage is per-chapter — long
projects with many chapters take longer here. The chapter sweep
underneath shows progress.

**Export bundle is greyed out.** You need at least one target format
*and* at least one destination selected.

**Mega upload says "not connected".** Click "Connect to Mega" on the
Mega destination card. In v2 this is a mock; real OAuth flow lands
in v0.4.

---

*ForgeGen v0.3-alpha · Last updated 2026-05-19 · MIT licensed*
