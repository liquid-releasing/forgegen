# ForgeGen v2 — Handoff Instructions

This is a high-fidelity HTML prototype meant for engineering reference.
It's a React app (inline JSX, no build step) that exercises every
screen + interaction in the v2 design. Use it as the spec when
implementing against the Tauri + React codebase in `forgegen/`.

---

## Files

```
ForgeGen_v2.html                          ← entry point
ForgeGen_v2/
  ├── tokens.css                          ← design tokens (colors / type / spacing / motion)
  ├── data.js                             ← sample project — real BBB funscript data
  ├── primitives.jsx                      ← Button, Pill, Card, Icon, Slider, Segmented
  ├── tweaks-panel.jsx                    ← Tweaks panel scaffold
  ├── AppShell.jsx                        ← TopBar / Pathway / AcceptBar / StatusBar / Toast
  ├── FunscriptChart.jsx                  ← the headline chart (Output stage)
  ├── ProjectTab.jsx                      ← Stage 01
  ├── AnalysisTab.jsx                     ← Stage 02
  ├── RecipesTab.jsx                      ← Stage 03 — the v2 headline
  ├── GenerateTab.jsx                     ← Stage 04
  └── OutputTab.jsx                       ← Stage 05
ForgeGen_v2_UserGuide.md                  ← end-user walkthrough
ForgeGen_v2_Handoff.md                    ← THIS FILE
```

---

## Running locally

The HTML file is fully self-contained — open it in a browser. It uses:

- React 18.3.1 (UMD)
- Babel standalone for inline JSX transpilation
- Lucide 0.469.0 for icons
- Inter + JetBrains Mono via Google Fonts CDN

No build step. No npm install. Just open `ForgeGen_v2.html` directly.

> **Important.** Babel-standalone in-browser transpilation is for
> design-review only. Do not ship this to users. The Tauri build
> precompiles the JSX.

---

## Implementation notes for the Tauri+React target

### Five-stage pathway

The current Tauri codebase (`forgegen/tauri/src/`) has four tabs:
Project / Analysis / Generate / Output. **v2 introduces a new Recipes
stage between Analysis and Generate.** The split is conceptual:

- **Analysis** stays read-only. It reviews the auto-chapter output.
- **Recipes** is where the user decides *what* influences each chapter
  (the new influence mix) and *how* that becomes strokes (the recipe
  knobs that used to live on the Generate tab).
- **Generate** becomes a pure forge-run view — no authoring, just the
  animation + plan summary.

Refactor `forgegen/tauri/src/tabs/` accordingly:

```
src/tabs/
  Project.jsx     ← unchanged surface, new sample-loader CTA
  Analysis.jsx    ← unchanged
  Recipes.jsx     ← NEW (extract authoring out of Generate.jsx)
  Generate.jsx    ← stripped to ForgeStage + ChapterSweep + PlanGrid
  Output.jsx      ← + ExportGrid + DestinationsGrid
```

### Influence mix data shape

The novel piece. Add a per-chapter `influenceMix` array to the project
object, parallel to `recipes`:

```ts
type InfluenceMix = {
  beat:    number;  // 0–100
  bass:    number;
  voice:   number;
  ambient: number;
  // Reserved for future analyzers (v0.5 / v0.6):
  // video?:   number;
  // focus?:   number;
};
```

Persist alongside `recipes` in `.recipes.json` (or the new
`.forge.json` metadata sidecar — see below):

```json
{
  "schema": "forgegen/v2",
  "chapters": [
    { "id": "ch-1", "recipe": { ... }, "influence": { "beat": 20, "bass": 25, "voice": 55, "ambient": 65 } }
  ]
}
```

### "Suggested" influence mix

The polygon's "Suggested" button calls `suggestInfluence(project, i)`,
which seeds the mix from analyzer KPIs:

- Energetic chapters (`contentType: "action" | "climax"`) lean Beat + Bass
- Ambient chapters (`"intro" | "outro"`) lean Voice + Ambient
- Build / edge chapters land in the middle
- Default falls back to a linear function of `energy_mean`

Port this heuristic into `forgegen_core/` as a deterministic function
the analyzer can pre-compute and ship in `.chapters.json`. Users see a
sensible default on first paint and tune from there.

### Recipe knobs

Unchanged from v1 — `{ style, density, shape, emphasize }`. The set of
allowed values is the same:

- `style: "full" | "percussive"`
- `density: 1 | 2 | 4 | 8`
- `shape: "flat" | "rise" | "fall" | "auto"`
- `emphasize: boolean`

Plus the bulk-recipe defaults and the device target.

### Forge metadata sidecar (new)

The fifth export target is **forge metadata** (`.forge.json`). It's the
single sidecar that lets ForgeGen reproduce a run exactly:

```json
{
  "schema": "forgegen/v2",
  "generated_at": "2026-05-19T12:34:56Z",
  "engine": "forgegen 0.3-alpha · videoflow 0.4.1",
  "source": {
    "path": "/media/big_buck_bunny_1080p_h264.mov",
    "duration_ms": 595500,
    "md5_partial": "9b1e…f72c"
  },
  "chapters_sidecar": "<inline copy of .chapters.json>",
  "target_device": "keon",
  "bulk_recipe": { ... },
  "per_chapter": [
    { "chapter_id": "ch-1", "recipe": { ... }, "influence": { ... } },
    ...
  ],
  "outputs": [
    { "kind": "funscript",  "path": "big_buck_bunny.funscript",  "actions": 2211 },
    { "kind": "haptic",     "path": "big_buck_bunny.haptic.json","events":  1548 },
    { "kind": "beat_track", "path": "big_buck_bunny.beat.wav",   "duration_ms": 595500 }
  ]
}
```

Implementing this enables: deterministic re-runs, share-a-recipe
workflows, archival, downstream tools (FunscriptForge can show
"forged with these influences").

### Mega cloud destination

The Output tab's destinations grid includes Local disk + Mega cloud.
Mega is currently mocked — the connection state, email, and storage
bar are all hard-coded.

To make it real:

1. Use [MEGAcmd](https://mega.io/cmd) or megajs (Node).
2. Mock UI calls `megaAccount.connect(email, password)` / wraps OAuth.
3. On export, zip the selected targets to a single
   `<projectname>.forge.zip` and upload to `account.folder`.
4. Persist `megaAccount` (without password) in the Tauri keychain;
   re-prompt for password on each session, or use Mega's session
   token if it supports refresh.

Disk destination is straightforward — Tauri's `dialog.save` or
`fs.writeFile`, plus `dirname()` configuration.

### Icon component

`primitives.jsx` ships a React-safe `Icon` component that reads from
`window.lucide.icons` and renders the SVG children directly via React.

Do **not** use `lucide.createIcons()` — it mutates the DOM under
React's feet and crashes during the forge animation (high-frequency
re-renders). The React-rendered approach is the only safe pattern.

### Undo / redo

`App.jsx` snapshots `{ recipes, influenceMix, bulkRecipe, targetId }`
on every authoring change. Keep this scope tight in the production
build — don't snapshot the project itself (chapters are upstream and
shouldn't change here).

History capacity is 50. ⌘Z / ⌘⇧Z handlers live in the global keydown
listener.

### Auto-zoom playhead

When `autoZoom` is on, the Output tab's `useEffect` watches `playheadMs`
and snaps the chart zoom to whatever chapter the playhead is currently
inside. To prevent fighting with user-driven zoom: only auto-zoom when
the current zoom doesn't already match the playhead's chapter.

Disable auto-zoom when the user manually clicks a chapter ribbon to
zoom — give them the override moment.

---

## Visual design

Tokens live in `tokens.css`. Key surfaces:

- `--bg: #0e1117` — editor backdrop
- `--surface: #1a1d27` — primary cards
- `--surface-2: #12151e` — recessed panels
- `--accent: #ff4b4b` — FunscriptForge family red
- `--accent-warm: #ff8c42` — "forge fire" secondary (used on Generate)
- `--chart-v0..v6` — perceptual velocity gradient (matches FFP)
- `--ch-1..ch-7` — per-chapter palette (hue-stable across stages)
- `--mode-break/tease/slow/steady/fast/edging/chaotic` — phrase colors

Type:

- Sans: Inter 400/500/600/700/800
- Mono: JetBrains Mono 400/500/600

Motion: 100 / 180 / 320 ms (fast / base / slow) with standard +
emphasized easing curves. The forge animation also uses a beat-locked
pulse at the project BPM.

---

## Known caveats / followups

1. **Mega is a UI mock.** No real upload. See "Mega cloud destination"
   above for the implementation path.
2. **Video motion / Focus zone influences are ghosted.** They appear
   in the polygon legend as "soon" tags but have no analyzer behind
   them. Wire them in once `forgegen_core` ships v0.5 (video motion)
   and v0.6 (focus zone) analyzers.
3. **Influence Suggestor is heuristic.** The `suggestInfluence` heuristic
   is good for "first-paint sensible default" but isn't ML — consider
   training a small model once you have enough user-corrected mixes
   logged.
4. **The forge animation is decorative.** In the real Tauri build, the
   per-stage progress should be wired to actual engine events from
   `forgegen_core` rather than the linear timer in this prototype.
5. **Tweaks panel is minimal.** Only Forged/Raw is exposed. Consider
   adding: heat-ribbon density visibility, beat-tick visibility,
   theme accent (red/cyan/amber) for users who want to differentiate
   ForgeGen from FunscriptForge in their menu bar.
6. **Sub-chapter editing is FunscriptForge's job.** Don't add it here.
   The handoff button is intentional — keep ForgeGen scoped to
   chapter-level decisions only.

---

## Questions / clarifications

Things worth talking through before the engineering pass:

- Should `.forge.json` be standalone or embedded in the funscript's
  `metadata.generated_from` field? Pro-standalone: easier to share /
  diff. Pro-embedded: one less file to manage.
- Influence mix UX — is the polygon clearer than vertical channel
  faders alone? The prototype shows both so engineers can A/B with
  real users.
- Mega vs other cloud destinations (Dropbox / iCloud / WebDAV)? If
  Mega is the only one, the "Destinations" section is overkill — make
  it a single toggle. If you want N providers, the cards stay.

---

*Handoff prepared 2026-05-19 · For: forgegen engineering*
