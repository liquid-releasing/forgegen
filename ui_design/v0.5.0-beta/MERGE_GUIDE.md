# Merging ForgeGen v3 into an existing v1/v2 codebase

You already have prior ForgeGen versions. v3 is **additive** — it inserts one new
pipeline stage (**Sources**) and threads a per-chapter `source` selection through the
existing stages. This file tells Claude Code exactly what changed so it merges the delta
instead of rebuilding.

> The files in this package are **design references** (HTML/JSX prototype + a React/TSX
> port in `react/`). Recreate the *delta* in your real codebase's patterns; don't copy the
> prototype wholesale over your v2.

---

## Paste-ready prompt for Claude Code

> I'm merging ForgeGen **v3** into my existing v2 app (React in Tauri). v3 adds **one new
> pipeline stage, "Sources,"** between Analysis and Recipes, plus a per-chapter `source`
> selection that the later stages read. Do NOT rebuild the app — apply only the delta below,
> matching my existing components/state patterns.
>
> Use `react/SourcesTab.tsx`, `react/sourceEngine.ts`, `react/types.ts`, and
> `react/sources.css` from this handoff as the reference for the new stage, and
> `README.md` for exact specs/tokens. Then make the changes in MERGE_GUIDE.md §"What
> changed" against my current files. After each file, show me a diff before writing.
> Keep my existing audio-only behavior intact when `videoAnalyzed` is false.

---

## What changed (v2 → v3), file by file

### NEW — `SourcesTab` (the whole stage)
The compare surface: source-mix ribbon, bulk bar, per-chapter compare cards
(audio vs video vs imported, each with a mini curve + confidence + rationale + select),
and a right-rail inspector. Reference: `react/SourcesTab.tsx`.

### NEW — source engine (was appended to `data.js`; ported in `react/sourceEngine.ts`)
Add these pure functions/constants:
`SOURCES`, `FG_SOURCE_CONF` (per-chapter confidence + rationale — replace with real
metrics), `buildVideoCandidate`, `buildImportedCandidate`, `suggestSources`,
`stitchSources`, `blendSeams`, `sourceMix`.

### App / root state (in the prototype: `ForgeGen_v3.html`)
Add state + derived values:
- `sources: SourceId[]` (per chapter), `videoAnalyzed`, `analyzing`, `analyzeProgress`,
  `imported`.
- derived: `suggested`, `candidates {audio,video,imported}`, `stitched` & `audioOnly`
  (`{actions, seams}` from `stitchSources`).
- Pipeline/stage list: insert `sources` **between `analysis` and `recipes`**; update the
  accept/next-stage map and any 1–N keyboard nav.
- Handlers: `setSource(i,s)`, `setAllSources(s)`, `useSuggestedSources()`,
  `handleAnalyzeVideo()` (runs the CV pass → sets `videoAnalyzed`, reseeds to suggested),
  `handleImport()`.
- Undo/redo snapshot: include `sources`.
- On Generate: build the output from `stitchSources(...)` (was: single audio track).

### `AppShell` (pathway/stages)
Insert the `sources` stage descriptor (label "Sources", icon `git-compare-arrows`,
between Analysis and Recipes). Renumber downstream stage eyebrows (Recipes=04,
Generate=05, Output=06).

### `ProjectTab`
Add two "Add another source" cards: **Analyze video motion** (opt-in CV pass) and
**Import a .funscript**. New props: `videoAnalyzed, analyzing, analyzeProgress, imported,
onAnalyzeVideo, onImport`.

### `RecipesTab`
- **Remove** "Video motion" from the future-influences list (it's a *source* now, not a
  radar leg).
- For chapters whose `source !== "audio"`, replace the influence radar with a greyed
  "Sourced from <Video/Imported>" notice + a CV-tracking readout (new `NonAudioSourceNotice`).
- Pass `sources` in; show a source icon per chapter in the chapter rail.

### `GenerateTab`
Make the plan source-aware: a source pill per chapter; for video/imported chapters show a
CV/imported readout instead of the influence bars. Mention seam count. New props:
`sources, seams`.

### `OutputTab`
Add a **Source** column to the per-chapter breakdown; add a source-mix summary row
("5 audio · 2 video · N seams blended"); stamp per-chapter `source` into the exported
metadata sidecar and the FunscriptForge handoff.

### Tweaks
The output A/B becomes **Multi-source** (the stitched selection) vs **Audio only**
(all-audio baseline), so the value of the video pass is visible.

---

## Production wiring (replace prototype mocks)
- `handleAnalyzeVideo` → Tauri command running **Funscript-Flow** on the video; ingest its
  `.funscript` into `candidates.video`.
- `handleImport` → Tauri file dialog → parse `.funscript` → `candidates.imported`.
- `FG_SOURCE_CONF` → real audio (beat/energy clarity) + video (CV tracking) confidence.
- `stitchSources`/`blendSeams` → your engine's real `--blend-seams`.
See `react/INTEGRATION.md` for code snippets.
