# Analysis Layers — The Substrate Underneath the Funscript

> Funscripts are the *product*. Analysis is the *data we use to make
> the product better*. Today that data evaporates after generation.
> It should persist as a first-class artifact.
>
> This doc defines the layered analysis model — what audio and video
> features feed into what structural inferences, which feed into what
> intent / event proposals, which feed into the curve. Captures both
> what we have and what we haven't yet explored.

## The five layers

```
       Layer 5 — Multi-channel rendering   (alpha, beta, frequency, volume, pulse_*)
                          ▲
       Layer 4 — Curve                     (the .funscript)
                          ▲
       Layer 3 — Events                    (edge_hold, accent, vocal_cue, …)
                          ▲
       Layer 2 — Structural inferences     (chapters, phrases, modes, characters)
                          ▲
       Layer 1 — Raw features              (audio + video)
```

Each layer is *derived from* the layers below it and *consumed by* the
layers above. The analysis JSON persists Layers 1–3 so every downstream
tool reads from the same substrate without recomputing.

## Layer 1 — Raw features

### Audio (have most of these in videoflow today)

| Feature | What it captures | Status |
|---|---|---|
| Beat positions + BPM | Rhythmic timing skeleton | ✅ have (librosa.beat.beat_track) |
| Per-beat energy | Loudness at each beat | ✅ have (RMS) |
| Phrase boundaries | Energy-contour-derived sections | ✅ have |
| Pitch contour (f0) | Fundamental frequency over time | 🔜 v0.0.5-ish (librosa.pyin) |
| Spectral centroid | "Brightness" proxy | not yet |
| Onset density | Hit rate in moving window | not yet |
| Multi-band onset envelopes | Per-frequency-band rhythmic info | 🔮 v0.0.6 (multi-channel) |
| Perceptual loudness | What the ear hears, not RMS | 🔮 v0.0.6 (mel + equal-loudness) |
| Spectral flux | Rate of spectral change | not yet |
| Chroma | Pitch-class energy (polyphonic-robust) | not yet |
| Tonnetz | Harmonic-relationship space | not yet |

### Video (just scratched the surface)

| Feature | What it captures | Status |
|---|---|---|
| Scene change boundaries | Visual cuts and gradual transitions | 🔜 PySceneDetect |
| Motion energy per frame | How much is moving (optical flow magnitude) | not yet |
| Cut density | Fast-edited windows ("tight edits") = elevated intensity signal | not yet |
| Shot duration histogram | Shot rhythm — fast-cut vs long-take feel | not yet |
| Camera motion classification | Pan / zoom / static / handheld | not yet |
| Frame brightness / contrast | Dark vs bright sections | not yet |
| Saturation / colour stats | Mood proxy (warm / cool, vivid / muted) | not yet |
| Object detection | YOLO-style — what's in frame, where | 🔮 starts as primitive, grows with AI |
| Pose detection | People + body parts + body motion | 🔮 future |
| Face / emotion detection | Faces, gaze, emotional cues | 🔮 future |
| Action classification | What's happening in the scene (with appropriate models) | 🔮 future |
| Visual phrase boundaries | Where the *story* shifts visually | 🔮 ML-driven |
| Climactic moment detection | Visual cues for narrative peaks | 🔮 ML-driven |

The video layer is meaningfully under-explored. **Tight-cut grouping**
in particular — fast-edited windows signal elevated intensity even when
audio energy is moderate, and that's a signal we currently miss. Single
PySceneDetect call gives us scene boundaries; computing cut density
from those is trivial. Motion energy is one optical-flow call away.
Pose / object detection require model bundling but are in reach.

This is the biggest **future-AI-pays-off** surface in the family.
Forge-family products that already use PyInstaller bundling have a
distribution path for ML model files; the engineering work is
selecting the right models and integrating them, not infrastructure.

## Layer 2 — Structural inferences

Derived from Layer 1, these are higher-level interpretations of what
the track *is*:

| Inference | Derived from | Notes |
|---|---|---|
| **Phrase boundaries** | Audio energy contour + bar alignment | Today's videoflow phrase detector |
| **Phrase modes** (break/tease/slow/steady/fast/edging) | Audio energy + BPM | Today's classifier |
| **Phrase characters** (beat-driven / melodic / drone) | Audio + onset density + pitch confidence | New for v0.0.5 |
| **Chapter proposals** (boundaries + intent) | Multi-source: phrase aggregation + scene changes + mode shifts | New for v0.0.5 |
| **Tight-cut groupings** | Cut density windows | Video-driven; future |
| **Scene-mode mapping** | Visual scene type → likely audio mode | Future, ML-assisted |

Note that chapter proposals draw from **both audio and video** when
both are available. Audio gives mode/energy-driven boundaries; video
gives scene-change-driven boundaries. The two should agree at major
shifts (a song bridge usually corresponds to a visual transition); when
they disagree, the analysis flags it for human review.

## Layer 3 — Events (Edger sense)

Discrete markers that overlay modulation on the curve. Per the
chapters-vs-events doc, these are point-in-time or short-duration with
type + parameters.

Auto-derivable from Layer 1+2:

- Edge holds (sustained-energy peaks)
- Accents (sub-beat onset peaks)
- Vocal cues (vocal energy detection)
- Climax markers (audio + video peak co-occurrence)
- Build markers (energy slope rises)
- Mode-change accents (boundaries between phrase modes)
- Visual scene-change accents (video-derived)
- Tight-cut accents (video-derived)

Human-authored only:

- Sync points (anchors to specific moments)
- Tease / pause markers
- Custom modulation events

Layer 3 is what forgevents primarily curates and edits.

## Layer 4 — Curve

The .funscript itself: `[(at_ms, pos), …]`. Generated by forgegen from
Layers 1–3 + intent biases. Refined by FunscriptForge / FF Pro.

## Layer 5 — Multi-channel rendering

Per-region funscripts (alpha, beta, frequency, volume, pulse_*) derived
from Layer 4 + Layer 3 events by funscript-tools / restim. These are
the *output* of the pipeline, consumed by ForgePlayer and downstream
hardware.

## Schema sketch

The persistent analysis artifact is `<track>.analysis.json` (or embedded
in funscript metadata):

```json
{
  "version": "1.0",
  "source": {
    "audio_path": "track.mp3",
    "video_path": "track.mp4",
    "duration_ms": 5431700,
    "sample_rate": 48000,
    "video_fps": 30.0,
    "video_resolution": [1920, 1080]
  },

  "audio_features": {
    "bpm": 123.0,
    "beats": [...],
    "energy": [...],
    "pitch_contour": [...],
    "spectral_centroid": [...],
    "onset_density": [...],
    "multi_band_onsets": { "low": [...], "mid": [...], "high": [...] }
  },

  "video_features": {
    "scene_changes": [{ "at_ms": 12000, "kind": "cut" },
                      { "at_ms": 87000, "kind": "fade" }],
    "motion_energy": [...],
    "cut_density": [...],
    "shot_durations": [...],
    "camera_motion": [{ "start_ms": 0, "end_ms": 4000, "kind": "static" }],
    "objects_detected": [...],
    "pose_data": [...]
  },

  "structural": {
    "phrases": [{ "start_ms": 0, "end_ms": 7800,
                  "mode": "tease", "character": "melodic" }],
    "chapter_proposals": [{ "start_ms": 0, "end_ms": 90000,
                            "intent_proposal": "intro",
                            "confidence": 0.82,
                            "evidence": ["phrase_aggregation",
                                         "first_scene_change"] }],
    "tight_cut_groupings": [{ "start_ms": 480000, "end_ms": 510000,
                              "cuts_per_min": 24 }]
  },

  "event_proposals": [
    { "type": "edge_hold", "at_ms": 12000, "duration_ms": 3000,
      "confidence": 0.78, "source": "audio" },
    { "type": "scene_accent", "at_ms": 87000,
      "source": "video" },
    { "type": "climax_candidate", "at_ms": 780000,
      "confidence": 0.91,
      "source": ["audio_peak", "video_peak", "tight_cut_window"] }
  ],

  "generation_choices": {
    "style": "rhythmic",
    "tone": "auto",
    "stroke_density": "full",
    "center": 50,
    "energy_normalize": true,
    "chapter_intents_used": [...]
  }
}
```

## How layers compose

- **Layer 1 audio** runs in `videoflow.audio` (existing today)
- **Layer 1 video** runs in `videoflow.video` (new — wraps PySceneDetect, optical-flow, optional pose / object models)
- **Layer 2 structural** runs in `videoflow.structural` (new — uses audio + video features to propose chapters, phrase characters, etc.)
- **Layer 3 events** runs in `videoflow.events` (new — proposes edge / accent / vocal-cue / climax markers from Layers 1+2)
- **Layer 4 curve** is `videoflow.generate.beats_to_curve` + `shape_curve` (existing today)
- **Layer 5 rendering** is `funscript-tools` / `restim` (existing in those repos)

forgegen orchestrates Layers 1–4 and emits the analysis JSON + curve.
forgevents reads the analysis JSON to power its auto-finder. FF Pro
reads the analysis JSON to overlay structure (phrases, chapters,
events) on the curve UI. funscript-tools / restim consume Layer 4
+ Layer 3 events for Layer 5 rendering.

## What's reachable in v0.0.4 vs later

### v0.0.4 (engine robustness — no chapters)

- PLP-based stable beat tracking + locked-BPM (foundational)
- Sub-beat detail (1 / 2 / 4 actions per beat)
- `videoflow.events` scaffolding (funscript metadata read/write)
- `videoflow.chapters` resolver (mp4 → sidecar → analysis-json → none)

### v0.0.5 (chapter intent — the hero, audio-first)

- Layer 1 audio additions (pitch + multi-band onset envelopes lite)
- Layer 2 structural (phrase characters, chapter proposals from audio)
- Layer 3 event proposals (edge / accent / climax candidates from audio)
- Analysis JSON emission with audio sections populated
- Per-chapter intent biases in generation pipeline

### v0.0.6 (video + multi-channel)

- Layer 1 video (PySceneDetect + motion energy + cut density)
- Layer 2 structural with audio + video co-detection
- Layer 3 video-derived events (scene accents, tight-cut moments)
- Multi-band onset → multi-channel routing

### v0.0.7+

- Object / pose / action detection (model selection + bundling)
- ML-driven structural inferences (visual phrase boundaries, climax detection)
- Corpus-trained event classifiers (learned from hand-crafted reference scripts)

## Cross-references

- Chapters vs events: `chapters-vs-events.md`
- Chapter composition: `chapter-composition.md`
- Beats: `beats.md`
- Architecture considerations: `architecture-considerations.md`
- Canonical-emit principle (private memory): `feedback_forgegen_canonical_emit.md` —
  the analysis layer applies the same pattern: emit canonical analysis once, all
  downstream tools consume without recomputing
- forgevents spec (private memory): `project_forgevents_planned.md` (consumes
  this analysis for its auto-finder)
- FF Pro positioning (private memory): `project_funscriptforge_pro_positioning.md`
  (overlays Layer 2/3 structure on the Layer 4 curve UI)
