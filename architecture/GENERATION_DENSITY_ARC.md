# The density arc — why great scripts have a narrative shape, and how the engine reaches it

> **Status:** core finding + engine decision note (2026-06-13). The second of
> the two load-bearing generation results. Lead with it when someone asks
> "why does our output feel monotone even though the shape is right?" or
> "where does the build/climax/comedown come from?"
>
> Companion to [`GENERATION_DEPTH_LAW.md`](GENERATION_DEPTH_LAW.md) (the
> *amplitude* axis — depth is a fixed full backbone) and to
> [`funscript-quality-characteristics.md`](funscript-quality-characteristics.md)
> Dimension 3 (Structural shape), which this doc moves from "largely
> unmeasured" to **measured + mechanised**.

---

## The two axes

A funscript has two independent quality axes, and they are solved by two
different, independent mechanisms:

| Axis | Failure mode | Mechanism | Doc |
|---|---|---|---|
| **Depth** (how far each stroke reaches) | centered bell, empty rails | fixed full-depth backbone; signal drives timing, never amplitude | [`GENERATION_DEPTH_LAW.md`](GENERATION_DEPTH_LAW.md) |
| **Density** (how the stroke *rate* moves over the piece) | monotone, no arc | author-declared structural arc drives gate + sub-stroke count | **this doc** |

The depth law makes a single stroke correct. The density arc makes the
*sequence of strokes* feel like a performance.

---

## The one-sentence finding

> **A great script's dynamic density is not a response to the audio — it is a
> narrative arc the author imposes: a sparse build-in, a flat body, a climax
> bump, and a comedown taper. Drive density from a *position/structure* arc,
> not from loudness.**

This is the direct analogue of the depth law's "stop mapping signal →
amplitude." Here it is: **stop mapping loudness → density.**

---

## How we know — the measurement that killed the obvious idea

The obvious plan was "continuous energy → density": map a smoothed audio
energy envelope to stroke rate, so loud passages get busy and quiet passages
thin out. We measured before building, and the data refuted it.

**The oracle** (`videoflow/src/videoflow/funscript_stats.py`, the shared
metrics module): split a script into N equal-time windows and read the
**per-window stroke rate**, plus a **dynamics index** = coefficient of
variation of that rate (`rate_cov`) and of per-window velocity (`velocity_cov`).
High CoV = dynamic; low = monotone.

**Two golds, measured (n=18 windows):**

| Gold | rails | rate_cov | velocity_cov |
|---|---|---|---|
| *A Sinful XXX-perience* | bimodal | 0.46 | 0.21 |
| *Rhythms of Desire* (rob) | 98 % | 0.374 | 0.298 |

⟹ **Dynamic density is real across both, but the target is a *band*
(`rate_cov` ≈ 0.37–0.46, `velocity_cov` ≈ 0.21–0.30), not Sinful's 0.46
specifically.** Tune to the band; do not overfit to one number.

**The refutation.** Correlate the music's smoothed energy envelope with the
gold's per-window stroke rate, on rob:

```
window:      0    1   ...    14   15   16   17
music env: 0.52 0.55  ...  0.58 0.55 0.68 0.52   ← flat the whole track
gold rate:  1.5  3.3  ...   6.3  5.1  0.0  0.7   ← ramps in, peaks, then STOPS
corr(music_env, gold_rate) = 0.17                ← essentially zero
```

**The smoking gun is window 16:** the EDM track is still loud (0.68) while the
gold has gone *silent* (0.0/s) — the comedown. The author ended the sexual arc
regardless of what the music was doing. Energy → density was always going to
fail here, and when built, it did: it pushed rate back up to 7.9/s without
adding any arc.

**What the rateCoV actually is.** Decompose the gold's profile: the **body**
(windows 1–15) has CoV ≈ 0.16 — *the same as our "monotone" output*. The
entire dynamic-density signature lives in the **intro ramp** (window 0: 1.5/s)
and the **outro taper** (windows 16–17: 0.0, 0.7). The dynamics are
**structural** (where you are in the piece), not local (how loud it is right
now).

---

## Why this is a *video / structural* property

Audio loudness is flat across these tracks (EDM is heavily compressed), yet the
gold's density swings 0 → 6/s. The arc tracks the **on-screen narrative** the
author watches — the action building to a climax and easing off — which the
music loudness does not encode. This is concrete evidence that **video timing
is not merely a substitute for audio beats**: it carries the arc that audio
loudness lacks. (See [`VIDEO_VIA_EXTERNAL_GENERATOR.md`](VIDEO_VIA_EXTERNAL_GENERATOR.md).)
For now, with audio-only input, the arc must be **author-declared** rather than
inferred — which turns out to be a feature, not a limitation (see *The user
principle*).

---

## A prerequisite that surfaced first — the octave guard

Before the arc could be tuned, the **density baseline** had to be correct.
Audio beat trackers report a doubled metrical octave (they lock onto
eighth-notes as beats): rob detected at **235 BPM**, generating **7.7
actions/s** against the gold's 4.2 — nearly 2× over-dense *everywhere*.

`videoflow/src/videoflow/audio.py::_correct_tempo_octave` folds the octave:
while BPM is above a "too fast to be the felt pulse" ceiling (165) and halving
stays musical (≥ 70), drop every other beat — keeping whichever phase
(even/odd) carries **more energy**, so the strong on-beats (kicks/snares)
survive. Applied in `_analyze_buffer` *before* downbeats/stanzas are derived,
so all downstream structure is built on the felt pulse; skipped when
`locked_bpm` pins the tempo.

Result: rob 235 → 117 BPM, **7.7 → 3.9/s** (on the gold's 4.2). Note this is an
**audio-only** weakness — video optical flow would not have it, because each
reversal *is* a literal stroke. The guard patches a periodicity-inference error
that the video path sidesteps entirely.

---

## How the engine implements the arc

`videoflow/src/videoflow/generate.py`. A **per-beat arc value** `arc[i] ∈ [0,1]`
is the single interface; how it is *shaped* is decoupled from how it is
*consumed*.

**Consumption** (`beats_to_curve`, fixed-depth path). The arc modulates *both*
levers that together span the gold's full 0 → 6/s range:

1. **Gate (the low end).** A deterministic fire-accumulator decimates beats in
   proportion to the arc: `fire_frac = min(1, arc / _ARC_FULL)`. Below
   `_ARC_FULL` (0.45) beats drop — this is how the output reaches the sub-2/s
   intro and the literal 0/s outro that sub-stroke count alone cannot. No
   randomness (deterministic, resumable).
2. **Sub-stroke density (the high end).** `_arc_density(arc)` holds at 2 (one
   full stroke) until the arc passes `_ARC_FULL`, then ramps to a ceiling
   (`_DENSITY_CEIL` = 6) at the climax. Even counts keep each beat's
   peak→trough self-contained (gating-safe).

Depth still never scales with the signal — the depth law holds; the arc only
touches *when* and *how often*, never *how far*.

**Shaping** — two author-facing sources:

- **`density_arc_curve(positions, …)`** — the tunable default curve: ramp
  `floor → base` over `build`, a **flat body** at `base`, a **localized late
  climax bump** to `peak` of width `climax_width` centred on `peak_at`, then
  `base → floor` over `taper`. The shape is matched to the gold's mechanism
  (dynamics in the *ends*, not a long body ramp). Every knob is UI-exposable.
- **`density_arc_from_levels(beats, levels)`** — chapter/passage-driven: each
  `(start_ms, end_ms, intensity)` span sets its arc level. The cross-span
  intensity contour *is* the arc.

**Wiring:**
- `generate_from_beats(…, density_arc="default" | list | None)` — `"default"`
  builds the curve from each beat's normalised track position.
- `generate_from_beats_per_chapter` — each recipe may carry
  `intensity ∈ [0,1]`; a flat per-chapter arc is built via
  `density_arc_from_levels`. Absent → flat density (back-compat).

### Result and the remaining gap

On rob, through the real shipping path (mp4 → extract audio → beats →
generate), against the gold's `rate_cov 0.406 / velocity_cov 0.376`:

| | rate | rate_cov | velocity_cov | shape |
|---|---|---|---|---|
| Ours, no arc (monotone) | 3.9/s | 0.13–0.15 | 0.14 | flat wall |
| Ours, default arc | 3.6/s | **0.345** | **0.305** | sparse intro · flat body · climax bump at the gold's window · taper |
| rob gold | 4.2/s | 0.406 | 0.376 | — |

**The monotone problem is solved.** The remaining `rate_cov` delta is tunable
knobs. Two separate open gaps remain (not density problems):
- **Rail purity** — 66 % vs the gold's 98 %. This is the *depth* axis
  (`_MODE_DEPTH` / limbo deciles), not density.
- **Average rate** slightly under (3.6 vs 4.2) because the flat body is capped
  at density-2 (≈ 3.65/s); acceptable, and a knob.

---

## The user principle — author-declared, not inferred

> *"User input lets the user have a stake in the answer."* — the project owner.

Because the arc is **structural, not signal-derived**, the engine does not try
to *guess* the narrative from audio (it can't — corr 0.17). Instead the author
**declares** it, two ways, mirroring the rest of the product:

- a **tunable default curve** (build / body / climax / taper knobs), or
- **chapter intensities**, authored exactly like **passages in
  FunscriptForge** — the user selects spans and says how hard each drives.

This is the opposite of a black box. The default curve gives a strong
out-of-the-box result; the chapter path gives an author full control. The
forgegen UI should surface both (the knobs are already in the engine).

---

## Decisions made (and why), to revisit

1. **Energy → density: rejected.** Measured corr 0.17; the outro disproves it
   outright. *Revisit only if* a better audio feature (onset density, spectral
   flux, percussive-band energy) is shown to correlate with a gold's arc —
   RMS does not. Default assumption: the arc is structural/visual, not audio.
2. **Arc is author-declared, not inferred (audio-only).** Correct given the
   refutation. *Revisit when* the video motion-envelope source lands — video
   could *infer* the arc, at which point "default curve" becomes "video-derived
   arc" and the author edits rather than authors from scratch.
3. **Gate-decimation for the low end, sub-strokes for the high end.** Chosen
   because at ~2 beats/s, one stroke per beat is already ~2/s — you *cannot*
   reach the gold's 0–1.5/s intro/outro without dropping beats. Sub-strokes
   alone only move the high end. *Revisit if* a continuous "strokes-per-second
   target" model proves cleaner than the two-lever split.
4. **Default curve shape = flat body + late climax bump** (not a long
   body ramp). Chosen because the gold's body is flat (CoV ≈ 0.16) and the
   dynamics live in the ends. An early/long ramp over-densifies the body
   (measured: rate 7.0/s, body 7–11/s). *Revisit per content type* — a
   different genre may want multiple peaks or an earlier climax (knobs exist).
5. **Octave guard default-on, ceiling 165 / floor 70.** Octave-doubled beats
   are wrong for every consumer, so default-on is a strict correctness win.
   *Revisit the thresholds* if a genuinely fast track (felt pulse > 160) is
   mis-folded — none seen in PMV/cock-hero material so far.
6. **Tune to a band, not a point.** Two golds give `rate_cov` 0.374 and 0.46;
   treat 0.37–0.46 as the target. *Revisit/narrow* as more golds are measured.
7. **All committed to `videoflow` main** (shared by forgegen / funscriptforge /
   forgeassembler), additive and back-compat (no arc → prior behavior). The
   default-curve change only activates when a caller passes `density_arc`.

---

## Cross-references

- [`GENERATION_DEPTH_LAW.md`](GENERATION_DEPTH_LAW.md) — the amplitude axis; this doc is the density axis. Two axes, two mechanisms.
- [`funscript-quality-characteristics.md`](funscript-quality-characteristics.md) — Dimension 2 (velocity/density, now measured by `funscript_stats`) and Dimension 3 (structural shape, mechanised here).
- [`VIDEO_VIA_EXTERNAL_GENERATOR.md`](VIDEO_VIA_EXTERNAL_GENERATOR.md) — why the arc is ultimately a video property; the future inferred-arc source.
- `videoflow/src/videoflow/funscript_stats.py` — the shared oracle (decile shape, windowed profile, dynamics index).
- `videoflow/src/videoflow/generate.py` — `density_arc_curve`, `density_arc_from_levels`, `_arc_density`, `beats_to_curve(density_arc=…)`, `generate_from_beats_per_chapter` recipe `intensity`.
- `videoflow/src/videoflow/audio.py` — `_correct_tempo_octave` (the octave guard).
- videoflow commits: `7cabf1c` (octave guard), `5d03c14` (structural arc), `b18056a` (chapter arc).
