---
title: forgegen end-state — what carries to the Tauri+React rewrite
date: 2026-05-11
status: Captures the architectural thinking from the PySide6 era so the React rewrite inherits it
---

# forgegen — end of PySide6, start of Tauri+React

The PySide6 forgegen codebase is being scrapped per the 2026-05-10 stack-unification decision (see `forge-ui-design/ARCHITECTURE_ADDENDUM_2026_05.md`). Before the code goes, this doc captures what was learned. **The architectural thinking is framework-agnostic; only the Qt/PySide6 implementation gets discarded.**

This doc is the contract the React rewrite must honor. If a concept here isn't represented in the new app, that's a regression.

---

## Carry forward — framework-agnostic decisions

These concepts apply to the React rewrite as-is. Cited file paths are in `forgegen/architecture/` and `forgegen/docs/architecture/` unless noted otherwise.

### Pipeline shape

| Concept | One-line | Source |
|---|---|---|
| **Analyze → Generate → Export** | Linear three-tab workflow that splits decision classes: read-only review → per-chapter authoring → device-agnostic target selection | `architecture/ANALYZE_TAB.md` |
| **Devices come last** | User picks Style/Density/Shape per-chapter once (device-agnostic intent); device selection (funscript vs bHaptics vs e-stim vs shaker) deferred to Export | `architecture/HAPTICS_GENERATOR_FAMILY.md`, Pathway UI pillar 5 |
| **Multi-target haptics generator family** | One sidecar source of truth (`<stem>.chapters.json`); independent renderers (funscript, shaker, bHaptics, e-stim) read the same intent and emit their format | `architecture/HAPTICS_GENERATOR_FAMILY.md` (rollout: shaker v0.6, bHaptics v0.7, e-stim v0.8) |

### Analytical positioning

| Concept | One-line | Source |
|---|---|---|
| **Depth vs PythonDancer** | forgegen surfaces five dimensions PythonDancer doesn't: chapter ribbon, phrase ribbon (6 modes), per-beat energy + density heatmap, per-chapter BPM, per-chapter percentiles | `architecture/ANALYZE_TAB.md` lines 85-108, 177-247 |
| **Chapters as the natural unit for dynamics analysis** | Per-chapter IQR / velocity / BPM / normalization, not whole-file. The "alive vs flat" question is per-chapter | `architecture/funscript-quality-characteristics.md` lines 113-149, `chapter-composition.md` |
| **Six quality dimensions** | (1) distribution shape, (2) velocity & stroke amplitude, (3) structural shape, (4) rhythmic alignment, (5) coherence with content, (6) authorial intent. Dimensions 1-4 are forgegen's; 5-6 are FunscriptForge's | `architecture/funscript-quality-characteristics.md` |
| **Chapter intent vocabulary** | Seven intents — intro, build, sustain, edge, climax, recover, outro — each carries amplitude/velocity/density/centre/mode-bias mappings | `architecture/chapter-composition.md` |
| **Chapters vs Events distinction** | Chapters = ~5–15 min durational blocks (boundary off-by-seconds OK). Events = sparse millisecond-precision markers. Same UI tool but two editing modes | `docs/architecture/chapters-vs-events.md` |

### Pathway UI — the design language

The five pillars from `forge-ui-design/page_ui/pathway_ui.md` apply to forgegen verbatim:

1. **Shell consistency** — apps subtract affordances, don't add them
2. **The path** — tab bar as visible ordered sequence
3. **Suggested authoring** — analysis pre-fills, action panel is exception-driven
4. **Graduated complexity** — three tiers (default / suggested / authored) serve three users at once
5. **Devices come last** — structural intent in Generate, device pick in Export

forgegen's React rewrite must enforce these at the component level.

### Beat detection architecture

| Concept | One-line | Source |
|---|---|---|
| **PLP for long-form stability** | Use Perceptual Linear Prediction, NOT librosa's standard `beat_track` (which drifts on long files) | `docs/architecture/beats.md` |
| **Sub-beat density 1/2/4/8** | Density extends from half/full to 1/2/4/8 actions per beat | `docs/architecture/beats.md` |
| **Per-chapter source selection** | Percussive vs full mix, chosen per-chapter (designed, not yet shipped — see Open Questions) | `docs/architecture/beats.md` lines 68-73 |
| **Multi-band beats (v0.6+)** | Low/mid/high frequency routing to body regions | `docs/architecture/beats.md` |

### Sidecar architecture

| Concept | One-line | Source |
|---|---|---|
| **Sidecar fragments / block composition** | `<stem>.chapters.json` is the project file; fragments are portable compositions of typed blocks (chapter / phrase / mode-recipe / beat-lock / amplitude / constraint / metadata) | `videoflow/docs/architecture/sidecar-fragment.md` |
| **Field-level merge with provenance** | ANALYTICAL/AUTHORED/MIXED/STRUCTURAL/LATCH categorization; auto_generated latch protects user data; append-only provenance log | `videoflow/src/videoflow/sidecar.py` (already implemented) |

### Cross-product alignment

| Concept | One-line | Source |
|---|---|---|
| **Canonical-emit at three levels** | (1) canonical artifacts (`track.analysis.json`), (2) canonical functions (`videoflow.structural.propose_chapters`), (3) canonical UI components (`forge-reusable-ui`). Built once, consumed by many | `docs/architecture/canonical-emit-pattern.md` |
| **Track B benchmark methodology** | Per-track `pos_stats`, `in_40_60_band_pct`, IQR, range-5-95. v1 result: chapter-aware analysis improves IQR universally (victoria +4, ipzz125 +11, pigeon +13) | `architecture/benchmarks/README.md`, `architecture/benchmarks/2026-05-04_track_b_results.md` |

---

## Scrap — PySide6-specific, do not carry

- Retired legacy UI code under `forgegen/panels/` (removed from `main`; historical branch only)
- Qt MVC signal/slot wiring
- Retired `app.py` baseline (historical branch only)
- Qt timeline widget implementations (use forge-reusable-ui's Charts components in React instead)
- PyInstaller bundle strategy (`ForgeGen.spec`) — Tauri replaces this
- `forgegen_core/` UI-bound bits — keep only the parts that are pure analysis/business logic if any survive; most of this is being replaced by `videoflow` calls anyway

---

## Open questions — unresolved before the React rewrite reaches affected scope

### Critical-path before v0.4+

1. **FunscriptForge handoff protocol** — file path? API call? subprocess launch? Tauri custom protocol handler? Blocks "Open in FFP" buttons. *Source: `architecture/ARCHITECTURE.md` line 299, `ANALYZE_TAB.md` line 490, `ROADMAP.md` line 32.*
2. **Privacy model for the LLM layer** — adult content cannot go to cloud APIs. Local Ollama as default? This shapes the entire LLM architecture (v0.6). *Source: `ARCHITECTURE.md` lines 126-128, ROADMAP gap #3.*
3. **Content-specific ROI detection for video path** — YOLO/MediaPipe are general-purpose; adult content needs specialized detection. No model specified. *Source: `ARCHITECTURE.md` line 297, ROADMAP gap #4.*
4. **VR / 360 video support** — completely absent from spec. FunGen targets POV VR; if we forget VR we fail to replace FunGen. *Source: ROADMAP gap #2.*

### Tactical / per-tab

5. **Per-chapter source selection** — UI dropdown for percussive/full/mixed designed but not landed; v0.0.5 promotion item once chapters ship. *Source: `docs/architecture/beats.md` lines 68-73.*
6. **Bar-level vs energy-contour phrases** — bar-level (4/8/16 beat units snapped to downbeats) more musically meaningful but needs corpus validation. *Source: `docs/architecture/beats.md` lines 142-150.*
7. **Within-chapter centre drift** — gold standards don't centre-drift; default no, but not locked. *Source: `chapter-composition.md` lines 261-268.*
8. **Boundary smoothing strategy** — linear cross-fade vs instant switch at chapter boundaries; not measured yet. *Source: `chapter-composition.md` line 261.*
9. **Stitching seam quality for chapter-aware analysis** — concatenate-drop-overlap vs crossfade-beats; v1 default is concatenation. *Source: `LONG_FORM_SCALING.md` lines 42-50.*
10. **Stroke density sidecar field** — integer (1/2/4/8) vs string label (sensual/canonical/dense/saturated). Proposal: integer canonical, UI labels display-only. *Source: `ANALYZE_TAB.md` lines 572-575.*

### Benchmarks / future

11. **Velocity + rhythmic-alignment benchmarking** — dimensions 2 & 4 known-important but not yet bench-measured. *Source: `funscript-quality-characteristics.md` lines 58-178.*
12. **Auto-chapter threshold (5 min)** — decided, queued for v0.5 implementation. *Source: `chapter-composition.md` lines 154-176.*
13. **Distribution / installer model** — Tauri answers this for the React rewrite (Windows installer, cross-platform). Document the choice. *Source: ROADMAP gap #6.*
14. **ML training data sourcing (v2+)** — 500-2000 labeled expert scripts needed; spec doesn't say where they come from. Content/community problem. *Source: `ARCHITECTURE.md` lines 241-249.*
15. **"Easy button" UX scope tension** — 30-second demo vs full Analyze→Generate→Export workflow. Pathway UI's graduated complexity supports both, but the default landing state needs a deliberate design call. *Source: ROADMAP gap #8.*

---

## Migration order for the React rewrite

The pipeline is linear. Build it left-to-right; each tab's data feeds the next.

```
Project → Analysis → Generate → Device → Export
```

Per the addendum's "outputs grow, editors don't" rule (§2 of `ARCHITECTURE_ADDENDUM_2026_05.md`), forgegen has **no** Edit / Stim / Multi-axis / Events / Haptics / Chapters / Catalog tabs. Those live in FunscriptForge Pro.

Order of build:

1. **Tauri+Vite+React shell** — AppShell with TopBar, TabStrip (5 tabs), StatusBar, AcceptBar — using forge-reusable-ui carve-out
2. **Project tab** — file picker, recent projects, device selection (gates Analysis content)
3. **Tauri ↔ videoflow bridge** — resolve before Analysis (see addendum §8)
4. **Analysis tab** — *but first refine the Analysis UI choices* — some of the original Analysis UI was speculative (e.g., beat patterns category cards). Identify which visualizations are validated by available videoflow data vs which assume data we haven't generated yet. **Refine before building.**
5. **Generate tab** — per-chapter Style/Density/Shape authoring, live preview chart. **Includes the per-chapter "Emphasize beats" toggle** (decided 2026-05-11) — when on, the generator applies stronger accents at downbeat moments using the persisted `energy.beat_map.is_downbeat[]` data
6. **Device tab** — original vs device-profiled script, profile cards, velocity-cap warning
7. **Export tab** — final export options, BPM-tier-colored preview, completed-transforms table, folder layout, forge log

---

## Cross-references

- `forge-ui-design/ARCHITECTURE_ADDENDUM_2026_05.md` — the 2026-05 stack-unification decision
- `forge-ui-design/REUSABLE_INVENTORY.md` — what comes from forge-reusable-ui
- `forgegen/BRIDGE_DESIGN.md` — Tauri ↔ videoflow bridge protocol
- `videoflow/SIDECAR_GAP_VS_ITER09.md` — what videoflow needs to add for §0 compliance (downbeats + pattern catalog now landed)
- `forge-ui-design/iterations/09-.../docs/implementation_handoff.md` — backend spec (still authoritative for everything addendum doesn't supersede)
- `forge-ui-design/iterations/09-.../docs/architecture_feel.md` — strategic vision
