# Canonical-Emit Pattern — Applied at Three Levels

> The architectural principle that holds the forge family together:
> emit the canonical thing once; downstream tools consume it without
> recomputing or reimplementing. This doc captures how it applies at
> three increasingly meta levels in the system.

## The principle (briefly)

> *Generators produce canonical artifacts. Transforms apply downstream.
> Don't duplicate computation. Don't fork representations.*

When a tool produces an output, that output is the **canonical** form
for everything downstream. No tool should re-derive what a previous
tool already computed; instead, every tool reads the canonical artifact
and applies its own concern on top.

This is the architectural counter-pattern to "every tool does
everything itself" — the family-of-tools approach scales because each
tool focuses, contributes, and shares.

## Level 1 — Canonical artifact (data)

**Example: `track.analysis.json`** (per `analysis-schema.md`).

forgegen runs Layer 1 audio analysis + Layer 2 structural inference +
Layer 3 event proposals once. Persists to `track.analysis.json`.
Every downstream tool reads the same file:

- forgevents reads it for its auto-finder (no recomputation)
- FunscriptForge Pro reads it to overlay phrases / events / modes on the curve UI
- ForgePlayer reads it to show beat heatmap during playback
- Future ML reads it to learn patterns from the corpus

If forgegen didn't persist, every consumer would have to redo the
20-second beat detection + spectral analysis pass on every load. Or
worse: each tool would implement its own slightly-different analysis
and produce inconsistent results.

The same logic applies to the funscript itself — it's the canonical
curve; transforms (halve, smooth, mode-shape) apply downstream rather
than being baked into multiple generators.

## Level 2 — Canonical functions (logic)

**Example: `videoflow.structural.propose_chapters()`**.

The *function* that produces chapter proposals lives in videoflow,
the engine library. Every tool that wants chapter proposals calls
this function — they don't roll their own:

- forgegen calls it during generation to populate `chapter_proposals[]`
- forgevents calls it when re-running analysis (audio changed, regenerate proposals)
- FF Pro calls it when importing a funscript that lacks `track.analysis.json`
- ForgeAssembler may call it when proposing chapter-aware clip composition

Same pure function, multiple callers. The function is exposed as both
Python API and CLI:

```python
from videoflow.structural import propose_chapters
proposals = propose_chapters(beat_map, video_features=None)
```

```bash
videoflow propose-chapters track.mp4 --output proposals.json
```

If we hadn't centralized the function, each tool would have its own
chapter-detection heuristic with subtle differences — proposal output
wouldn't match between tools, and the artist would see different
suggestions in forgegen vs forgevents. Canonical-functions prevents
that fork.

## Level 3 — Canonical UI components (widgets)

**Example: `forgemoment.MomentPicker`** and the family of proposal review
widgets in forgemoment.

The Qt widget that lets a user pick an exact moment (with audio +
video + waveform + frame-step) is built once in forgemoment as a
library. Embedded by:

- forgevents (chapter boundary picking, event timestamp picking)
- FF Pro (chapter→phrase→pattern drill-down navigation)
- ForgeAssembler (clip-boundary picking)
- forgegen interim (one-off chapter edits before forgevents ships)

Same widget, four consumers. Companion review widgets
(`ChapterProposalReview`, `EventProposalReview`,
`BeatHeatmapOverlay`) follow the same pattern — built once, embedded
wherever proposals or analysis overlays need display.

If we hadn't extracted the widget, each tool would build its own
millisecond-accurate scrubber + frame-step + waveform display. That's
weeks of UX work duplicated across four products, with subtle UX
inconsistencies between them.

## Why this matters: the compounding payoff

Each level builds on the level below it:

```
Level 3 — UI widgets (forgemoment)
            ▲
            │ embedded once, every tool gets the picker
            │
Level 2 — Functions (videoflow.structural.*)
            ▲
            │ implemented once, every tool gets the proposer
            │
Level 1 — Artifacts (track.analysis.json)
            ▲
            │ persisted once, every tool reads the same data
            │
Source media (audio + video)
```

A new product joining the family — say, a future `forgemixer` — gets
all three levels for free:

- Reads `track.analysis.json` for context (Level 1)
- Calls `videoflow.structural.*` for any analysis it needs (Level 2)
- Embeds `forgemoment.MomentPicker` if it needs moment-picking UX (Level 3)

The new product writes its own *unique* logic and UI — what makes it
distinct — and inherits everything else.

This is the *cross-product architectural alignment* the artist named
on 2026-04-26. It compounds: every shared piece reduces the cost of
the next product's development, increases consistency across the
family, and makes the corpus more valuable as training data because
every tool sees data through the same lens.

## What goes where (rules of thumb)

When designing a new feature:

| Question | If yes → |
|---|---|
| Will multiple products read this output? | Persist as canonical artifact (Level 1) |
| Will multiple products run this computation? | Move to videoflow as a shared function (Level 2) |
| Will multiple products show this in their UI? | Build as a forgemoment widget (Level 3) |
| Only one product needs it? | Keep it product-internal (don't over-share) |

The trap to avoid is **premature canonicalization** — sharing
something that turns out to need product-specific divergence later.
Heuristic: share when the second consumer arrives, not in anticipation
of one.

## Cross-references

- Analysis layers (the substrate model): `analysis-layers.md`
- Analysis schema (the canonical JSON): `analysis-schema.md`
- forgemoment library (Level 3 home, planned, private memory): `project_forgemoment_planned.md`
- forgevents (consumer of all three levels, planned, private memory): `project_forgevents_planned.md`
- Floor + Ceiling product positioning (private memory): `feedback_forgegen_floor_and_ceiling.md`
- Original canonical-emit principle (private memory): `feedback_forgegen_canonical_emit.md` — applied to density transforms (FF's halve/double); this doc generalises to three levels
