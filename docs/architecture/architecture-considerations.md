# forgegen — Architecture Considerations

> Design discussion captured 2026-04-27 morning. These are open questions
> and proposed answers, not committed implementation. Companion to
> `chapter-composition.md` which covers the v0.0.4 chapter pivot itself.
>
> Each section below corresponds to a design question the artist raised;
> the proposals are working hypotheses subject to validation when the
> code lands.

## 1. The three per-chapter dimensions

Yesterday's chapter-composition doc proposed a 7-element intent vocabulary
(intro / build / sustain / edge / climax / recover / outro). Today's
discussion expanded the vocabulary the artist actually thinks in, which
was richer:

> *intro rampup, build, steady, low steady, beat centric, beat driven,
> romantic, video climax, calming down, edge, tide, hypnotic*

These mix three independent layers. Cleaner if separated:

| Dimension | Choices | What it controls |
|---|---|---|
| **Intent** (narrative arc) | intro / build / sustain / edge / climax / recover / outro | Where this chapter sits in the story; biases amplitude / velocity / density envelopes |
| **Character** (source driving the curve) | beat-driven / romantic / hypnotic / mixed | How the audio drives motion; biases beat-tracking source + curve interpolation style |
| **Tone shape** (curve trajectory) | flat / rise / fall / tide / arc | Macro shape of centre / amplitude across the chapter |

A chapter description is a *combination*: "build + beat-driven + rising"
or "edge + hypnotic + flat" or "climax + beat-driven + arc." Most
defaults pick themselves from intent (e.g. *climax* implies arc shape
and beat-driven character).

### Mapping the artist's vocabulary

| Artist's word | Layer | Mapping |
|---|---|---|
| intro rampup | intent + tone | intent=intro, tone=rise |
| build | intent | build |
| steady | intent + level | sustain (medium level) |
| low steady | intent + level | sustain (low level) |
| beat centric | character | beat-driven |
| beat driven | character | beat-driven |
| romantic | character | romantic (vocal/melodic-led) |
| video climax | intent | climax |
| calming down | intent | recover |
| edge | intent | edge |
| tide | tone | tide (wave / ebb-flow) |
| hypnotic | character | hypnotic (sustained, repetitive) |

Most map cleanly. The two genuinely new concepts — **tide** as a tone
shape and **hypnotic** as a character — get added to the vocabularies
above.

## 2. Events as a separate layer (and possibly a separate product)

The artist observation 2026-04-27:

> *funscript sets the stage. but the key to pro level scripts seems to
> be in the nuances from events.*

That maps onto the canonical-emit principle: forgegen / FunscriptForge
emit canonical curves (the *stage*); events layer on top (the *nuance*);
restim / ForgePlayer compose curve + events at playback.

### The nuance catalogue

#### Auto-derivable from audio analysis

- **Edge markers** — sustained-energy peaks where the curve holds tension
- **Beat accents** — micro-strokes / amplitude bumps on percussive hits
- **Bass-response amplification** — amplitude bump keyed to sub-bass energy
- **Volume envelope overlay** — amplitude swells / dropouts independent of position
- **Build markers** — energy-slope-detected intensity rises
- **Onset-density accents** — sections of unusual hit density
- **Mode-change points** — boundaries where the audio shifts character

#### Human-authored or AI-confirmed

- **Vocal cues** — moan / scream / breath events drive specific haptic events
- **Climax / orgasm markers** — narrative peaks
- **Tease / pause markers** — intentional reduction
- **Sync points** — anchors to specific video moments
- **Scene-change accents** — visual transitions
- **Breath sync** — breathing pattern overlay

#### Multi-channel haptic primitives (rendered by restim)

These already exist as parallel funscript channels in the FunscriptForge
multi-channel render (see victoriaoats `estim.funscriptforge/` — alpha,
beta, frequency, volume, pulse_width, pulse_frequency, pulse_rise_time):

- Pulse width / rise time / frequency modulation (e-stim)
- Stereostim frequency events (sensation panning)
- Per-region volume envelopes
- Alpha/beta phasing (2b dual-channel)
- FOC-stim parameter shifts

### Where events live: own product, or FunscriptForge feature?

**Arguments for its own product (e.g. forgevents / forgenuance):**

1. **Universal applicability** — events apply to any funscript regardless
   of source (PD output, hand-crafted, forgegen, FunscriptForge). Not
   coupled to a specific generator.
2. **Distinct analysis pipeline** — onset / accent / edge detection is a
   different algorithm set than beat detection. Has its own corpus
   (Edger files, hand-annotated tracks).
3. **Restim integration is event-shaped** — pulse / frequency / volume
   modulation is fundamentally event-like (discrete moments + parameters).
   The translation from intent events to rendered channel waveforms is
   its own concern.

**Arguments for FunscriptForge panel:**

1. **FunscriptForge already does multi-channel rendering** — co-located
2. **One fewer product to ship** — family is already at 5
3. **Events without curves don't make sense** — they overlay something

### Working recommendation (revised 2026-04-27)

**Own product, locked.** The decisive factor: chapter authoring has the
*same UX problem class as event authoring* — find an exact moment in
audio + video, stamp metadata, emit timeline overlay. Both need a
frame-accurate side-by-side player + auto-finder for candidates.

Yesterday's spec put chapter authoring in ForgeAssembler. That was wrong
— ForgeAssembler is a clip-stitcher, no frame-accurate playback.
forgevents (the events product) extends naturally to handle both
chapters and events because they share UX entirely. **One tool, two
output types** (chapter list + event list, both as funscript metadata
or paired YAML).

This consolidates the family:

- **forgegen** — canonical curve generation, chapter-intent-aware
- **forgevents** — *the timeline overlay editor*: chapters + events,
  frame-accurate, audio + video side-by-side
- **FunscriptForge** — curve editing
- **ForgeAssembler** — clip composition (stitches multi-source content;
  no longer authors chapters)
- **ForgePlayer** — playback
- **restim / funscript-tools** — rendering

Open question that survived: which 4–6 event types deliver 80% of the
nuance? Governs MVP scope of forgevents' events output (the chapter
output is simpler, just `[(start_ms, end_ms, intent), …]`).

## 3. Beat integration as four layers

**The artist's question:** *how do we integrate the beat itself in our
generation?*

**Proposed answer:** beats are the timing skeleton, not the whole curve.
Pro-level scripts use four layered concerns:

| Layer | What it is | Source |
|---|---|---|
| **Grid** | Beat positions, BPM, bar / phrase boundaries | beat detection |
| **Content** | Position values at and between beat times | energy / pitch / amplitude envelope |
| **Nuance** | Modulation events overlaid on the curve | events layer (Section 2) |
| **Routing** | Per-body-region channel distribution | frequency / spectral analysis |

Today videoflow does Grid + a thin Content layer (positions at beat
times, mode-shaped amplitude per phrase). Everything else is missing
or implicit. Pro scripts use all four layers, often deliberately.

### Multi-band beat detection (queued for v0.0.5)

Different frequency bands carry different rhythmic info:

- **Low band (sub-bass / kick)** — foundation pulse, longer-cycle motion
- **Mid band (snare / synth lead)** — accents and stroke direction changes
- **High band (hat / cymbal / sibilance)** — fine-grain detail, accent events

`librosa.onset.onset_strength_multi(channels=[0, 32, 64, 128])` gives
per-band onset envelopes; beat tracking runs on each.

**This is load-bearing for multi-channel routing**, not for the main
curve. Same feature from different angles. Defer to v0.0.5 alongside
multi-channel routing.

### BPM lock (v0.0.4 must)

Two flavours:

1. **PLP-based stable beat tracking** (`librosa.beat.plp`) — drift-resistant
   on hour-plus tracks. Bumped from "queued" to **must** given the
   90-minute phrase-drift observation in `chapter-composition.md`.
2. **Locked-BPM mode** — user types or auto-detects the BPM, beats placed
   on a fixed grid, energy still varies per beat from analysis. Useful
   for stable-tempo tracks where local fluctuation produces wonky output.
   Optional toggle.

Both compose: PLP for the *reference* BPM, locked grid for the *placement*
of beats once known.

### Continuous motion between beats

Three sub-features for non-beat-locked motion:

1. **Sub-beat detail** — at high BPM or in dense sections, generate
   16th-note actions between beats, weighted by sub-beat onset strength.
   Already partially expressible via `stroke_density`. Extend to 1 / 2 /
   4 / 8 actions per beat.
2. **Continuous envelope between beats** — instead of straight lines
   connecting beat-position points, follow the audio's amplitude envelope
   or pitch contour. Smoother motion, less sawtooth.
3. **Onset-triggered accent events** — sub-beat percussive hits that don't
   make the beat grid still feel rhythmically important; better expressed
   as *events* than as curve-position changes.

**Working call for v0.0.4:** sub-beat detail (small extension); defer
continuous-between-beats to v0.0.5 (changes the curve emission model);
accent events live in the events layer (Section 2).

## 4. Source selection — per-chapter, not global

### What the source axis is

videoflow's beat detection has a `source` parameter:

- **percussive** — runs `librosa`'s HPSS first, strips harmonic content
  (vocals, melody, sustained pads), keeps only percussive content (drums,
  transients, hits). Beat detection runs on the drum-only signal.
- **full** — beat detection on the raw mix; whatever has rhythmic energy
  drives beat placement.

| Source | Best for | Beats follow |
|---|---|---|
| Percussive | Dance music, EDM, clear drum patterns | The drum kit |
| Full | Vocal-driven tracks, drones, ambient, sparse-percussion | The whole mix |

Concrete on victoriaoats: percussive → 436 beats; full → 430 beats. Same
audio, different *what* drives beat placement → different curve.

### Where it lives today (UX confusion)

- **Style cards** bake in a source (Rhythmic = perc, Sensual = full,
  Intense = perc, Chaotic = full)
- **Details tab → Beat source** explicit override

So source is a hidden axis: pick a style and the source comes along; or
go to Details and toggle. Not a first-class knob.

### Where it should live in v0.0.4

**Per chapter, not global.** A track with a percussive intro → vocal
build → drone edge → percussive climax → ambient outro wants different
sources per chapter. Force-applying one source to the whole 90-minute
track is the wrong abstraction.

Source becomes one of the **three per-chapter dropdowns**:

- Intent (narrative arc)
- Character / source (percussive / full / mixed)
- Tone shape (flat / rise / fall / tide / arc)

With a proper tooltip explaining what each source does in human terms.

## 5. Updated v0.0.4 critical path

Revised after this morning's discussion:

1. ~~Commit + push~~ — done 2026-04-27 morning (feature branches)
2. **PLP-based beat tracking** as default for tracks > ~10 min
   (was queued; now *must* given long-form drift)
3. **Optional locked-BPM mode** — small surface, big robustness win
4. **Chapter ingestion** + per-chapter intent biases
5. **Per-chapter Intent + Character + Tone dropdowns** — collapse the
   global Tone radio + Style cards into a per-chapter design surface
6. **Events layer scaffolding** — funscript metadata format + read/write,
   even if the events product itself ships later
7. **Sub-beat detail** — extend `stroke_density` to 1 / 2 / 4 actions
   per beat
8. *(deferred to v0.0.5)* Multi-band beat detection + multi-channel
   routing as a unit
9. *(deferred to v0.0.5)* Auto-chapter detection
10. *(deferred to v0.0.5+)* Continuous motion between beats
11. *(open product question)* Events as own product vs FF panel

## Cross-references

- v0.0.4 main spec (private memory): forgegen_v004_spec
- Chapter composition: `docs/architecture/chapter-composition.md`
- Canonical-emit principle: forgegen_canonical_emit (private memory)
- Floor + Ceiling product positioning: forgegen_floor_and_ceiling
- ForgeAssembler composer evolution: forgeassembler_composer_evolution
