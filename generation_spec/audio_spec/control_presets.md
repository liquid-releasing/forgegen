A compact set of **audio‑driven user controls** maps cleanly onto the full DSP + semantic pipeline. The table below shows how each control influences the underlying system, which internal steps it touches, and what the user actually experiences in the final script. This mirrors the structure you used for the video pipeline but is tailored to the unique structure of music and audio.

---

## 🎚️ User Controls Mapped to Internal Audio Pipeline

### How creative intent flows into DSP, shaping, and semantics

| User Control | Internal Steps Affected | What It Changes in the Script | Why It Matters |
|--------------|-------------------------|-------------------------------|----------------|
| **Beat Strength** | Beat detection, onset detection, raw curve generation | Peak height on beats, stroke timing, rhythmic precision | Stronger beat emphasis makes the script feel tightly synced to percussion. |
| **Bass Emphasis** | Spectral analysis (low‑freq), stem separation | Deep strokes, amplitude scaling on bass hits | Bass often drives physical motion; this control shapes depth and power. |
| **Treble Emphasis** | Spectral centroid, high‑freq band analysis | Small flicks, accents, micro‑oscillations | Hi‑hats, snares, and bright elements add texture and detail. |
| **Energy Sensitivity** | Short‑time energy, RMS envelope | How amplitude follows loudness, dynamic range | High sensitivity makes loud sections feel intense and quiet sections soft. |
| **Tempo Bias** | Tempo curve, beat grid, subdivision logic | Slower/faster feel, half‑time/double‑time mapping | Lets users override ambiguous BPM or create stylized timing. |
| **Smoothness ↔ Expressiveness** | Micro‑easing, velocity smoothing, jitter suppression | Curve polish vs. snappiness, micro‑velocity shape | Smooth = sensual; expressive = punchy and energetic. |
| **Drop Impact** | Energy spikes, spectral contrast, semantic shaping | Amplitude spikes, velocity bursts, sharp easing | Controls how dramatic drops feel—subtle vs. explosive. |
| **Build‑Up Tension** | Energy ramps, tempo drift, semantic shaping | Rising amplitude, delayed peaks, tension curve | Makes builds feel gradual, suspenseful, or aggressive. |
| **Tease Intensity** | Semantic shaping, oscillation overlay | Oscillation amplitude/frequency, amplitude suppression | Creates playful, teasing motion during softer sections. |
| **Edging Ramp Strength** | Semantic shaping, tension modeling | Slow rise, delayed climax, sharp release | Audio‑driven analog to edging behavior in video scripts. |
| **Style / Vibe** | Semantic audio interpretation (LLM), mode classification | Global shaping preset: smooth, punchy, sensual, chaotic | A single control that sets the overall personality of the script. |
| **Aggressiveness of Shaping** | All shaping stages (5.1–5.5) | How much the system stylizes vs. preserves raw audio | High = stylized; low = faithful to the music. |
| **Safety Limits** | QA & diagnostics | Max velocity, max acceleration, point density | Ensures device‑safe output regardless of intensity. |
| **Point Density** | Funscript export | Number of points, dedupe thresholds | Controls fidelity vs. file size and device performance. |

---

## How this table helps you design the UX
A user doesn’t need to understand FFTs, beat grids, or spectral envelopes. They only need to think in terms of:

- **How synced to the beat should it feel?**  
- **How deep or punchy should it be?**  
- **How smooth or expressive should the motion feel?**  
- **How dramatic should drops and builds be?**  
- **What overall vibe should the script have?**

Everything else is handled by the pipeline.

A natural next step is deciding whether these controls should be exposed as **sliders**, **toggles**, or **presets**, and how many should appear in the “simple” vs. “advanced” UI.