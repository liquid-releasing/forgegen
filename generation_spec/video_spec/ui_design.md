Here is the **video‑pipeline version** of the same table you approved for audio: a clean mapping from **user‑facing controls** → **internal pipeline steps** → **what actually changes in the script**. It mirrors the structure and level of abstraction of the audio table, but grounded in the full video workflow you and I built across Steps 1–7.

---

## 🎥 Video‑Driven Funscript: User Controls Mapped to Internal Pipeline

### How creative intent flows into optical flow, motion extraction, shaping, and semantics

| User‑Facing Control | Internal Video Steps Affected | What It Changes in the Script | Why It Matters |
|---------------------|-------------------------------|-------------------------------|----------------|
| **Motion Sensitivity** | Optical flow, keypoint tracking, motion magnitude extraction | How strongly motion translates into stroke amplitude | Controls whether small movements produce subtle strokes or large ones. |
| **Stroke Depth / Intensity** | Motion normalization, amplitude scaling, shaping (5.1–5.4) | Global amplitude range, depth of strokes | Sets the overall “strength” of the script regardless of video content. |
| **Smoothness ↔ Expressiveness** | Motion smoothing (Step 3), micro‑easing (5.2), velocity shaping (5.4) | Curve polish vs. snappiness, micro‑velocity shape | Smooth = sensual; expressive = punchy, energetic, more raw. |
| **Rhythm Strength** | Rhythm detection (4.1–4.5), beat alignment, tempo curve | How much the script locks to detected rhythm vs. raw motion | High rhythm strength makes the script feel musical and predictable. |
| **Mode Bias (slow/fast/tease/edging/chaotic)** | Mode classification (4.3), semantic shaping (5.5) | Easing curves, amplitude envelopes, velocity profiles | A single control that sets the overall personality of the script. |
| **Tease Intensity** | Semantic shaping (5.5), oscillation overlay | Oscillation amplitude/frequency, amplitude suppression | Creates playful, teasing motion in low‑intensity sections. |
| **Edging Ramp Strength** | Semantic shaping (5.5), tension modeling | Slow rise, delayed climax, sharp release | Video‑driven analog to edging behavior; shapes long‑form tension. |
| **Stability Preference** | Motion segmentation (4.4), jitter suppression, smoothing | How aggressively chaotic motion is stabilized | Helps avoid jittery scripts from shaky footage. |
| **Responsiveness to Fast Motion** | Optical flow thresholds, velocity shaping | How quickly the script reacts to sudden movement | Controls snappiness and responsiveness to high‑speed action. |
| **Responsiveness to Slow Motion** | Low‑motion amplification, easing shaping | How much slow, subtle motion is amplified | Useful for sensual, slow, or minimal‑movement scenes. |
| **Aggressiveness of Shaping** | All shaping stages (5.1–5.5) | How much the system stylizes vs. preserves raw motion | High = stylized; low = faithful to the video’s natural motion. |
| **Scene Transition Softness** | Section boundary smoothing (5.1, 5.4), semantic transitions | How smooth transitions feel between modes or scenes | Prevents abrupt jumps when the video cuts or behavior changes. |
| **Safety Limits** | QA & diagnostics (Step 6) | Max velocity, max acceleration, point density | Ensures device‑safe output regardless of intensity. |
| **Point Density** | Funscript export (5.6) | Number of points, dedupe thresholds | Controls fidelity vs. file size and device performance. |

---

## How this table fits into your full architecture

### The user only adjusts **creative intent**
They think in terms of:

- “Make it smoother.”  
- “Make it follow the rhythm more.”  
- “Make the edging ramp stronger.”  
- “Make it more responsive to fast motion.”  
- “Make it feel more sensual.”  

These map to a small set of intuitive controls.

### The system handles **all the technical complexity**
Behind each control is a chain of:

- optical flow  
- keypoint tracking  
- motion magnitude extraction  
- smoothing  
- segmentation  
- rhythm detection  
- mode classification  
- curve shaping  
- semantic envelopes  
- tension modeling  
- easing and velocity shaping  

The user never sees these details.

### LLMs translate **natural language → parameter sets**
If a user says:

> “Make this feel like a slow, teasing build with a sharp release.”

The LLM translates that into:

- low motion sensitivity  
- high smoothness  
- high tease intensity  
- strong edging ramp  
- low responsiveness to fast motion  
- high stability preference  

Python then executes it deterministically.

---

## A natural next step
Would you like to unify the **audio and video control sets** into a single cross‑modal control panel for hybrid audio+video scripting?