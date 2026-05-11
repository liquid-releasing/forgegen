---
title: forgegen Analysis tab — UI refinements before build
date: 2026-05-11
status: Resolves what to render vs what to drop, after grounding the original JSX against the actual videoflow sidecar shape
---

# Analysis tab — refinement decisions

The original Analysis tab JSX (`forge-ui-design/iterations/08-redesign/design_files/tab-Analysis.jsx`, 914 lines) was designed before videoflow's sidecar shape was locked. Some pieces it renders are backed by real data; others were synthesized from mock fields that don't exist in the actual pipeline.

This doc captures the 5 refinement decisions made 2026-05-11 so the React port draws against real data only — no synthetic placeholders dressed up as analysis output.

**Sidecar source of truth:** `videoflow/SIDECAR_GAP_VS_ITER09.md` and `videoflow/src/videoflow/sidecar.py` schema v2.0.

---

## Decisions (the 5 calls)

### 1. Waveform → beat-strength density bars (drop the synthetic continuous waveform)

The JSX's Audacity-style waveform comes from `waveformPath()` — a synthetic envelope generator for design time. videoflow's sidecar has no `envelope` field (the schema permits it but `videoflow.audio` doesn't compute one). Adding envelope sampling to videoflow is ~3-4h of work; rendering in browser via Web Audio API would create a §0 violation (data only in React, not in the sidecar where ForgeStream/FFP could reach it).

**Resolved:** render bar density from `energy.beat_map.strengths[]` everywhere the JSX uses `Waveform`. Same eye-grabbing visual shape (bars at varying heights), real data, no §0 violation, ships today.

If the bar-density rendering feels too sparse later, revisit by adding `energy.envelope` to videoflow (a single Tier-2 task in `SIDECAR_GAP_VS_ITER09.md`).

### 2. Chapter strip labels → drop Style/Tone, show contentType only

The JSX strip shows "Sensual · Music" / "Rhythmic · Music" — `styleSel` and `toneSel` are *Generate-tab inputs*, not analysis outputs. The user hasn't picked them when looking at Analysis. Showing them here blurs the read-only/authoring boundary that the addendum's "outputs grow, editors don't" stance wants kept clean.

**Resolved:** chapter strip shows `chapter.name` (or generated label) + `chapter.content_type` only. No Style, no Tone, no "auto-suggested" pre-fill. Analysis is read-only; Generate is where authoring happens.

### 3. KPI strip → pre-generation stats (drop the PRE vs POST comparisons)

The JSX shows "Actions: 1898 ← 2183, −285 dropped" with strikethrough comparisons. There IS no "post" at the Analysis stage — the funscript hasn't been generated yet. These are Device-tab or Export-tab metrics being shown one step too early.

**Resolved:** Analysis-stage KPIs only:

| KPI | Source |
|---|---|
| Chapters | `len(sidecar.chapters)` |
| Phrases | `len(sidecar.phrases)` |
| Total beats | `len(sidecar.energy.beat_map.times_ms)` |
| Downbeats | `sum(sidecar.energy.beat_map.is_downbeat)` |
| Avg BPM | mean of `sidecar.energy.per_chapter[i].bpm` weighted by chapter duration |
| BPM range | min/max of `sidecar.energy.per_chapter[i].bpm` |
| Avg confidence | mean of `sidecar.chapters[i].confidence` |

No strikethroughs, no "before/after." Generate/Device tabs get their own KPI strips with comparison stats.

### 4. Drop `_MODE_FROM_TAG` mapping table

JSX lines 50-56 map arbitrary tags (`ambient`, `lazy`, `plateau`, etc.) to phrase modes because the mock data carries tags, not modes. The real `videoflow.phrases.classify_phrases()` outputs `phrases[i].mode` directly with the same closed enum (`tease/steady/edging/break/fast/slow`).

**Resolved:** drop the mapping table. Consume `phrases[i].mode` straight from the sidecar.

### 5. Confidence → overlay in forgegen, full card lands in FFP later

Per `videoflow/sidecar.py` validation, every chapter and phrase carries `confidence: 0.0-1.0` plus `evidence: str`. The JSX shows it as the 5th category card.

The problem in forgegen: low confidence implies a verb (re-cut chapter, override content_type, fix the analyzer's mistake) — but forgegen has no editor surfaces per the addendum. The card surfaces information without a corresponding action.

**Resolved for forgegen v0:**
- **Drop the standalone Confidence card.** 4 cards remain: Structure / Phrases / Energy / Beats.
- **Overlay treatment:**
  - Dim low-confidence chapters in the Structure ribbon (opacity scales with `confidence`)
  - ⚠ marker in the chapter list rail next to chapters with `confidence < 0.85`
  - Thin footer at page bottom: "Last analyzed by `provenance[-1].writer` `provenance[-1].version` · `provenance[-1].timestamp`"
- **FFP carry-forward:** when FFP's Analysis tab gets built, Confidence reclaims a standalone card *there* because FFP has the verbs (chapter editor, content_type override, boundary scrubber). The same overlay treatment can stay; the card adds drilldown for users who want to fix low-confidence regions.

---

## Card-by-card data spec

Each card now binds to real sidecar fields. The JSX file structure carries over; the data sources change. Components that need rewriting are flagged.

### Card 1 — Structure

**Headline:** "How is the file divided?"

**Renders:**
- Beat-strength density bars across full timeline (from `energy.beat_map.strengths`, colored uniformly)
- Content-type ribbon (chapters colored by `chapter.content_type`)
- Type counts (% time by content_type)
- Avg chapter duration

**Sidecar bindings:**
- `chapters[i].at_ms / end_ms / content_type` → ribbon segments
- `chapters[i].confidence` → opacity (overlay per decision #5)
- `energy.beat_map.strengths` → density bars

**Drops:** synthetic waveform.

### Card 2 — Phrases

**Headline:** "What happens within each section?"

**Renders:**
- Beat-strength density bars (same as Structure — establish visual continuity)
- Phrase ribbon colored by mode (6 modes: tease/steady/edging/break/fast/slow)
- Mode % distribution legend
- Per-chapter phrase count

**Sidecar bindings:**
- `phrases[i].at_ms / end_ms / mode` → ribbon segments and colors
- `phrases[i].chapter_idx` → per-chapter grouping

**Drops:** synthetic waveform; `_MODE_FROM_TAG` mapping table.

### Card 3 — Energy

**Headline:** "How does the audio breathe?"

**Renders:**
- Beat-strength bar chart (drop the continuous green-curve render — replace with bars from real per-beat strengths)
- File-wide percentile readout (p5/p25/p50/p75/p95)
- "Same axis per chapter in detail card" footer (per-chapter percentiles render in the per-chapter focus row at section 7)

**Sidecar bindings:**
- `energy.beat_map.strengths` → bars
- `energy.percentiles.p5..p95` → readout

**Drops:** synthetic energy curve from `phrase.ampSpan` (no such field).

### Card 4 — Beats

**Headline:** "What is the rhythmic foundation?"

**Renders:**
- Heat strip: beat density binned to ~5s windows (count of beats × mean strength)
- Per-chapter BPM bars (vertical bars showing each chapter's BPM, height proportional)
- Stats row: Total beats / BPM range / **Downbeats** (real, not mocked — per the 2026-05-11 sidecar fix)

**Sidecar bindings:**
- `energy.beat_map.times_ms` → bin into 5s windows for heat strip
- `energy.beat_map.strengths` → weight the heat strip
- `energy.beat_map.is_downbeat` → downbeats count
- `energy.per_chapter[i].bpm` → per-chapter BPM bars

**Drops:** synthetic BPM-from-phrase mock; the rainbow hue gradient (decorative, can keep as styling choice).

### ~~Card 5 — Confidence~~ → overlay

Removed per decision #5. See overlay locations above (Structure ribbon dim, chapter list ⚠, footer).

---

## Per-chapter focus row (section 7 of the JSX)

Three columns:

### Left — Chapter list rail

- One button per chapter
- Title + duration + phrase count
- ⚠ badge for `chapter.confidence < 0.85` (overlay per decision #5)
- **Drop the Style label chip** (decision #2) — Analysis is read-only

### Middle — Phrase detail

- Beat-strength density bars (from `energy.beat_map.strengths` filtered to this chapter's range)
- Phrase boxes overlaid showing `phrases[i].mode` for phrases in this chapter
- Phrase mode strip below

### Right — Stats card

| Stat | Source |
|---|---|
| Phrases | `len([p for p in phrases if p.chapter_idx == i])` |
| BPM | `energy.per_chapter[i].bpm` |
| Content type | `chapters[i].content_type` |
| Dominant mode | mode-frequency over phrases in this chapter |
| Confidence | `chapters[i].confidence` |
| Beat strength sparkline | filter `energy.beat_map.strengths` to this chapter's beat indices |

---

## Bottom-of-page widgets (sections 8 of the JSX)

### Beat energy chart (always visible)

- Bars from `energy.beat_map.strengths`
- Each bar colored by the mode of the phrase containing that beat (join `phrases[i]` with `beat_map.times_ms`)

### Beat map (always visible)

- Heat strip binned to ~5s windows
- Same source as the Beats card heat strip — could share the component

---

## What this leaves on the FFP roadmap

When FFP's Analysis tab is built:

- **Confidence becomes a standalone card again** with full drilldown:
  - Per-chapter color strip with opacity = confidence
  - Per-chapter list with `evidence` strings (the analyzer's reasoning)
  - "Re-cut chapter" / "Override content_type" / "Open in editor" actions
  - Footer with `provenance` history (not just last entry)
- **Style/Tone editing lives on the Generate-equivalent tab in FFP** (might be merged with Analysis there since FFP is editor-heavy)
- **The KPI strip CAN show PRE vs POST comparisons in FFP** since FFP works with already-generated funscripts and lets users iterate

These don't block forgegen; document and move on.

---

## Cross-references

- `forgegen/REFACTOR_TO_TAURI_REACT.md` — pipeline order; Generate tab specs include the per-chapter "Emphasize beats" toggle
- `forgegen/BRIDGE_DESIGN.md` — how the React Analysis tab gets sidecar data (`autoChapter()` → reads `<stem>.chapters.json`)
- `videoflow/SIDECAR_GAP_VS_ITER09.md` — which sidecar fields are guaranteed present today
- Original JSX: `forge-ui-design/iterations/08-redesign/design_files/tab-Analysis.jsx`
- `videoflow/src/videoflow/sidecar.py` — schema validation, field categorization
- `videoflow/src/videoflow/structural.py` — `_build_energy()` produces the energy block (now with `is_downbeat`)
