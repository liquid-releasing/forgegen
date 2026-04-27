# Chapters vs Events — What They Each Need

> Both are timeline overlays authored in the same tool (forgevents),
> but they have meaningfully different shapes, granularities, workflows,
> and failure modes. This doc captures those differences so the
> forgevents UX and forgegen's analysis output don't blur them together.

## Quick comparison

| Dimension | Chapters | Events |
|---|---|---|
| Granularity | ~5–15 minutes per chapter | ~milliseconds to seconds per event |
| Density | 7–25 per long-form track | dozens to hundreds per track |
| Shape | Durational (start_ms + end_ms) | Point or short-duration |
| Carries | Intent label (build / sustain / edge / climax / recover) | Type + parameters (edge_hold, accent, vocal_cue, etc.) |
| Failure tolerance | Off by 1–5 seconds = fine | Off by 50–200 ms = wrong feel |
| Auto-finder relies on | Energy / spectral / mode shifts at coarse scale | Onset peaks, pitch peaks, vocal events at fine scale |
| Editing scale | Whole-track timeline overview | Zoomed-in inspection of specific moments |
| Coverage | Tile the entire track end-to-end | Sparse — only at moments of interest |
| Function | Structural — sets the *narrative arc* | Nuance — adds the *texture* on top of the arc |

## What chapters need

**Chapters partition the track into intent-bearing segments.** Authoring
them is fundamentally about *boundary placement* and *labelling*.

### Authoring workflow

1. Listen / watch the whole track at moderate speed
2. Auto-finder proposes boundaries (energy drops, scene changes, mode shifts)
3. Review proposals at the timeline-overview level
4. Adjust boundaries — usually by seconds, occasionally by tens of seconds
5. Assign intent label per chapter (intro / build / sustain / edge / climax / recover / outro)
6. Assign per-chapter character + tone shape (the three-dropdown design)

### Failure tolerance

**Chapter boundaries can be off by 1–5 seconds without anyone noticing.**
The downstream curve generator smooths transitions across boundaries,
and the artist's intent at chapter scale is robust to small placement
errors. This means:

- Auto-finders can be coarse (10 ms onset precision is irrelevant)
- Manual editing can be done at low-zoom timeline view
- Hotkey workflows can step in 1–5 second increments

### Output shape

```json
{
  "chapters": [
    { "start_ms": 0, "end_ms": 90000, "intent": "intro",
      "character": "beat-driven", "tone": "rise" },
    { "start_ms": 90000, "end_ms": 480000, "intent": "build",
      "character": "beat-driven", "tone": "auto" },
    ...
  ]
}
```

Tiles the entire track end-to-end (every millisecond is in some chapter).

## What events need

**Events are point-in-time or short-duration markers that overlay
modulation on the curve.** Authoring is fundamentally about *exact
moment selection* and *type assignment*.

### Authoring workflow

1. Auto-finder proposes candidate events (onset peaks, sustained-energy
   peaks for edges, vocal cues, etc.)
2. Each candidate is reviewed *individually* — zoomed in on its moment
3. Adjust timestamp by milliseconds to land exactly right
4. Confirm or reject the type
5. Optionally add parameters (duration for edge_hold, intensity for accent)
6. Add new events from scratch in the same drilled-in mode

### Failure tolerance

**Events off by 50–200 ms feel wrong.** A vocal cue mistimed by 100 ms
lands on the wrong syllable; an accent off by 200 ms misses the hit.
This means:

- Auto-finders need millisecond precision (frame-accurate)
- Manual editing requires high-zoom timeline view
- Hotkey workflows need frame-step (single-frame increments) and audio
  scrubbing
- Snap helpers (snap to nearest onset, beat, zero-crossing) are
  essential for hitting the right moment

### Output shape

```json
{
  "events": [
    { "at_ms": 12000, "type": "edge_hold", "duration_ms": 3000,
      "confidence": 0.78 },
    { "at_ms": 24500, "type": "accent", "params": { "intensity": 0.92 } },
    { "at_ms": 31200, "type": "vocal_cue", "params": { "kind": "moan" } },
    ...
  ]
}
```

Sparse — only at moments of interest. Most of the track has no events.

## Shared UX (the bridge)

Despite the differences above, **both authoring flows need the same
foundation**:

- Frame-accurate side-by-side audio + video player
- HH:MM:SS.mmm timecode display
- Frame-step hotkeys
- Audio scrubbing (slow-playback for ear-finding)
- Auto-finder for candidates
- Hotkey-driven curate-don't-create workflow

That foundation is forgevents. Within it, the editing surface adapts:

- **Chapters mode**: timeline overview, low zoom, boundary handles between
  chapter blocks, intent dropdowns per block
- **Events mode**: zoomed-in moment view, point markers on a fine timeline,
  type palette + parameter editor
- **Toggle freely** — same project, same player, same auto-found analysis;
  the artist switches between editing modes as their attention shifts

## Implications for forgevents design

1. **Two editing modes, not two products.** Chapters and events share
   the player, the auto-finder, the file. Different views into the same
   timeline.
2. **Auto-finder runs once, classifies into both buckets.** The same
   onset / energy / spectral analysis pass produces chapter boundary
   candidates *and* event candidates; users curate them in their
   respective modes.
3. **Output is a single analysis-aware artifact**, with both `chapters`
   and `events` sections. Per the analysis-layer spec, this lives in
   funscript metadata or a paired `track.analysis.json`.
4. **Zoom-aware UI** — the timeline supports rapid switching between
   whole-track view (chapters) and ±2-second view (events). One
   keystroke.

## Implications for forgegen

When forgegen produces analysis JSON during generation, it should
populate **both** chapter proposals *and* event proposals — not just
chapters. The auto-finder logic for events overlaps significantly with
the structural detection used for chapter proposals; both come from the
same audio analysis pass and shouldn't be split into two pipelines.

Schema should reserve fields for both:

```json
{
  "structural": { "chapter_proposals": [...] },
  "event_proposals": [...]
}
```

Even if forgevents is the tool that ultimately curates and finalises,
forgegen does the heavy lifting of finding candidates from audio.

## Cross-references

- forgevents product spec (private memory): `project_forgevents_planned.md`
- Chapter composition: `chapter-composition.md`
- Architecture considerations: `architecture-considerations.md`
- Beat integration: `beats.md`
