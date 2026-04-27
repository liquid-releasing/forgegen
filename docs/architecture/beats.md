# forgegen — Beat Integration

> How beats are detected, used, and extended in forgegen's generation
> pipeline. Captures the v0.0.4 baseline + v0.0.5 trajectory.
> Companion to `chapter-composition.md` and `architecture-considerations.md`.

## Beats are the timing skeleton, not the whole curve

Pro-level scripts treat beats as the *foundation*, layering richer
content on top. forgegen models this as four concerns:

| Layer | What it is | Source |
|---|---|---|
| **Grid** | Beat positions, BPM, bar / phrase boundaries | beat detection |
| **Content** | Position values at and between beat times | energy / pitch / amplitude envelope |
| **Nuance** | Modulation events overlaid on the curve | events layer (separate concern) |
| **Routing** | Per-body-region channel distribution | frequency / spectral analysis |

videoflow today does **Grid** + a thin **Content** layer (positions at
beat times, mode-shaped amplitude per phrase). Nuance and Routing are
queued. The work below describes how the **Grid** gets richer (more
robust, multi-band, drift-resistant) and what **Content** layers on top
of it.

## v0.0.4 — Grid robustness for long-form

### PLP-based stable beat tracking (must)

`librosa.beat.beat_track` is fine for 3-minute tracks; on 90-minute
tracks it inevitably drifts because tiny per-beat error compounds.

`librosa.beat.plp` (Perceptual Linear Prediction) was designed
specifically to prevent this drift. It must be the **default detector**
for tracks above ~10 minutes.

Without stable beats over the full duration, chapter detection is built
on sand — boundaries detected from beat aggregation will be wrong
wherever beats themselves are wrong, and the error grows monotonically.

### Locked-BPM mode (optional)

Two flavours, both compose:

1. **Auto-detect → lock** — once detected, place beats on a fixed BPM
   grid and don't let local fluctuation move them. Energy still varies
   per beat.
2. **User-set BPM** — type the BPM, beats placed on that grid.

Useful for tracks with stable tempo where local fluctuation produces
wonky beat tracking. Optional toggle.

### Per-chapter source selection

Beat detection has a `source` parameter:

- **percussive** — HPSS strips harmonic content (vocals, melody, pads),
  beats follow the drums
- **full** — beats run on the raw mix; whatever has rhythmic energy
  drives placement

| Source | Best for | Beats follow |
|---|---|---|
| Percussive | Dance music, EDM, clear drum patterns | The drum kit |
| Full | Vocal-driven, drones, ambient, sparse percussion | The whole mix |

**v0.0.4 should make this per-chapter.** A track with a percussive intro
→ vocal build → drone edge → percussive climax → ambient outro wants
different sources per chapter. Today the source is hidden in style
cards + a Details tab override; promote it to a first-class per-chapter
dropdown.

### Sub-beat detail (extend stroke_density)

`stroke_density` is currently `half | full`:

- half = 1 action per beat (alternating peak/trough across beats)
- full = 2 actions per beat (peak + trough each beat — canonical)

Extend to **1 / 2 / 4 / 8 actions per beat**:

- 1 — alternating, one stroke spans two beats (sensual)
- 2 — full stroke per beat (canonical)
- 4 — half-beat resolution (16th notes at 120 BPM)
- 8 — quarter-beat resolution (32nd notes — dense climaxes only)

Sub-beat actions weighted by sub-beat onset strength so they're not just
mechanical interpolation; they follow audio dynamics.

## v0.0.5 — multi-band beat detection + routing

### Multi-band beat detection

Different frequency bands carry different rhythmic information:

- **Low band (sub-bass / kick)** — foundation pulse, longer-cycle motion
- **Mid band (snare / synth lead)** — accents and stroke direction changes
- **High band (hat / cymbal / sibilance)** — fine-grain detail, accents

`librosa.onset.onset_strength_multi(y=y, sr=sr, channels=[0, 32, 64, 128])`
gives per-band onset envelopes; beat tracking runs on each.

Cost: more compute (3-4× single-band) and more complexity. Worth it
because…

### …it's load-bearing for multi-channel routing

Multi-band beats and multi-channel routing are the same feature from
different angles. The reason to detect beats per-band is so each band
can drive a different body-region channel:

- Low-band beats → lower-body channels (waist, knees, hips)
- Mid-band beats → core / abdomen channels
- High-band beats → upper-body channels (chest)

So v0.0.5 ships multi-band beat detection and multi-channel routing
together. They're not independently shippable.

## Continuous motion between beats (deferred to v0.0.5+)

forgegen today emits actions only at beat times. Funscript players
interpolate linearly between actions, giving sawtooth-y motion.
Pro scripts often have smoother motion — the curve follows audio
dynamics between beats, not just straight lines.

Three sub-features:

1. **Continuous envelope between beats** — interpolate following the
   audio's amplitude envelope or pitch contour, not straight lines
2. **Onset-triggered accent events** — sub-beat percussive hits that
   don't make the beat grid still feel rhythmically important; better
   expressed as *events* (separate layer) than as curve actions
3. **Pitch-driven center drift inside chapters** — center moves with
   melody contour for melodic sections; flat for drone sections

Defer to v0.0.5+ because each changes the curve emission model.
v0.0.4's job is robust grid + good content; v0.0.5's job is
expressiveness on top.

## Bar-level grouping (open question)

A "phrase" in videoflow today is detected from energy contour, not from
musical structure. That works on most tracks but can split bars across
phrase boundaries on tracks with complex structure.

Bar-level grouping (4 / 8 / 16 / 32 beats per phrase, snapped to
downbeats) would be more robust to small beat errors and more
musically meaningful. Open design question for v0.0.5:

- Snap phrase boundaries to bar lines (4 / 8 / 16 beats)?
- Or keep energy-contour phrases as the default and add bar-locked as
  optional?

Probably depends on the corpus — measure how the gold-standard scripts
align to bars vs free phrases and pick the default that matches.

## Beat detection priority list (long-form)

1. **PLP estimation** as default for tracks > ~10 min (drift-resistant)
2. **Multi-detector cross-validation** — librosa.beat.beat_track + PLP
   + optional madmom; vote / agree on outliers
3. **Periodic re-anchoring** — every ~30s, re-analyse a window and snap
   phrase boundaries to local musical structure
4. **Bar-level phrase boundaries** — phrases align to bars (4/8/16/32
   beats); more robust to small beat errors than free-form aggregation

## Working v0.0.4 list (beat-related)

- ☐ PLP-based stable beat tracking as default for long tracks
- ☐ Locked-BPM mode (optional toggle)
- ☐ Per-chapter source selection (percussive / full / mixed)
- ☐ stroke_density extended to 1 / 2 / 4 / 8 actions per beat

## Cross-references

- Chapter composition: `chapter-composition.md`
- Architecture considerations: `architecture-considerations.md`
- v0.0.4 main spec (private memory): forgegen_v004_spec
- Multi-band → multi-channel routing: deferred to v0.0.5 (private
  memory: forgegen_v004_spec for the routing design)
