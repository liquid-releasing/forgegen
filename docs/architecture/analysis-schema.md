# Analysis JSON Schema (v1.0 working spec)

> The canonical persistent analysis artifact emitted by forgegen and
> consumed by every other tool in the family. Per the analysis-layers
> doc, this is *canonical-emit applied one level up* — the same data
> moves through the pipeline rather than being recomputed at each stage.
>
> Status: working spec. Field shapes are subject to refinement during
> v0.0.4 (audio + structural skeleton) and v0.0.5 (chapter intent +
> event vocabulary) implementation. Versioning rules below describe
> how we evolve the schema without breaking downstream consumers.

## Design principles

1. **Single source of truth** — every analysis-derived value (beats,
   phrases, candidate events) lives here, not duplicated across tools.
2. **Versioned** — schema has a `version` field; tools declare what
   they support; backwards-compatible additions don't bump the version.
3. **Self-contained** — sufficient to reproduce / validate the
   downstream funscript without re-running expensive analysis.
4. **Streaming-friendly** — large arrays (per-beat features) sit at
   leaf positions so partial parses are cheap; downstream tools can
   skip sections they don't need.
5. **Inspectable** — every value has a documented unit; ambiguous
   numbers are forbidden.
6. **Consumers declared** — each section documents which tools read
   it, so changes are scoped.

## File naming + storage conventions

### Canonical placement

For a track at `path/to/track.mp4`:

```
path/to/
├── track.mp4              ← source video
├── track.funscript        ← Layer 4 (curve)
├── track.analysis.json    ← THIS schema (Layers 1–3)
└── track.events.yaml      ← Layer 3 finalised (after forgevents)
```

The `.analysis.json` is the **proposals + raw features** artifact —
auto-derived by forgegen. The `.events.yaml` is the **finalised
events** after human curation in forgevents.

For tracks already in a `.forge/` directory layout (used by forge family):

```
.forge/
└── 0/
    ├── 0.mp4
    ├── 0.funscript
    ├── 0.analysis.json
    └── 0.events.yaml
```

### Optional embed

For single-file convenience, the analysis can be embedded into the
funscript's metadata field:

```json
{
  "actions": [...],
  "metadata": {
    "title": "...",
    "analysis": { /* full analysis schema */ }
  }
}
```

Sidecar `.analysis.json` is preferred for long-form (file size; analysis
JSON for a 90-min track may be tens of MB with full per-frame video
features).

## Top-level structure

```jsonc
{
  "version": "1.0",
  "generated_by": { /* tool identity */ },
  "source": { /* media identity */ },
  "audio_features": { /* Layer 1 audio */ },
  "video_features": { /* Layer 1 video — optional */ },
  "structural": { /* Layer 2 inferences */ },
  "event_proposals": [ /* Layer 3 candidates */ ],
  "generation_choices": { /* what forgegen decided */ }
}
```

Six sections after metadata. Each documented below.

## `version` (string, required)

Schema version, semver. `"1.0"` is the working spec. Bump major
on breaking changes; minor on backwards-compatible additions.

## `generated_by` (object, required)

```jsonc
{
  "tool": "forgegen",        // or "forgevents", "manual", etc.
  "tool_version": "0.0.4",
  "videoflow_version": "0.0.4",
  "generated_at": "2026-04-27T14:32:18Z"  // ISO 8601 UTC
}
```

**Consumers:** all (provenance / debugging).

## `source` (object, required)

```jsonc
{
  "audio_path": "track.mp3",            // or "track.mp4" if audio is in video
  "video_path": "track.mp4",            // optional, only if video present
  "duration_ms": 5431700,               // total source duration
  "audio_sample_rate": 48000,           // Hz
  "video_fps": 30.0,                    // optional
  "video_resolution": [1920, 1080],     // [width, height], optional
  "audio_md5": "5667f975670f...",       // for cache validation
  "video_md5": "fb3205a7d5a8..."        // optional
}
```

The `_md5` fields let downstream tools detect that the source has
changed and the analysis is stale.

**Consumers:** all (cache invalidation, source validation).

## `audio_features` (object, required for audio sources)

### Layer 1 audio features. All time-series arrays are aligned to *beats* unless noted; values that vary continuously (envelope, contour) are sampled at a fixed `sample_period_ms`.

```jsonc
{
  "bpm": 123.0,
  "bpm_stable": true,                   // PLP confirms stable tempo
  "detector": "plp",                    // "beat_track" | "plp" | "ensemble"

  "beats": [34, 522, 1010, ...],        // beat timestamps in ms
  "downbeats": [34, 1986, 3938, ...],   // every-4-beats by default

  "phrases": [
    { "start_ms": 0, "end_ms": 7800, "energy_avg": 0.42 }
  ],

  "energy": {
    "per_beat": [0.45, 0.52, ...],      // RMS per beat, normalised 0-1
    "perceptual_per_beat": [...],       // optional, mel-weighted
    "envelope": {                       // continuous track envelope
      "sample_period_ms": 50,
      "values": [0.0, 0.12, 0.34, ...]
    }
  },

  "pitch": {
    "sample_period_ms": 50,
    "f0_hz": [220.0, 220.5, null, ...], // null where unvoiced/uncertain
    "confidence": [0.92, 0.91, 0.0, ...]
  },

  "spectral": {
    "sample_period_ms": 50,
    "centroid_hz": [...],               // brightness proxy
    "flux": [...]                       // rate of spectral change
  },

  "onset_density": {
    "window_ms": 1000,
    "values": [4, 5, 7, ...]            // hits per second per window
  },

  "multi_band_onsets": {                // optional, v0.0.5
    "low": [...],                        // sub-bass onset envelope
    "mid": [...],
    "high": [...]
  },

  "source_separation": {
    "method": "hpss",                   // "hpss" | "demucs" | "none"
    "applied_to_beat_tracking": "percussive"
  }
}
```

**Consumers:**

- `videoflow.generate` — beats, energy, phrases (Layer 4 generation)
- forgegen — all (basis for proposals)
- forgevents — energy envelope, onset_density (event auto-finder)
- FF Pro — all (overlay on curve UI)

## `video_features` (object, optional)

### Layer 1 video features. Present when source has video.

```jsonc
{
  "scene_changes": [
    { "at_ms": 12000, "kind": "cut",
      "confidence": 0.95 },              // PySceneDetect threshold
    { "at_ms": 87000, "kind": "fade",
      "duration_ms": 800 }
  ],

  "motion_energy": {
    "sample_period_ms": 33,             // ~30 fps
    "values": [0.12, 0.18, 0.22, ...]   // optical-flow magnitude, 0-1
  },

  "cut_density": {
    "window_ms": 30000,                 // 30-second sliding window
    "values": [
      { "start_ms": 0, "end_ms": 30000, "cuts_per_min": 4 }
    ]
  },

  "shot_durations": {
    "average_ms": 7200,
    "histogram": [                       // distribution of shot lengths
      { "bucket_ms": 1000, "count": 12 },
      { "bucket_ms": 5000, "count": 28 }
    ]
  },

  "camera_motion": [
    { "start_ms": 0, "end_ms": 4000, "kind": "static" },
    { "start_ms": 4000, "end_ms": 7500, "kind": "pan", "direction": "right" }
  ],

  "brightness": {                        // optional
    "sample_period_ms": 33,
    "values": [...]
  },

  "objects_detected": [                  // optional, v0.0.6+
    { "at_ms": 12000, "label": "person", "bbox": [x, y, w, h],
      "confidence": 0.88 }
  ],

  "pose_data": [                         // optional, v0.0.6+
    { "at_ms": 12000, "skeleton_keypoints": [...] }
  ]
}
```

**Consumers:**

- forgegen — scene_changes (chapter proposals); motion_energy + cut_density (event proposals)
- forgevents — scene_changes (boundary candidates); motion_energy (high-zoom video display)
- ForgePlayer — scene_changes (visual chapter markers in playback)
- FF Pro — scene_changes (overlay on timeline)

## `structural` (object, required)

### Layer 2 inferences derived from Layer 1.

```jsonc
{
  "phrases": [
    {
      "start_ms": 0,
      "end_ms": 7800,
      "mode": "tease",                  // break/tease/slow/steady/fast/edging
      "character": "melodic",           // beat-driven/melodic/drone/mixed
      "energy_avg": 0.32,
      "energy_trend": "rising",         // rising/falling/flat/arc
      "tone_proposal": [40, 60]         // (start_center, end_center)
    }
  ],

  "chapter_proposals": [
    {
      "start_ms": 0,
      "end_ms": 90000,
      "intent_proposal": "intro",
      "character_proposal": "melodic",
      "tone_shape_proposal": "rise",
      "confidence": 0.82,
      "evidence": [
        "phrase_aggregation",            // grouped from N adjacent phrases
        "first_scene_change",            // boundary aligns with video cut
        "low_energy_average"
      ]
    }
  ],

  "tight_cut_groupings": [               // video-derived, optional
    {
      "start_ms": 480000,
      "end_ms": 510000,
      "cuts_per_min": 24,
      "intensity_signal": "elevated"
    }
  ],

  "audio_video_alignment": {             // when both present
    "boundary_agreement_score": 0.78,    // 0-1, how often A & V agree
    "disagreements": [
      { "audio_boundary_ms": 90000,
        "nearest_video_boundary_ms": 92500,
        "delta_ms": 2500 }
    ]
  }
}
```

**Consumers:**

- forgegen — uses chapter_proposals + phrase modes for intent-biased generation
- forgevents — chapter_proposals as starting candidates for chapter authoring
- FF Pro — phrases + chapter overlay on curve UI

## `event_proposals` (array, required, possibly empty)

### Layer 3 — auto-detected events for human curation in forgevents.

Each event is one of these shapes:

```jsonc
[
  {
    "type": "edge_hold",
    "at_ms": 12000,
    "duration_ms": 3000,
    "confidence": 0.78,
    "source": ["audio_sustained_peak"],
    "params": {}
  },
  {
    "type": "accent",
    "at_ms": 24500,
    "confidence": 0.85,
    "source": ["onset_peak"],
    "params": { "intensity": 0.92, "frequency_band": "low" }
  },
  {
    "type": "vocal_cue",
    "at_ms": 31200,
    "confidence": 0.62,
    "source": ["vocal_energy"],
    "params": { "kind": "moan_candidate" }
  },
  {
    "type": "climax_candidate",
    "at_ms": 780000,
    "confidence": 0.91,
    "source": ["audio_peak", "video_peak", "tight_cut_window"],
    "params": {}
  },
  {
    "type": "scene_accent",
    "at_ms": 87000,
    "confidence": 0.95,
    "source": ["video_cut"],
    "params": { "cut_kind": "hard" }
  }
]
```

Common fields on every event:

- `type` (string) — event type from the type vocabulary
- `at_ms` (int) — start time in ms
- `duration_ms` (int, optional) — for durational events
- `confidence` (float, 0–1) — auto-finder confidence
- `source` (array of strings) — which signals contributed
- `params` (object, type-specific)

Type vocabulary (open question — candidates for v0.0.5 MVP, when the
event scaffolding lands alongside chapter intent):

| Type | Meaning |
|---|---|
| `edge_hold` | Sustained-energy peak, hold tension |
| `accent` | Percussive accent / micro-stroke bump |
| `vocal_cue` | Vocal event (moan/scream/breath candidate) |
| `climax_candidate` | Narrative peak indicator |
| `build_marker` | Energy-rise inflection point |
| `mode_change` | Boundary between phrase modes |
| `scene_accent` | Video scene change / hard cut |
| `tight_cut_zone` | Window of elevated cut density |

The minimum-viable vocabulary is an open question — see
`architecture-considerations.md`. forgegen emits whichever types it can
detect; forgevents adds human-authored types (sync_point, tease_marker,
etc.) on top.

**Consumers:**

- forgevents — primary consumer (curate / accept / reject / edit)
- forgegen — read its own emissions when regenerating with chapter
  context for accent application
- FF Pro — overlay event markers on the curve UI

## `generation_choices` (object, required)

What forgegen decided when producing the curve. Records the *cause*
of every output decision so the curve is reproducible from the
analysis JSON + source.

```jsonc
{
  "style": "rhythmic",                  // "rhythmic"|"sensual"|"intense"|"chaotic"|"custom"
  "low": 10,
  "high": 90,
  "center": 50,
  "tone": "auto",                        // "flat"|"rise"|"fall"|"auto"
  "stroke_density": "full",             // "half"|"full" (or "1"|"2"|"4"|"8" in v0.0.4+)
  "energy_normalize": true,
  "source_per_chapter": [               // when chapters drove source
    { "chapter_index": 0, "source": "percussive" },
    { "chapter_index": 1, "source": "full" }
  ],
  "intent_biases_used": {
    "build": { "amplitude_scale": [0.6, 1.0], "velocity_scale": [0.7, 1.0] }
  },
  "energy_normalize_reference": 0.78    // the 95th-pct value used
}
```

**Consumers:**

- forgegen — replay / regenerate with same settings
- FF Pro — show "this section was generated as an `edge` chapter with full density"
- Future ML — learning input (paired with hand-edits to learn what artists change)

## Versioning rules

- **Backwards-compatible additions** (new optional fields, new event types):
  no version bump. Tools written for v1.0 continue to work; new fields
  are simply ignored.
- **Breaking changes** (renamed fields, semantic changes, removed fields):
  bump to v2.0. Tools declare supported versions.
- **Deprecations**: mark fields as `_deprecated: true` for one major
  version; remove in the next.

Tools should:

- Read the `version` field first
- Refuse to operate on unsupported versions (with a clear error)
- Pass through unknown fields they don't understand (forward compatibility)

## Validation rules

- All time fields are integer milliseconds, never seconds
- Time arrays must be monotonically non-decreasing
- Position values are integers 0–100 inclusive
- Confidence scores are floats in [0, 1]
- Phrase / chapter time ranges must tile the source duration without gaps or overlaps
- `version` is required; absence rejects the file

Suggested validation tooling: a `videoflow.analysis.validate(path)` CLI
command that verifies these rules, prints first error, exits non-zero.

## Cross-references

- Analysis layers (the conceptual model): `analysis-layers.md`
- Chapters vs events (granularity differences): `chapters-vs-events.md`
- Chapter composition (how chapter proposals are used): `chapter-composition.md`
- Beats (Layer 1 audio specifics): `beats.md`
- Architecture considerations (events catalogue): `architecture-considerations.md`
- Canonical-emit principle (private memory): `feedback_forgegen_canonical_emit.md`
