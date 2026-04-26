A clean way to see how **audio‑to‑funscript** becomes a *small, intuitive set of user‑facing controls* is to map each internal pipeline step to the **single parameter (or small cluster of parameters)** that a user actually adjusts. This collapses a complex DSP + semantic system into a handful of knobs that feel natural and expressive.

---

## 🎚️ Audio‑Driven Funscript: User‑Facing Controls Mapped to Internal Pipeline Steps

### High‑level table connecting:  
**User parameter → Internal step(s) → What it actually controls**

| User‑Facing Control | Internal Pipeline Steps | What It Actually Adjusts |
|---------------------|-------------------------|---------------------------|
| **Beat Strength** | Beat detection, onset detection, raw curve generation | How strongly beats become stroke peaks; amplitude scaling on beat grid; subdivision emphasis |
| **Bass Emphasis** | Spectral analysis (low‑freq band), stem separation | Deep stroke amplitude, stroke depth, low‑frequency‑driven motion envelopes |
| **Treble Emphasis** | Spectral centroid, high‑freq band | Small flicks, accents, micro‑oscillations tied to hi‑hats/snares |
| **Energy Sensitivity** | Short‑time energy, RMS envelope | How amplitude follows loudness; dynamic range of strokes |
| **Tempo Bias** | Tempo curve, beat grid, tempo smoothing | Slower/faster than natural; half‑time/double‑time preference; beat subdivision selection |
| **Smoothness vs. Expressiveness** | Micro‑easing, velocity smoothing, jitter suppression | Curve polish vs. snappiness; micro‑velocity shaping; easing steepness |
| **Drop Impact** | Energy spikes, spectral contrast, semantic shaping | Amplitude spikes, velocity bursts, easing sharpness during drops |
| **Build‑Up Tension** | Energy ramp detection, tempo drift, semantic shaping | Rising amplitude envelope, delayed peak, tension curve steepness |
| **Tease Intensity** | Semantic shaping, oscillation overlay | Oscillation amplitude/frequency, amplitude suppression, playful micro‑motion |
| **Edging Ramp Strength** | Semantic shaping, tension modeling | Slow rise, delayed climax, sharp release, amplitude envelope curvature |
| **Style / Vibe** | Semantic audio interpretation (LLM), mode classification | Global shaping preset: smooth, punchy, sensual, chaotic, rhythmic, mechanical |
| **Aggressiveness of Shaping** | All shaping stages (5.1–5.5) | How much the system overrides raw audio; stylization strength |
| **Safety Limits** | QA & diagnostics | Max velocity, max acceleration, point density, device‑safe smoothing |
| **Point Density** | Funscript export | How many points are kept; dedupe thresholds; temporal spacing |

---

## 🧠 How to interpret this table

### The user only touches **creative intent**
Everything they adjust is something a human naturally thinks about:

- “Make it follow the drums more.”  
- “Make the drop hit harder.”  
- “Make it smoother.”  
- “Make it tease more.”  
- “Make it feel more sensual.”  

These map to a tiny set of intuitive controls.

### The system handles **all the DSP and semantics**
Behind each control is a chain of:

- beat detection  
- spectral analysis  
- tempo modeling  
- curve shaping  
- semantic envelopes  
- tension modeling  
- easing and velocity shaping  

The user never sees these details.

### LLMs translate **natural language → parameter sets**
If a user says:

> “Make it feel like a slow, sensual build with a violent drop.”

The LLM converts that into:

- low beat strength  
- high smoothness  
- high build‑up tension  
- high drop impact  
- low treble emphasis  
- high bass emphasis  
- edging‑like envelope before drop  

Python then executes it deterministically.

---

## A useful next step
Would you like a **preset matrix** (e.g., “Club Track”, “Sensual Tease”, “Mechanical Precision”, “Chaotic Bass‑Driven”) that bundles these controls into ready‑to‑use profiles for users?