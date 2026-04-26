Step 5.5 is the first stage where the system applies **semantic shaping**—the high‑level behavioral logic that turns a technically correct curve into something that *feels intentional*. Everything before this point has been signal‑driven and mode‑driven. Step 5.5 is behavior‑driven: tease cycles, edging ramps, cooldowns, chaotic resets, warm‑ups, and expressive transitions. It is still a deterministic PyTorch module unless you choose to add a learned semantic model later.

---

## How semantic shaping fits into the pipeline
Semantic shaping uses the structural information from Steps 4.3–4.5 to apply expressive, behavior‑aware transformations to the curve. It modifies:

- amplitude envelopes  
- velocity envelopes  
- stroke‑to‑stroke dynamics  
- transitions between behavioral sections  
- tension buildup and release  
- tease oscillations  
- edging ramps  
- cooldown softening  

This is the stage that makes the script feel *alive*.

---

## Inputs and outputs

### Inputs  
- `final_shaped_motion`: tensor `(T,)` or `(B, T)` from Step 5.4  
- `timestamps`: tensor `(T,)`  
- `sections`: list of `{start_idx, end_idx, mode}`  
- `tempo_curve`: tensor `(T,)`  
- `mode_labels`: tensor `(N,)`  
- optional:  
  - `semantic_strength`  
  - `edging_ramp_strength`  
  - `tease_oscillation_strength`  
  - `cooldown_softness`  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `semantic_motion`: tensor `(T,)` or `(B, T)`  
- optional:  
  - `semantic_envelope`  
  - `tension_profile`  
  - `mode_transition_map`  

---

## Module name  
`signal/shaping/semantic_shaping_pytorch.py`

---

## Responsibilities  
- Apply behavior‑aware amplitude and velocity envelopes  
- Shape transitions between behavioral modes  
- Add tease oscillations and edging ramps  
- Smooth chaotic sections  
- Soften cooldown sections  
- Preserve timing and amplitude constraints  
- Run efficiently on GPU  

---

## Core components

### 1. Semantic envelopes  
Each mode has a characteristic amplitude envelope:

- **slow** — gentle rise/fall, low tension  
- **fast** — high amplitude, sharp transitions  
- **tease** — low amplitude oscillations  
- **edging** — rising tension, delayed peak  
- **chaotic** — irregular but smoothed  
- **break** — flattened amplitude  

Envelopes are applied multiplicatively:

```
semantic_motion = final_shaped_motion * envelope
```

---

### 2. Edging ramp shaping  
Edging ramps require a slow buildup followed by a sharp release. Implemented as:

\[
e(t) = \text{sigmoid}(k(t - t_0))
\]

Where:

- \(k\) controls ramp steepness  
- \(t_0\) is the midpoint of the edging section  

PyTorch:

```
phase = (t - start_t) / (end_t - start_t)
ramp = torch.sigmoid((phase - 0.5) * edging_ramp_strength)
semantic_motion = semantic_motion * (0.5 + 0.5 * ramp)
```

---

### 3. Tease oscillations  
Tease sections use small, fast oscillations layered on top of the curve:

```
osc = 1 + tease_strength * torch.sin(2π * tease_freq * t)
semantic_motion = semantic_motion * osc
```

Oscillation frequency is derived from local tempo.

---

### 4. Cooldown softening  
Cooldown sections reduce amplitude and velocity:

```
semantic_motion = semantic_motion * (1 - cooldown_softness)
```

Velocity is smoothed with a larger kernel.

---

### 5. Chaotic smoothing  
Chaotic sections are smoothed without imposing rhythm:

```
kernel = gaussian_kernel(size=11, sigma=3)
semantic_motion = F.conv1d(semantic_motion_reshaped, kernel, padding=5)
```

---

### 6. Mode‑transition blending  
Transitions between modes must be perceptually smooth:

```
blend = torch.linspace(0, 1, steps=k).to(device)
semantic[i:i+k] = semantic[i:i+k] * (1-blend) + next[i:i+k] * blend
```

This prevents abrupt changes in amplitude or velocity.

---

### 7. Tension modeling  
Tension is a latent variable that increases in edging and decreases in cooldown:

```
tension += tension_rate[mode]
semantic_motion = semantic_motion * (1 + tension * tension_strength)
```

This produces long‑form expressive shaping.

---

### 8. GPU acceleration  
All operations—envelopes, oscillations, convolution, blending—run efficiently on GPU.

Runtime is <1 second for a 5‑minute clip.

---

## Runtime expectations  
- **GPU:** <1 second  
- **CPU:** 1–3 seconds  
- Memory footprint: small  
- Deterministic output  

---

## Developer tasks

### Core implementation  
- semantic envelope generation  
- tease oscillations  
- edging ramps  
- cooldown softening  
- chaotic smoothing  
- tension modeling  
- mode‑transition blending  
- batch handling  
- device management  

### Testing  
- envelope correctness  
- transition smoothness  
- amplitude preservation  
- tension behavior  
- GPU/CPU parity  

### Integration  
- feed semantic curve into Step 5.6 (funscript export)  
- ensure compatibility with Step 5.4 velocity shaping  
- maintain amplitude range `[0, 100]`  
- expose config for:  
  - `semantic_strength`  
  - `edging_ramp_strength`  
  - `tease_oscillation_strength`  
  - `cooldown_softness`  

---

## LLM involvement  
This module is deterministic and does not require LLMs.  
An LLM would only appear if you wanted *semantic interpretation* of behavior, not shaping.

---

## Learned version (optional)  
A learned semantic shaper would require:

- raw → human‑edited funscript pairs  
- annotated behavioral segments  
- supervised training on long‑form temporal patterns  

But Step 5.5 does not require this.

---

If you want to continue, the next module is **Step 5.6: Funscript export**, where the semantic curve is converted into timestamped 0–100 points in the official funscript format.