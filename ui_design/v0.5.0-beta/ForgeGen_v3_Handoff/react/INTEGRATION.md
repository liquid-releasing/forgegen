# ForgeGen v3 · Sources stage — React + Tauri components

Production-shaped port of the **Sources** stage (per-chapter audio↔video source
selection). Drop into a React/TypeScript app; styling is plain CSS layered on the
design tokens.

## Files
| File | What it is |
|---|---|
| `SourcesTab.tsx` | The stage UI — compare cards, source-mix ribbon, bulk bar, inspector. Controlled component. |
| `sourceEngine.ts` | Pure TS logic — candidate building, suggestion, **stitch + seam-blend**, mix counts, `SOURCES` metadata. |
| `types.ts` | Shared types (`SourceId`, `Action`, `Chapter`, `SourceConf`, …). |
| `sources.css` | All Sources-stage classes (`.fg-*`). |
| `tokens.css` | Design tokens (colors, type, spacing, motion). Import once, app-wide. |

## Dependencies
- `react` (18+)
- `lucide-react` — icons (`npm i lucide-react`)
Bundler must allow `import "./sources.css"` (Vite/Tauri default does).

## Wiring (parent owns the state — this component is controlled)
```tsx
import SourcesTab from "./SourcesTab";
import {
  buildVideoCandidate, buildImportedCandidate, suggestSources, stitchSources,
} from "./sourceEngine";
import type { SourceId, Candidates, ImportedTrack } from "./types";

const [sources, setSources] = useState<SourceId[]>(() => chapters.map(() => "audio"));
const [videoAnalyzed, setVideoAnalyzed] = useState(false);
const [analyzing, setAnalyzing] = useState(false);
const [analyzeProgress, setProgress] = useState(0);
const [imported, setImported] = useState<ImportedTrack | null>(null);
const [focusedIdx, setFocusedIdx] = useState(0);

const suggested = useMemo(() => suggestSources(conf), [conf]);

const candidates: Candidates = useMemo(() => ({
  audio: audioActions,                                  // your audio-synth output
  video: videoAnalyzed ? buildVideoCandidate(chapters, conf) : null,
  imported: imported?.actions ?? null,
}), [audioActions, videoAnalyzed, imported, chapters, conf]);

// On "Generate": stitch the chosen sources + blend seams →
const { actions, seams } = stitchSources(chapters, sources, candidates);

<SourcesTab
  chapters={chapters} durationMs={durationMs}
  candidates={candidates} conf={conf}
  sources={sources} suggested={suggested}
  videoAnalyzed={videoAnalyzed} analyzing={analyzing} analyzeProgress={analyzeProgress}
  imported={imported}
  focusedIdx={focusedIdx} onFocus={setFocusedIdx}
  onSelect={(i, s) => setSources(p => p.map((x, j) => j === i ? s : x))}
  onUseSuggested={() => setSources(suggested.map(s => (s === "video" && !videoAnalyzed) ? "audio" : s))}
  onSetAll={(s) => setSources(chapters.map(() => s))}
  onAnalyzeVideo={runVideoPass}     // see below
  onImport={pickFunscript}          // see below
/>
```

## Production hooks (replace the prototype mocks)
- **`onAnalyzeVideo`** — invoke a **Tauri command** that runs Funscript-Flow on the
  source video (Mode 1: run-as-a-tool, consume its `.funscript`). Stream progress to
  `analyzeProgress`; on done set `videoAnalyzed = true` and `setSources(suggested)`.
  Then drop `buildVideoCandidate` and feed the **real** ingested actions into
  `candidates.video`.
  ```ts
  import { invoke } from "@tauri-apps/api/core";
  const fs = await invoke<string>("analyze_video_motion", { path });
  // parse fs (funscript JSON) → Action[] → candidates.video
  ```
- **`onImport`** — open a file dialog (`@tauri-apps/plugin-dialog`), read the chosen
  `.funscript`, parse to `Action[]`, `setImported({ name, actions })`. Same ingest path
  as the video file.
- **`conf` (SourceConf[])** — replace the hand-authored sample values with real metrics:
  audio confidence from beat/energy clarity, video confidence from CV tracking quality
  (Funscript-Flow exposes per-segment confidence).
- **`stitchSources` / `blendSeams`** — wire to the engine's real `--blend-seams` seam
  logic if it differs from the prototype's linear crossover.

## Notes
- The component never mutates `sources` — the parent does, so undo/redo, persistence,
  and the Generate step all read one source of truth.
- Per-source color is passed via the CSS custom property `--src` (set inline from
  `SOURCES[id].color`); chapter color via `--ch`. No color logic lives in the CSS.
- Architecture rationale + build order: `architecture/VIDEO_VIA_EXTERNAL_GENERATOR.md`
  in the main repo.
