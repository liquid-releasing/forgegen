# Haptics generator family — multi-target output from one sidecar

> **Status:** architecture doc. Supersedes
> [`generation_spec/haptics/haptics_funscript_common_architecture.md`](../generation_spec/haptics/haptics_funscript_common_architecture.md)
> for v0.0.5+ (the older doc was forward-looking; this one is grounded
> in what actually shipped). Lead with this doc when explaining how
> forgegen extends from funscript-only into shaker / bHaptics / e-stim
> / OWO without reshaping the engine or the UI.

> **Audience:** engineers landing the next renderer (likely shaker), or
> reviewing how the v0.0.5 sidecar unblocks the multi-haptic toolchain.

---

## The unifying mental model

**`<stem>.chapters.json` is the haptic-script source of truth.** It
holds chapters + phrases + energy + tone — the *structural intent* of
the file. A renderer reads that intent and translates it into one
target's output format. The same sidecar drives every output.

```
                         ┌──────────────────────────┐
                         │  <stem>.chapters.json    │
                         │  (chapters / phrases /    │
                         │   energy / tone / shape)  │
                         └────────────┬──────────────┘
                                      │
              ┌───────────────────────┼─────────────────────────┐
              │                       │                         │
       ┌──────▼──────┐         ┌──────▼──────┐           ┌──────▼──────┐
       │  funscript  │         │   bHaptics   │           │   e-stim    │
       │   renderer  │         │   renderer   │           │  renderer   │
       └──────┬──────┘         └──────┬──────┘           └──────┬──────┘
              │                       │                         │
       ┌──────▼──────┐         ┌──────▼──────┐           ┌──────▼──────┐
       │ <stem>.func-│         │ <stem>.bhap │           │ <stem>.estim│
       │   script    │         │ (motor JSON)│           │   .wav (8ch)│
       └─────────────┘         └─────────────┘           └─────────────┘
```

This is what the
[`haptics_funscript_common_architecture.md`](../generation_spec/haptics/haptics_funscript_common_architecture.md)
draft predicted ("everything is a multi-channel funscript") — the
v0.0.5 sidecar is the concrete realisation. Sidecar fields map cleanly
to the doc's earlier vocabulary:

| The earlier doc called it | The v0.0.5 sidecar carries |
|---|---|
| Regions | Chapters (structural sections of the file) |
| Sub-regions | Phrases (within-chapter intent units, with `mode`) |
| Envelopes | `energy.beat_map.strengths` + `energy.envelope` (reserved) |
| Overlays | `tone` (FF mood) + `shape` (curve direction) |
| Carriers | (reserved — added per renderer when needed, e.g. e-stim carrier frequency) |
| Safety ramps | (reserved — added per renderer; e-stim adds amplitude clamps) |
| Timing | `at_ms` / `end_ms` throughout |
| Region presets | Sidecar fragments (separate `<name>.fragment.json`, see [sidecar-fragment.md](https://github.com/liquid-releasing/videoflow/blob/main/docs/architecture/sidecar-fragment.md)) |
| JSON schema | [`sidecar.schema.json`](https://github.com/liquid-releasing/videoflow/blob/main/docs/architecture/sidecar.schema.json) |
| Device-agnostic architecture | Bidirectional public API + field-level merge |

**Renderers don't share code with the audio analysis.** They share the
sidecar. Each renderer is a small, self-contained module that takes
the sidecar plus optional target-specific config and produces an
output file.

---

## Renderer signature

Every renderer is a single function with the same shape:

```python
def render_target(
    sidecar: dict,
    beat_map: AudioBeatMap,
    *,
    output_path: Path,
    config: TargetConfig | None = None,
    on_progress: OnProgress | None = None,
) -> RenderResult:
    """One sidecar in, one target-specific output file out."""
```

Returns a `RenderResult` with the output path, target name, and
summary stats (action count for funscript, event count for bHaptics,
duration / channel count for e-stim, etc.) so the Export tab can
render its dashboard.

**Renderers live in `videoflow.haptics.<target>`** as separate
modules. Importing one doesn't pull the others. Forgegen lazy-loads
renderers based on the user's target selection.

---

## Per-target detail

### Funscript (shipped — `videoflow.generate.export_funscript`)

The reference renderer; everything else mirrors its shape.

- **Input fields used:** `chapters[]` (boundaries + style / density /
  shape per chapter), `phrases[]` (mode), `energy.beat_map`
  (timestamps + strengths).
- **Output:** `<stem>.funscript` — single 1D position channel, JSON
  format per the funscript spec.
- **Scope decision:** **v0 ships 1D only**. The "main" funscript per
  the existing forgegen v0.0.4 pattern. 2D / multi-axis is treated as
  *expanding* the funscript family (additional sibling files like
  `<stem>.pitch.funscript`), not as separate targets — same data, more
  channels.
- **Refiner:** **FunscriptForge** — chapter / phrase / pattern / action
  depth. Reads the funscript + the same sidecar.

#### Funscript family expansion (deferred to v0.6+)

A second axis becomes attractive when its derivation has a free signal:

| Axis | Free derivation | Filename |
|---|---|---|
| **Pitch** | `shape` per chapter — `rise` → pitch climbs through chapter; `fall` → pitch descends; `auto` → energy-slope-driven; `flat` → constant. | `<stem>.pitch.funscript` |
| **Roll** | per-chapter `tone` mood as a slow oscillation (Tender → still; Build → ramping; Climax → wide). Untested heuristic; bench before shipping. | `<stem>.roll.funscript` |
| **Twist** | downbeat events from `beat_map.times_ms` filtered by `phrase.mode == "edging"`. | `<stem>.twist.funscript` |

Add axes incrementally; do not lock all six in one pass. The funscript
spec lets devices ignore unknown axis files, so adding pitch is
zero-risk for users on devices that don't support it.

### Shaker (next; v0.6 candidate)

- **Input fields used:** `phrases[].mode` + `energy.beat_map.strengths`.
- **Output:** `<stem>.shaker.funscript` — single 1D channel reshaped
  for vibration intensity rather than stroke position. Vibrators read
  the same `pos` field but interpret it as intensity.
- **Implementation:** ~50 lines on top of `videoflow.generate` —
  primarily a different `shape_curve` config (no peak/trough cycle;
  smooth amplitude envelope per phrase mode).
- **Refiner:** FunscriptForge (single-channel funscript, same as the
  main one).

### bHaptics (v0.7 candidate)

- **Input fields used:** `phrases[].mode` for region intensity,
  `energy.beat_map` for event timing, plus a region→motor mapping
  config.
- **Output:** `<stem>.bhap` — JSON event stream, motor IDs + intensities
  + timestamps, per the bHaptics SDK format.
- **New sidecar fields needed:** none required for v1 (region mapping
  lives in the renderer config). v2 may add per-chapter region presets
  ("intro chapters use chest+arms; climax chapters use full suit").
- **Refiner:** future — a region/motor editor. Until then, bHaptics
  output is generate-and-ship.

### E-stim (v0.8+ candidate)

- **Input fields used:** all of the above plus carrier frequency and
  safety-ramp config per chapter.
- **Output:** `<stem>.estim.wav` — 7.1 / 7.2 multi-channel WAV per the
  restim project's channel mapping.
- **New sidecar fields needed:** per-chapter `carrier_hz` and
  `max_amplitude` (safety cap). Both AUTHORED — user-set, not derived.
- **Constraints:** real safety considerations. Cannot ship without
  bench testing on isolated hardware.
- **Refiner:** future — channel envelope + safety-ramp editor.

### OWO / Woojer / future devices

Same renderer pattern. Each new device is a new module; the sidecar
stays unchanged for as long as the device's needs fit existing fields.
When a new device requires a new analytical signal (e.g. video motion
vectors for Woojer bass), the *sidecar grows additively* — new fields,
not a refactor. Per the locked principle: "extensible by accretion."

---

## Forgegen's role

Forgegen drives **all** renderers from one set of per-chapter choices.
The user picks Style / Density / Shape per chapter once; every
selected target reads those same choices and produces its own output.

**Generate tab UI (multi-target form):**

```
Targets: [✓] Funscript  [ ] bHaptics  [ ] E-stim  [ ] Shaker

Chapter 3 — sustain    music · 128 BPM
  Style:    rhythmic
  Density:  canonical
  Shape:    rise

[Generate selected ▶]
```

The triplet is **device-agnostic structural intent**. Renderers
translate. No per-target style sliders, no per-target density picks —
that's exactly the complexity that breaks the easy button.

**Export tab:** one row per generated target with stats + save button.

---

## FunscriptForge's role (and other refiners)

Forgegen produces **one artifact per target**. Refinement and
depth-editing are explicitly downstream.

| Target | Forgegen produces | Refiner today | Refiner future |
|---|---|---|---|
| Funscript | `<stem>.funscript` | **FunscriptForge** — chapter / phrase / pattern / action depth | (FF grows axes) |
| Shaker | `<stem>.shaker.funscript` | FunscriptForge (single-channel funscript; same surface) | — |
| bHaptics | `<stem>.bhap` | (none yet) | A region/motor editor — possibly a FunscriptForge tab, possibly a sibling app |
| E-stim | `<stem>.estim.wav` | (none yet) | Channel envelope + safety editor |

The "Open in FunscriptForge" button on each chapter card is the
funscript-target escape hatch. As other refiners ship, additional
escape hatches surface — but each one specific to its target.
Forgegen never grows the editing surface itself.

---

## Rollout order

Ordered by complexity and reuse, lowest-risk first:

| v | Target | Why this slot |
|---|---|---|
| 0.5 (current) | Funscript 1D | Reference. Already shipping. |
| 0.6 | Shaker | ~50 lines on top of existing `videoflow.generate`. Same engine, different shape config. Smallest possible second target — proves the renderer-plug-in pattern. |
| 0.7 | Funscript pitch axis | Free derivation from `shape`; no new sidecar fields needed. Lands as `videoflow.haptics.funscript_pitch`. |
| 0.8 | bHaptics | First real "different format" renderer. New output schema, region→motor mapping config. |
| 0.9 | E-stim | New sidecar fields (carrier_hz, safety caps). Bench testing required. |
| 1.0+ | OWO / Woojer / additional axes / video-motion-driven shaping | Each lands as a self-contained renderer plus optional sidecar additives. |

Each version adds one renderer. Forgegen's UI ratchets one column at
a time on the target multi-select. No big-bang rebuild.

---

## Open questions

1. **Shaker UI label.** The current forgegen Style enum is
   `rhythmic / sensual / intense / chaotic`. Vibrator semantics may
   want different style labels (e.g. `pulse / build / hold / wave`).
   Decide: keep the Style enum target-agnostic and let each renderer
   map it differently, or let each target carry its own Style enum?
   Initial lean: target-agnostic; renderers handle the translation.
2. **bHaptics region mapping.** Is the region→motor mapping a per-file
   choice (user picks "torso preset" or "full suit") or a single
   global config? Probably per-file, with built-in presets matching
   the cookbook recipe vocabulary.
3. **E-stim safety floor.** Where does the absolute amplitude cap live
   — in the renderer (hard-coded by hardware spec), in user
   preferences (per-user calibration), or in the sidecar (per-file
   override)? Probably user prefs + sidecar override; renderer
   enforces the safety floor regardless.
4. **Multi-axis funscript packaging.** When pitch + roll + twist all
   land, do they ship as separate sibling files (current convention)
   or as a single multi-channel funscript variant? The funscript
   ecosystem mostly expects siblings; sticking with that.

---

## Cross-references

- [`videoflow/docs/architecture/audio-structure-primitive.md`](https://github.com/liquid-releasing/videoflow/blob/main/docs/architecture/audio-structure-primitive.md) — sidecar schema + merge contract; the substrate every renderer reads.
- [`videoflow/docs/architecture/sidecar-fragment.md`](https://github.com/liquid-releasing/videoflow/blob/main/docs/architecture/sidecar-fragment.md) — reusable region-preset architecture; how cookbook patterns become bottled and reapplied.
- [`forgegen/architecture/ANALYZE_TAB.md`](ANALYZE_TAB.md) — the three-tab UI; sets up the multi-target Generate / Export panes.
- [`forgegen/generation_spec/haptics/`](../generation_spec/haptics/) — per-target deep-dive specs (bhaptics.md, estim_haptics.md, etc.). These remain the source of truth for individual renderer details; this doc is the umbrella that ties them to the v0.0.5 sidecar.

---

## When this doc updates

This doc captures the renderer-family architecture, not progress.
Update only when:

- A new renderer ships and changes the umbrella pattern (rare —
  renderers are independent by design).
- A new sidecar field is added to support a renderer (additive only;
  document the field on its first use).
- The rollout order changes for non-trivial reasons.
- The funscript-family axis-expansion strategy shifts.

Per-target implementation status, ship dates, and bug history live in
each renderer's CHANGELOG. The umbrella stays clean.
