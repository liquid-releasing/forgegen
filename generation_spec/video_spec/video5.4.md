Step 5.4 is where the resampled curve from Step 5.3 receives its **final expressive motion profile**. This stage shapes *how* the motion feels: the snap of fast strokes, the glide of slow ones, the tension of edging, the softness of tease, and the natural acceleration/deceleration within each stroke. It remains a fully deterministic PyTorch module—no LLMs, no training—built from interpolation, convolution, and velocity‑domain shaping.

---

## Easing and velocity shaping in the pipeline
This stage refines the curve’s *temporal dynamics* rather than its geometry. It adjusts:

- how quickly the curve rises and falls  
- how velocity changes within each stroke  
- how easing differs by mode (slow, fast, tease, edging, chaotic, break)  
- how transitions between strokes feel  
- how tempo changes influence velocity  

This is the last major shaping step before semantic adjustments (Step 5.5) and funscript export (Step 5.6).

---

## Inputs and outputs

### Inputs  
- `resampled_motion`: tensor `(T,)` or `(B, T)` from Step 5.3  
- `timestamps`: tensor `(T,)`  
- `sections`: list of `{start_idx, end_idx, mode}`  
- `tempo_curve`: tensor `(T,)`  
- optional:  
  - `easing_profile` (from Step 5.1)  
  - `velocity_profile`  
  - `mode_velocity_strength`  
  - `global_ease_strength`  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `final_shaped_motion`: tensor `(T,)` or `(B, T)`  
- optional:  
  - `final_velocity_profile`  
  - `easing_map`  

---

## Module name  
`signal/shaping/easing_velocity_shaping_pytorch.py`

---

## Responsibilities  
- Apply mode‑specific easing curves  
- Shape velocity within each stroke  
- Adjust easing based on tempo changes  
- Smooth transitions between strokes and sections  
- Preserve amplitude and timing  
- Run efficiently on GPU  

---

## Core components

### 1. Stroke‑level velocity extraction  
Velocity is the first derivative of the resampled curve:

\[
v_t = \frac{pos_{t+1} - pos_t}{dt}
\]

PyTorch:

```
dt = timestamps[1:] - timestamps[:-1]
v = (resampled_motion[1:] - resampled_motion[:-1]) / dt
```

This velocity curve is the basis for shaping.

---

### 2. Mode‑specific velocity shaping  
Each mode has a characteristic velocity profile:

- **slow** — low peak velocity, smooth transitions  
- **fast** — high peak velocity, sharp transitions  
- **tease** — low amplitude but high velocity spikes  
- **edging** — high amplitude, slow rise, fast fall  
- **chaotic** — minimal shaping, preserve irregularity  
- **break** — near‑zero velocity  

Implement as multiplicative shaping:

```
if mode == SLOW:
    v_shaped = v * 0.7
elif mode == FAST:
    v_shaped = v * 1.2
elif mode == TEASE:
    v_shaped = v * (1 + 0.5 * torch.sin(local_phase))
elif mode == EDGING:
    v_shaped = v * torch.sigmoid( (t - peak_t) * k )
...
```

---

### 3. Easing curve application  
Easing modifies how the curve transitions between points.

Common easing functions:

- **smoothstep** for slow  
- **cubic** for fast  
- **sigmoid** for edging  
- **linear** for chaotic  
- **quadratic** for tease  

Apply easing to normalized stroke phase:

```
phase = (t - start_t) / (end_t - start_t)
eased_phase = easing_fn(phase)
```

Then reconstruct position:

```
pos = start_pos + (end_pos - start_pos) * eased_phase
```

---

### 4. Tempo‑aware shaping  
Tempo changes from Step 4.5 influence velocity:

- acceleration → sharper easing, higher velocity  
- deceleration → smoother easing, lower velocity  
- drift → gradual adjustment  

Example:

```
v_shaped = v_shaped * (1 + accel_factor * tempo_derivative)
```

---

### 5. Velocity smoothing  
After shaping, velocity may contain micro‑spikes. Smooth with a small kernel:

```
kernel = gaussian_kernel(size=5, sigma=1).to(device)
v_smooth = F.conv1d(v_shaped_reshaped, kernel, padding=2)
```

---

### 6. Curve reconstruction  
Rebuild the motion curve from smoothed velocity:

```
final_motion = resampled_motion[0] + torch.cumsum(v_smooth * dt, dim=0)
```

Clamp to `[0, 100]`:

```
final_motion = final_motion.clamp(0, 100)
```

---

### 7. Section boundary blending  
Transitions between modes must be smooth:

```
blend = torch.linspace(0, 1, steps=k).to(device)
final[i:i+k] = final[i:i+k] * (1-blend) + next[i:i+k] * blend
```

This prevents abrupt changes in easing or velocity.

---

## Runtime expectations  
- **GPU:** <1 second  
- **CPU:** 1–3 seconds  
- Memory footprint: small  
- Deterministic output  

---

## Developer tasks

### Core implementation  
- velocity extraction  
- mode‑specific shaping  
- easing application  
- tempo‑aware shaping  
- velocity smoothing  
- curve reconstruction  
- boundary blending  
- batch handling  
- device management  

### Testing  
- easing correctness  
- velocity shaping correctness  
- amplitude preservation  
- boundary smoothness  
- GPU/CPU parity  

### Integration  
- feed final curve into Step 5.5 (semantic shaping)  
- ensure compatibility with Step 5.3 resampling  
- maintain amplitude range `[0, 100]`  
- expose config for:  
  - `mode_velocity_strength`  
  - `global_ease_strength`  
  - `kernel_size`, `sigma`  

---

## LLM involvement  
This module is strictly mathematical and does not use LLMs.  
Semantic shaping appears in Step 5.5.

---

## Learned version (optional)  
A learned velocity‑shaping model would require:

- raw → human‑edited funscript pairs  
- supervised training on velocity profiles  

But Step 5.4 does not require this.

---

If you want to continue, the next module is **Step 5.5: Semantic shaping**, where mode labels, tempo changes, and behavioral context are used to apply high‑level shaping rules (e.g., edging ramps, tease oscillations, cooldown softening).