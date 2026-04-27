# forgegen — Chapter-Based Haptic Narrative Composition

> Architectural guidance, locked 2026-04-26. The reframe of forgegen's purpose
> at the v0.0.4 milestone, validated against three quintessential gold-standard
> hand-crafted reference tracks.

## What forgegen actually is

forgegen is **not** an "audio-to-funscript converter." It is a **multi-hour
structured haptic narrative composer**. The structural unit is the **chapter**;
each chapter carries an **intent** that biases generation parameters within
its time range.

The name is misleading on purpose: we generate, but what we generate is a
*narrative*, not a *file*.

## Why this reframe (the gold-standard evidence)

Three hand-crafted reference tracks identified by the artist as quintessential
examples of the form:

| Track | Duration | Actions/s | Mean pos | Range | Avg stroke | Avg vel | p90 vel |
|---|---|---|---|---|---|---|---|
| Magik #3 Pt 1 | 73 min | 4.1 | 45.8 | 0–100 | 59.5 | 244 | 404 |
| Magik #3 Pt 2 | 68 min | 2.9 | 48.4 | 0–100 | 85.7 | 250 | 334 |
| RoD EE 2025 | 90 min | 4.2 | 49.8 | 0–100 | 98.5 | 664 | 943 |

Three findings overturned earlier modelling assumptions:

1. **Center stays near 50 across the entire track.** Even on RoD's 90-minute
   span, every 7.5-minute chunk averages 49–50. Track-wide rise/fall *tone*
   (the v1 primitive) is the **exception**, not the default.
2. **Range is full 0–100 in every chunk.** No "stingy" sections. The full
   range is in constant use throughout. Energy normalisation is the right
   default; minimum amplitude floors should be generous.
3. **Velocity is the primary moment-to-moment dimension.** RoD averages 664
   units/s with p90 943. PythonDancer's 324 isn't just a floor — it's *half*
   what the gold standard does. The artistry is in fast, full-range motion,
   not slow drift.

And the artist's own words:

> *"non-trivial — all over an hour. which means they are tracking a story
> over time. hence the need for chapters!"*

> *"developers are crafting the story; it's too hard for them to put in
> chapters."*

The first observation locks the structural unit. The second locks the UX
constraint: **chapter authoring must be effortless for storytellers**.

## The intent vocabulary

Each chapter is tagged with an *intent*. Intent → parameter target:

| Intent | Amplitude | Velocity | Density | Centre motion | Mode bias |
|---|---|---|---|---|---|
| **Intro** | low (compressed ±15) | slow | sparse | stable | tease/break |
| **Build** | rises across chapter | accelerating | increasing | optional gentle drift | edging |
| **Sustain** | steady mid-high | steady | full | flat | steady/fast |
| **Edge** | high but capped under climax | varied bursts | full | flat (held) | edging |
| **Climax** | max (±50) | max | max | flat | fast |
| **Recover** | drops over chapter | decelerating | thinning | optional fall drift | slow/tease |
| **Outro** | low | slow | sparse | flat | break/slow |

The composer thinks in narrative arcs. *"This part is a build, this part is
edge, this part is climax."* Not *"low=10, high=90, density=full, target_vel=400."*

## Architecture

```
audio + chapters[(start_ms, end_ms, intent, title?)]
         |
         v
    analyze_beats           (existing — videoflow)
         |
         v
    classify_modes          (existing — videoflow)
         |
         v
    [NEW] for each chapter:
        bias = INTENT_BIASES[chapter.intent]
        apply bias to (low, high, center, density, energy_curve, target_velocity)
        generate curve segment for chapter time range
         |
         v
    concatenate segments + smooth boundaries
         |
         v
    funscript with chapter metadata embedded
```

Within each chapter the existing pipeline runs (beat detection, phrase
classification, curve shaping). The parameter envelope is *bent* by chapter
intent rather than replaced.

The `center_trajectory` and `tone_per_phrase` primitives in `videoflow`
remain valuable, repurposed: they apply *per chapter for amplitude / density
envelopes*, not for whole-track centre drift.

## Chapter sources (priority order)

1. **Authored in forgevents** (planned standalone tool) — frame-accurate
   side-by-side audio + video player, auto-finder for candidate boundaries,
   frame-step hotkeys for exact placement. Same tool authors haptic events;
   same UX, different output. See `project_forgevents_planned.md` (private
   memory) for the full spec.
2. **Embedded mp4 chapters** — videos may already carry chapter markers from
   authoring tools. forgegen reads via `ffprobe -show_chapters`.
3. **Auto-detected by forgegen** — propose boundaries from audio structure
   (major energy / spectral / harmonic shifts). Artist confirms / adjusts in
   forgevents.

**Architectural note (revised 2026-04-27 morning):** chapter authoring was
originally specced to live in ForgeAssembler. That was wrong — ForgeAssembler
is a clip-stitcher and doesn't have frame-accurate playback. Chapter
boundaries need millisecond-precision timestamp picking with side-by-side
audio + video, which is exactly what forgevents needs for haptic events.
Same problem, same tool. ForgeAssembler stays focused on clip composition;
forgevents owns timeline-overlay authoring (chapters + events).

### Chapter resolver lives in videoflow

The priority-order resolver above (mp4 → sidecar → analysis-json → auto-detect)
is a **shared videoflow function**, not forgegen-internal. Every forge tool
that loads a track wants to ask the same question — *"are there chapters here,
and where do I find them?"* — so the resolver is a `videoflow.chapters`
function consumed across the family:

```python
from videoflow.chapters import load_chapters

# Returns: list[Chapter] from the highest-priority source available, or
# None if no chapters anywhere (caller decides whether to auto-detect)
chapters = load_chapters("path/to/track.mp4")
```

Consumers:

- **forgegen** — checks for chapters at load; runs auto-detect when missing
- **forgevents** — loads existing chapters into the editor on startup
- **FunscriptForge Pro** — overlays chapter structure on the curve view
- **ForgeAssembler** — chapter-aware clip composition (when retrofitted)
- **ForgePlayer** — playback chapter-nav (already an existing concern)

This is the canonical-emit pattern at the *function* level
(see `canonical-emit-pattern.md`) — implemented once in videoflow, called
by every consumer.

For v0.0.4 MVP: forgegen reads (2) and (3) and accepts manual chapter input
via a config / sidecar file in the interim before forgevents ships.

### Auto-chapter threshold (v0.0.4, locked 2026-04-27)

Auto-chapter generation is gated by a **user-configurable threshold**
expressed in minutes, defaulting to **5 minutes**. The artist's call:

> *"I think we ask the user the threshold to doing chapters with 5
> minutes being default."*
>
> *"minutes is the right timescale i think. I don't want every cut or
> fade to create one."*

Concretely:

- forgegen exposes a setting: *"Generate chapters when track is longer
  than [N] minutes"*, default 5
- If the source duration exceeds the threshold AND no existing chapters
  are found in priority order (1)–(2)–(3) above, run auto-detection
- Otherwise generate without chapter biasing (whole track is one
  implicit chapter)

The threshold is per-track-load, not per-project. Setting it to 999 effectively
disables auto-detection; setting to 0 always runs it.

### Chapters are minute-scale; cuts and fades are not chapters

Auto-detection produces chapter proposals at minute-scale. The
fine-grained video signals (every scene cut, every fade, every motion
peak) are **captured in `track.analysis.json`** but do *not* promote to
chapter boundaries by default. They serve other consumers:

- forgegen — events layer (scene_accent, tight_cut_zone, etc.)
- forgevents — event candidates for review
- ForgePlayer — visual chapter markers / accent visualisation
- Future **musicvideogenerator** product — composition primitives for
  music-video assembly

Chapter detection logic deliberately *under*-segments compared to raw
video signal density. Heuristics:

- A cluster of cuts within < 30 seconds is a *single* chapter event,
  not several
- Fades become chapter boundaries only when accompanied by audio
  energy shifts AND duration of preceding section is meaningful (>= threshold/2)
- Single cuts in otherwise continuous content are events, not chapters

## UX constraint: chapter authoring must be effortless

The artist's observation: *"developers are crafting the story; it's too hard
for them to put in chapters."* The chapter editor cannot be a configuration
form. It must be a **performance instrument**:

- **Play-and-mark** — start playback, tap a hotkey at chapter boundaries,
  keep going.
- **Single-key intent assignment** — number keys 1–7 mapped to the seven
  intents, applied to the most recent chapter.
- **Visual timeline** — audio waveform / energy chart with chapter overlays;
  drag to adjust boundaries.
- **Auto-propose, then confirm** — when auto-detection lands, the artist
  confirms boundaries with Enter or splits/merges with Tab/Shift-Tab.
  Authoring becomes review, not creation from scratch.
- **Undo / redo as a first-class feature** — exploration without consequences.

This is closer to a video editor or DAW marker workflow than a configuration
panel. The artist already has the story in their head; the tool's job is to
get out of the way.

## Within-chapter modulation

- **Build chapter** — amplitude scale ramps from ~0.6 at chapter start to
  1.0 at end. Velocity target ramps similarly. The `center_trajectory`
  primitive is reused per-chapter for amplitude / density envelopes,
  *not* for centre drift.
- **Sustain chapter** — amplitude scale ~0.85 throughout, velocity target
  steady, no envelope motion.
- **Edge chapter** — amplitude high and *held* (no climax); velocity has
  varied bursts; density full.
- **Climax chapter** — every parameter at max; chapters of this intent
  should be short (minutes, not 10s of minutes).
- **Recover chapter** — amplitude scale drops linearly; velocity target
  falls; density thins.

## Output

A funscript with chapter metadata embedded, e.g.

```json
{
  "version": "1.0",
  "actions": [...],
  "metadata": {
    "title": "...",
    "chapters": [
      {"at": 0,        "name": "intro",   "intent": "intro"},
      {"at": 90000,    "name": "build 1", "intent": "build"},
      {"at": 480000,   "name": "edge",    "intent": "edge"},
      ...
    ]
  }
}
```

ForgePlayer reads the chapter metadata for chapter-nav and favourites
(see `project_forgeplayer_chapters_forgegen.md` in private memory).
`funscript-tools` may need chapter pass-through across the multi-channel
renderer pipeline.

## Open questions / decisions still to make

- **Within-chapter centre drift**: should `center` drift inside a chapter?
  Gold standards don't drift centre even within phrases — variation lives in
  amplitude / velocity. Default: no centre drift, only amplitude envelope.
- **Boundary smoothing**: linear cross-fade between chapter parameter sets,
  or instant switch? Gold standards probably have soft transitions.
- **Final intent vocabulary**: 7 intents above is the starting set; needs
  validation against more reference tracks (Mistress And Box, A Sinful
  XXX-perience, others).
- **Auto-detect chapter boundaries**: candidates for v0.0.5 are
  `librosa.segment.agglomerative` and `librosa.segment.recurrence_matrix`.
- **Funscript chapter metadata format**: align with whatever the broader
  community uses if there's a convention; otherwise the layout above.

## Validation strategy

For each gold-standard track:

1. **Find apparent chapter boundaries** — time points where avg amplitude /
   velocity / density shift significantly. Cluster of changes = boundary.
2. **Read intent off each segment** — rising amplitude → build; sustained
   high → edge; peak burst → climax; decline → recover.
3. **Compare** the human-segmented chapter intent labels against what the
   data classifier produces.

The hand-crafted curves carry their structural decisions in their statistics;
the work is reading them out.

## Cross-references

- v0.0.4 spec (private memory): forgegen_v004_spec
- ForgePlayer chapter integration: forgeplayer_chapters_forgegen
- Canonical-emit principle: forgegen_canonical_emit (chapters fit naturally
  — emit canonical chapter metadata, transforms downstream)
