# Analyze → Generate → Export tabs (PySide6 design)

> **Status:** design proposal for the PySide6 forgegen rebuild. Replaces
> the Streamlit "Generate / Details" two-tab shape with **Analyze →
> Generate → Export** linear tabs. The shell is fresh; this doc is the
> locking reference for what those tabs do, what they show, and where
> their data lives.

> **Audience:** engineers implementing the PySide6 forgegen shell over
> the existing `forgegen_core` + `videoflow` engine. Lead with this doc
> when answering "what visuals belong in forgegen, and where does
> per-chapter generation control live?"

---

## Mental model

The v2 sidecar (`<stem>.chapters.json`) **is the project database**.
videoflow's `auto_chapter` writes the analytical fields. forgegen's job
is **selection over that database** — per chapter, the user picks how
the funscript should be generated. The user never edits the analysis;
they steer the generation that runs against it.

This cleaves cleanly into three tabs (show → choose → preview → done):

| Tab | Read or write? | Purpose |
|---|---|---|
| **Analyze** | Read-only viewer of the sidecar | Build user confidence that the analysis is sensible. |
| **Generate** | Authors per-chapter generation choices | Pick style / stroke density / shape per chapter, then run generation. |
| **Export** | Read-only preview of generated output + export actions | The "full reveal" — see what was generated, pick what to export and where. |

forgegen never grows phrase-boundary editors, mode overrides, or
chapter-boundary drag handles. If the analysis is wrong, the recourse
is **"Open in FunscriptForge"** (per-chapter button on each chapter
card). The "easy button" promise stays intact.

---

## Tab 1 — Analyze

Read-only visualisation of the v2 sidecar. Loads from
`videoflow.sidecar.read_sidecar(media_path)`; never writes.

### Depth — what this surfaces vs PythonDancer

PythonDancer's surface is **two whole-file plots**: a pitch line (set
the tone baseline against the average) and a heatmap (the intensity
map of the generated script). Both treat the file as one
undifferentiated stream. Every adjustment is global; every percentile
is computed against the whole file; one BPM is reported.

Forgegen's Analyze tab is **the visual proof we work at a different
level**. Same source media, but we segment it, label it, and measure
each segment against its own context. The ribbons stacked below aren't
prettier plots — each one is a structural signal PythonDancer doesn't
extract.

| What PythonDancer shows | What forgegen shows | Why it's deeper |
|---|---|---|
| One pitch line | **Chapter ribbon** with content_type + confidence | The audio has structural sections; treating it as one stream averages out everything that distinguishes them. |
| (no equivalent) | **Phrase ribbon** with six behavioural modes | Per-phrase classification — `tease` / `steady` / `edging` / `break` / `fast` / `slow` — drives mode-aware curve shaping that a single global threshold can't produce. |
| One heatmap | **Beat-density heatmap** + **energy envelope** | Density and amplitude are separate signals. PD collapses them; we show both, binned over time. |
| One global BPM | **BPM-per-chapter bars** | Long-form material isn't one tempo. Per-chapter BPM is the lever for chunk-relative classification. |
| Whole-file Target % | **Per-chapter percentiles** in detail cards | Quiet ambient sections aren't "low energy" relative to their own chapter — they're *normal for that chapter*. Per-chapter normalisation is the lever that fixes the ambient-flat-output failure. |
| (no equivalent) | **Confidence shading** on chapters | We expose detection uncertainty so the user knows where to look first. |
| (no equivalent) | **Provenance footer** | Multi-writer audit trail. PD is one-shot; ours rebuilds incrementally with full history. |

The framing on the tab title bar is one line of plain language:

> *"Reads the structure of the audio and generates against that
> structure — so a 90-minute scene that opens ambient and ends
> music-driven feels like both, not like the average of them."*

### Layout

```
┌─ TopBar (always visible) ───────────────────────────────────────────┐
│  ⌘  set.mp3                                                          │
│  3h 12m · 38 chapters · BPM 95–142 · last analyzed 2026-05-07 18:42  │
│  [Chapter ▼ chapter 7 — build]    [Open in FunscriptForge]           │
└──────────────────────────────────────────────────────────────────────┘
┌─ Left nav: chapter list ──┐  ┌─ Center: stacked ribbons ───────────┐
│  ▢ 1  intro       6:42    │  │  ── waveform ─────────────────       │
│  ▢ 2  build       4:51    │  │  ▌▌▌▌▌▌▌▌▌▌▌▌ chapter ribbon ▌▌▌▌    │
│  ▣ 3  sustain     7:15 ←  │  │  ▎▎▎▎ ▎▎▎▎▎ phrase ribbon ▎▎▎▎▎     │
│  ▢ 4  edge        5:22    │  │  /\__/\___/\___/\__ energy curve     │
│  …                        │  │  ▓▓▒░░▒▓▓▒░▓▓ beat-density heatmap   │
│  ▢ 38 outro       3:30    │  │  ▆ ▅ ▇ ▄ ▆ ▅ ▇ ▆ BPM-per-chapter    │
└───────────────────────────┘  └──────────────────────────────────────┘
                               ┌─ Right: detail card ─────────────────┐
                               │  Chapter 7 — build                   │
                               │  Duration  6:42                      │
                               │  Type      music    conf 0.94         │
                               │  BPM       128                        │
                               │  Modes     steady 60% · edging 30%   │
                               │            · tease 10%                │
                               │  ▁▂▅▇▅▂▁▂▅▇  beat-strength sparkline │
                               │  ─────────                            │
                               │  [Open in FunscriptForge]             │
                               └──────────────────────────────────────┘
```

### Visuals (in priority order)

| # | Visual | Source field | Renders |
|---|---|---|---|
| 1 | **Chapter ribbon** | `chapters[].at_ms`/`end_ms`/`content_type` | Coloured horizontal blocks; width ∝ duration; colour by content_type. |
| 2 | **Phrase ribbon** | `phrases[].mode` keyed by `chapter_idx` | Sub-strip under chapter ribbon; coloured by mode (`tease`/`steady`/`edging`/…). |
| 3 | **Waveform** | source media (rendered via librosa or cached PNG) | Thin overview at the top; chapter boundaries vertically projected. |
| 4 | **Energy envelope** | `energy.beat_map.strengths` over `times_ms` | Sparse curve; per-chapter overlays optional. Answers *amplitude*. |
| 5 | **Beat-density heatmap** | bin `energy.beat_map.times_ms` into ~5s buckets | Thin horizontal heatmap strip beneath the energy envelope; shade by beats-per-bucket. Answers *density* — complementary to the envelope's amplitude signal, and the visual that scales gracefully from 30s to 8h files. |
| 6 | **BPM-per-chapter bars** | `energy.per_chapter[i].bpm` | One bar per chapter; reveals tempo variation. |
| 7 | **Detail card** | active chapter's record + per-chapter energy block | BPM, content_type, confidence, mode breakdown pie, **per-chapter beat-strength sparkline** (`energy.beat_map.strengths` sliced to chapter range — surfaces where the *hard* beats land within the selected section). |
| 8 | **Confidence shading** | `chapters[].confidence` | Dim chapters below a confidence threshold; hover reveals the value. |
| 9 | **Provenance footer** | `provenance[]` last entry | "Last analyzed by videoflow.structural 0.0.5 · 18:42:11 UTC." |

### What Analyze does NOT do

- No edit handles on the chapter or phrase ribbons.
- No "re-detect" button. (Re-running auto_chapter is a Setup-tab action.)
- No tone or shape selection. (Generation choices live in tab 2.)

---

## Tab 2 — Generate

Per-chapter authoring of the three generation choices, plus the global
defaults that apply when a chapter hasn't been touched.

### Three controls per chapter

| Control | Vocabulary | Default | Notes |
|---|---|---|---|
| **Style** | `rhythmic` · `sensual` · `intense` · `chaotic` · `auto` | `auto` (resolves per `chapters[i].content_type`) | Forgegen's existing four-style vocabulary. `auto` picks per content_type — e.g. `music → rhythmic`, `ambient → sensual`. |
| **Stroke density** | UI label · numeric value: **sensual** (1) · **canonical** (2) · **dense** (4) · **saturated** (8) | `canonical` (2) | Actions per beat. UI shows the domain label; the schema stores the integer value. v0.0.4 had this as a single global flag; v0.0.5 lifts it per-chapter. |
| **Shape** | `flat` · `rise` · `fall` · `auto` (the locked enum from videoflow #4) | `auto` | Curve direction over the chapter. `auto` = `compute_auto_tone` slope-derived. Forgegen's UI labels this control "Tone" for end users; the schema field is `shape`. |

Selections persist on the chapter record in the sidecar (the structural
database is also the project file — see "Persistence" below). Defaults
are not written; only chapters the user has explicitly chosen for get
their values stored.

### Layout

Same TopBar + left-nav (chapter list) as Analyze. Center pane shows
the per-chapter form with the three controls plus a live curve preview.

```
┌─ Left: chapters ──────────┐  ┌─ Center: per-chapter generate form ─┐
│  ▣ 3  sustain     7:15    │  │  Chapter 3 — sustain    music · 128 │
│  ▢ 4  edge        5:22    │  │                                      │
│  …                        │  │  Style                               │
│                           │  │  ( ) auto      (•) rhythmic          │
│  ─── Defaults ──────      │  │  ( ) sensual   ( ) intense           │
│  Style:    auto           │  │  ( ) chaotic                         │
│  Density:  canonical      │  │                                      │
│  Shape:    auto           │  │  Stroke density                      │
│                           │  │  ( ) sensual  (•) canonical          │
│  [Apply to all unset]     │  │  ( ) dense    ( ) saturated          │
│                           │  │                                      │
│                           │  │  Shape  (UI label: "Tone")           │
│                           │  │  [Flat][Rise][Fall][Auto▣]            │
│                           │  │  ( per-shape preview cards row )     │
│                           │  │                                      │
│                           │  │  ─── Live curve preview ──           │
│                           │  │  /\___/\__/\___/\__ for ch 3 only    │
│                           │  │                                      │
│                           │  │  [Reset chapter] [Open in FF]         │
│                           │  └──────────────────────────────────────┘
│                           │
└───────────────────────────┘
[Generate funscript ▶]   ← bottom-right primary action
```

### Generate flow

When the user clicks **Generate**:

1. For each chapter:
   - Resolve `(style, density, shape)` — chapter-specific value, falling
     through to the global default when unset.
   - Slice the AudioBeatMap to the chapter's `(at_ms, end_ms)` range.
   - Run `beats_to_curve(...)` with the chapter's params.
   - Run `shape_curve(...)` with the chapter's phrases (already in the
     sidecar) and the selected shape's `tone_per_phrase`.
2. Stitch the per-chapter curves end-to-end (same concatenate-with-
   overlap-drop strategy `videoflow.audio.analyze_beats(chapters=…)`
   uses internally).
3. Write the funscript via `videoflow.generate.export_funscript`.

This is pure orchestration over existing `videoflow.generate` calls.
No new engine code required.

---

## Tab 3 — Export

The "full reveal." After Generate completes, the user lands here to see
what was produced and decide what to do with it. Read-only with respect
to the funscript curve (curve editing belongs in FunscriptForge); the
write actions are export choices, not curve mutation.

### Layout

Same TopBar + left-nav. Center pane stacks the generated artifact's
visualisations top-to-bottom; right pane is the export action panel.

```
┌─ Left: chapters ──────────┐  ┌─ Center: generated funscript view ──┐
│  ▣ all  (full file)       │  │  ── waveform ─────────────────       │
│  ▢ 1  intro       6:42    │  │  ▌▌▌▌▌▌▌▌▌▌▌▌ chapter ribbon ▌▌▌▌    │
│  ▢ 2  build       4:51    │  │  /\__/\___/\___/\__ generated curve  │
│  ▢ 3  sustain     7:15    │  │  ▆ ▅ ▇ ▄ ▆ ▅ ▇ ▆  action density     │
│  …                        │  │  ─── Heatmap strip ──                │
│                           │  │  ▓▓▒▒░░▓▓▓▒▒░░▓▓ amplitude over time │
│                           │  │                                      │
└───────────────────────────┘  └──────────────────────────────────────┘
                               ┌─ Right: export panel ────────────────┐
                               │  Funscript                           │
                               │  4 217 actions · 1h 48m · density 0.6│
                               │  ─────────                           │
                               │  Export funscript                    │
                               │  [✓] include metadata block          │
                               │  [✓] include chapter markers         │
                               │  Output:  set.funscript              │
                               │  [ Save funscript ]                  │
                               │                                      │
                               │  Sidecar (snapshot)                  │
                               │  [✓] write set.chapters.json         │
                               │  ─ Auto on generate; uncheck to skip │
                               │                                      │
                               │  Other                               │
                               │  [ Open in FunscriptForge ]          │
                               │  [ Re-run Generate ]                 │
                               └──────────────────────────────────────┘
```

### Visuals

| # | Visual | Source | Renders |
|---|---|---|---|
| 1 | **Generated funscript curve** | actions from `generate_from_beats` | Top-level full-timeline curve over the waveform. The headline visual. |
| 2 | **Action density curve** | bin actions per second | Confirms density tracks the music's energy and the chapter style picks. |
| 3 | **Beat-density heatmap** | bin `energy.beat_map.times_ms` | Same strip from the Analyze tab, rendered alongside the action density curve so the "did the script follow the music?" check is one glance. |
| 4 | **Heatmap strip** | reuse `forgegen_core.heatmap` | Familiar from the v0.0.4 UI; surfaces stroke amplitude over time. |
| 5 | **Per-chapter mini-curves** (left nav, on hover/click) | slice the generated curve by chapter | Quick check per chapter — does this section feel right? |
| 6 | **Stats card** (right) | counts from the generated funscript | Total actions, duration, mean density, top mode. |

### Export actions

| Action | What it writes |
|---|---|
| **Save funscript** | Writes `<stem>.funscript` (or user-chosen path) via `videoflow.generate.export_funscript`. Optional metadata block (title, generated_by, chapter markers). |
| **Sidecar snapshot** | Writes the current sidecar to disk if it isn't already saved (forgegen's own per-chapter authoring is already persisted as part of Generate, but the user can opt out of saving). |
| **Open in FunscriptForge** | Saves the sidecar + funscript, then launches FunscriptForge with the project loaded for refinement. |
| **Re-run Generate** | Returns to the Generate tab with current selections intact. Exists so the Export tab isn't a dead end if the user wants to tweak. |

### Deferred to v1+

These are tempting but out of scope for v0:

- Render-to-video preview (waveform + animated dot showing the device
  position over time). Worth doing once forgeplayer's renderer is
  reusable.
- Multi-target export (`.funscript` + `.csv` + `.txt` simultaneously).
  Single-format export covers 95% of use today.
- Per-chapter export (split a long file into per-chapter
  `.funscript`s). Belongs in forgeassembler, which already does
  clip-level assembly.

### What Export does NOT do

- No curve editing — strokes / peaks / smoothing live in FunscriptForge.
- No re-analysis — that's a Setup-tab action.
- No batch export of multiple files — single-file flow only.

---

## Persistence

Per-chapter generation choices live as **AUTHORED fields** on each
chapter record in the sidecar, not in a separate forgegen project file.

```jsonc
{
  "chapters": [
    {
      "at_ms": 412000,
      "end_ms": 1180000,
      "name": "build",
      "intent": "build",
      "content_type": "music",   // ANALYTICAL — videoflow wrote this
      "style": "rhythmic",       // AUTHORED — forgegen wrote this
      "stroke_density": 2,       // AUTHORED — integer (1/2/4/8)
      "shape": "rise",           // MIXED — forgegen wrote this
      "auto_generated": false    // LATCH — user has authored this chapter
    }
  ]
}
```

This requires a small schema additive (in videoflow):

- New `style` field on Chapter — AUTHORED, locked enum
  `["", "auto", "rhythmic", "sensual", "intense", "chaotic"]`.
- New `stroke_density` field on Chapter — AUTHORED, integer with allowed
  values `1` (sensual) / `2` (canonical) / `4` (dense) / `8` (saturated).
  The integer is canonical; UI labels are display-only.
- `shape` — already locked in v0.0.5.

Forgegen writes through `videoflow.sidecar.write_sidecar(...,
mode="edit")`. Per-record `auto_generated: false` flips automatically
on edit, protecting the chapter's analysis fields from being clobbered
by a future re-run of `auto_chapter`.

The sidecar **is the forgegen project file**. There is no separate
`<stem>.forgegen.json`. Memory framing: the sidecar is the structural
database; a project is just a sidecar plus its source media.

---

## Defaults (when a chapter has no per-chapter choice)

The "Defaults" panel in the left nav holds the **global default
triplet**. When a chapter has no `style` / `stroke_density` / `shape`
field, the default applies for that chapter at generate time. Defaults
are not written to the sidecar at all — they live in forgegen's
in-memory app state for the session, optionally persisted to user
preferences if we want stickiness across files.

The "Apply to all unset" button copies the current defaults to every
chapter that doesn't have its own value, writing them as authored
fields.

---

## Escape hatch: FunscriptForge handoff

Both tabs surface a per-chapter **"Open in FunscriptForge"** button.
Clicking it:

1. Saves the current sidecar (so FF reads the latest state).
2. Launches FunscriptForge with the media + sidecar path + an initial
   chapter selection.

FunscriptForge picks up exactly where forgegen left off — same chapter
list, same phrases, same energy data. The user can then refine
chapter boundaries, override phrase modes, choose per-tone parameters,
or do anything else forgegen deliberately doesn't expose.

---

## What this doesn't change

- `videoflow.structural.auto_chapter` and the v2 sidecar schema. The
  three new authored fields (`style`, `stroke_density`) plus the
  already-locked `shape` are additive.
- `videoflow.generate.beats_to_curve` and `shape_curve`. Forgegen
  drives them per chapter; no engine changes.
- The "easy button" positioning. A user who doesn't touch the Generate
  tab can still hit `[Generate]` with all defaults and get a funscript.
  Per-chapter selection is opt-in nuance, not required friction.

---

## Open questions

1. **`auto` style resolution** — when `style="auto"` and no chapter
   override is set, which forgegen style each `content_type` should
   resolve to needs locking. Initial mapping to lock by data:
   `music → rhythmic`, `ambient → sensual`, `mixed → rhythmic`. Bench
   first; tune after.
2. **Live preview cost** — rendering the curve preview per chapter on
   every parameter change is cheap for small chapters, expensive for
   long ones. Consider a debounced re-render plus a "preview chapter
   only" toggle for long-form material.
3. **Defaults persistence** — should the global default triplet
   persist in user preferences across files, or always reset per
   project? Default reset feels safer.
4. **Re-analysis on Setup tab** — when the user re-runs `auto_chapter`
   from a hypothetical Setup tab, the field-level merge in
   `write_sidecar` preserves their per-chapter authored choices. Make
   sure the UI surfaces this clearly so users don't expect their
   choices to be wiped.
5. **Stroke-density type in schema** — store as integer (`1`/`2`/`4`/
   `8`) per the proposal, or as a string label (`sensual`/`canonical`/
   `dense`/`saturated`)? Integer is canonical and matches the existing
   CLI / `videoflow.generate` API; UI labels are display-only. Going
   integer unless lockup pressure says otherwise.

---

## Cross-references

- [`videoflow/docs/architecture/audio-structure-primitive.md`](https://github.com/liquid-releasing/videoflow/blob/main/docs/architecture/audio-structure-primitive.md) — sidecar schema, field categories, merge contract.
- `videoflow.sidecar.write_sidecar(mode="edit")` — the write API forgegen calls when the user edits a chapter.
- `videoflow.phrases.classify_phrases` — already produces the phrase records the Analyze tab visualises.
- `forgegen/architecture/VALUE_PROP.md` — the easy-button positioning this design preserves.
- `forgegen/generation_spec/easybutton_tab.md` — earlier sketch of the easy-button flow; this doc supersedes for the PySide6 shell.
