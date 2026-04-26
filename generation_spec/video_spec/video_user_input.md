At a high level, a user really only needs to think about **a small handful of creative‑intent parameters**, not the dozens of internal knobs the pipeline uses. Everything we walked through—segmentation, rhythm detection, clustering, shaping, semantic envelopes—is infrastructure. The user’s job is to express *what they want the script to feel like*, and the system translates that into the right technical behavior.

The most useful way to think about this is: **what aspects of a script does a human actually care about?**  
Those map cleanly to a small, intuitive parameter set.

---

## 🎛️ Core user‑facing parameters (the ones that actually matter)
These are the parameters a user would set directly. Everything else is derived.

### 1) **Overall intensity**
Controls amplitude, velocity, and envelope strength.

- Low → soft, slow, gentle  
- Medium → balanced  
- High → strong, fast, expressive  

This is the single most important global parameter.

---

### 2) **Style / vibe**
This determines the semantic shaping profile.

- Slow  
- Fast  
- Tease  
- Edging  
- Chaotic  
- Rhythmic  
- Hypnotic  
- Mechanical  
- Natural  

Internally, this selects mode envelopes, easing curves, and velocity shaping.

---

### 3) **Tempo preference**
Even though the system detects tempo automatically, the user can bias it:

- Slower than natural  
- Natural  
- Faster than natural  
- Dynamic (allow accelerations/decelerations)  

This influences beat‑grid strength and tempo‑aware shaping.

---

### 4) **Smoothness vs. expressiveness**
A single slider that controls:

- micro‑easing  
- micro‑velocity smoothing  
- jitter tolerance  
- stroke‑to‑stroke continuity  

Smooth → polished, soft, consistent  
Expressive → snappy, punchy, more variation

---

### 5) **Edging behavior**
If the user wants edging, they can specify:

- ramp length  
- ramp strength  
- tension curve  
- release sharpness  

This maps directly to semantic envelopes.

---

### 6) **Tease behavior**
If tease is desired:

- oscillation amplitude  
- oscillation frequency  
- tease duration  

This controls the sinusoidal overlay and amplitude scaling.

---

### 7) **Aggressiveness of shaping**
How strongly the system should override the raw motion:

- Minimal (preserve natural motion)  
- Moderate (clean but recognizable)  
- Strong (fully stylized)  

This maps to shaping strengths in Steps 5.1–5.5.

---

### 8) **Safety / device limits**
A user can set:

- max velocity  
- max acceleration  
- minimum stroke spacing  

This feeds into QA and micro‑correction.

---

### 9) **Point density**
Controls how dense the final funscript is:

- Sparse (minimal points)  
- Normal  
- Dense (high fidelity)  

This affects Step 5.6 export.

---

## 🧩 How these map to the pipeline
The beauty is that each user parameter maps to many internal parameters:

| User parameter | Internal modules affected |
|----------------|---------------------------|
| Intensity | amplitude normalization, velocity shaping, semantic envelopes |
| Style/vibe | mode classification, semantic shaping, easing selection |
| Tempo preference | rhythm detection, beat‑grid strength, tempo‑aware shaping |
| Smoothness/expressiveness | micro‑easing, velocity smoothing, jitter suppression |
| Edging behavior | semantic envelopes, tension modeling |
| Tease behavior | oscillation overlay, amplitude scaling |
| Aggressiveness | shaping strengths across Steps 5.1–5.5 |
| Safety limits | QA, micro‑corrections |
| Point density | export deduplication, resampling |

The user never needs to see the internal knobs—just the creative ones.

---

## 🧠 A simple preset system (optional)
Most users will prefer presets like:

- **Soft & Slow**  
- **Fast & Rhythmic**  
- **Tease Cycle**  
- **Edging Ramp**  
- **Chaotic / Natural**  
- **Mechanical Precision**  
- **High‑Intensity Pulse**  

Each preset is just a bundle of the parameters above.

---

## A question that helps tailor this for your pipeline  
What kind of user experience do you want: a **simple preset‑based UI**, a **few sliders**, or a **full advanced panel** for power users?