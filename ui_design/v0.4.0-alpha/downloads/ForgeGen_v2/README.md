# ForgeGen v2 — Design Handoff Bundle

Drop-in design package for ForgeGen v2.

## What's inside

| File / Folder              | What it is                                                                 |
|----------------------------|----------------------------------------------------------------------------|
| `ForgeGen_v2.html`         | The interactive prototype. Open in any modern browser — no build step.     |
| `ForgeGen_v2/`             | All component sources (JSX) + design tokens (CSS) + sample data.           |
| `USER_GUIDE.md`            | End-user walkthrough of all 5 stages.                                      |
| `HANDOFF.md`               | Engineering handoff: data shapes, refactor notes, known caveats.           |
| `README.md`                | This file.                                                                 |

## To view the prototype

Open `ForgeGen_v2.html` in Chrome / Edge / Safari / Firefox. That's it.

The prototype loads:
- React 18.3.1 (UMD)
- Babel-standalone for in-browser JSX
- Lucide 0.469 for icons
- Inter + JetBrains Mono via Google Fonts

…all from CDN. Works fully offline once the page has loaded once
(modern browsers cache CDN assets). For a fully bundled offline copy,
see the "Save as standalone HTML" skill.

## Quick tour

1. Open the file. You'll land on Stage 01 (Project) with an empty drop
   zone.
2. Click **Load sample project** (left rail or main pane). The Big
   Buck Bunny benchmark loads.
3. Hit **Accept and continue** at the bottom to advance through:
   - Stage 02 Analysis (review chapters / phrases / beats)
   - Stage 03 **Recipes** (the v2 headline — mix per-chapter influences)
   - Stage 04 Generate (watch the forge run with chapter sweep)
   - Stage 05 Output (inspect funscript + 5 export targets + Mega cloud)
4. Drag the polygon vertices on Stage 03 to see the mix change.

## Read order for engineering

1. `USER_GUIDE.md` — understand the surface area.
2. `HANDOFF.md` — implementation notes, data shapes, refactor map.
3. `ForgeGen_v2/RecipesTab.jsx` — the new stage (~820 lines).
4. `ForgeGen_v2/OutputTab.jsx` — the new export targets + destinations.
5. `ForgeGen_v2/AppShell.jsx` — pathway + accept bar + status bar.

---

*Liquid Releasing · MIT licensed · 2026-05-19*
