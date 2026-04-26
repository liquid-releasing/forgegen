Step 5.1 is the moment where everything you’ve built so far—optical flow, keypoints, smoothing, segmentation, rhythm, clustering, mode transitions—finally becomes a **funscript‑ready motion curve**. This stage is entirely PyTorch‑based, deterministic, and requires no LLMs. It shapes the normalized motion curve into a clean, expressive 0–100 trajectory with easing, interpolation, and mode‑aware shaping hooks.

---

## Step 5.1 — Curve Shaping (Developer Specification)

### Purpose  
Curve shaping transforms the processed motion signal into a **continuous, smooth, expressive trajectory** that can be directly converted into funscript points. It applies:

- easing functions  
- interpolation  
- amplitude shaping  
- velocity shaping  
- mode‑aware adjustments  
- tempo‑aware adjustments  

This is the first step where the curve begins to feel like a *script* rather than a raw signal.

---

## Inputs and outputs

### Inputs  
- `motion`: PyTorch tensor `(T,)` or `(B, T)`  
- `timestamps`: PyTorch tensor `(T,)`  
- `sections`: list of `{start_idx, end_idx, mode}` from Step 4.4  
- `tempo_curve`: tensor `(N,)` from Step 4.5  
- optional:  
  - `easing_type` (linear, quad, cubic, smoothstep, sigmoid)  
  - `mode_shaping_strength`  
  - `velocity_shaping_strength`  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `shaped_motion`: PyTorch tensor `(T,)` or `(B, T)`  
- optional:  
  - `easing_profile`  
  - `velocity_profile`  
  - `mode_adjustments`  

---

## Module name  
`signal/shaping/curve_shaping_pytorch.py`

---

## Responsibilities  
- Apply easing functions to stroke transitions  
- Interpolate between stroke peaks and troughs  
- Adjust amplitude and velocity based on mode  
- Smooth transitions between sections  
- Maintain 0–100 amplitude range  
- Run efficiently on GPU  

---

## Required components

### 1. Stroke‑to‑curve interpolation  
Each stroke segment has:

- start index  
- peak index  
- end index  

Interpolation is applied separately for:

- rising phase (start → peak)  
- falling phase (peak → end)

Using PyTorch interpolation:

```
interp = torch.linspace(0, 1, steps=n).to(device)
```

### 2. Easing functions  
Easing is applied to interpolation to shape the curve.

Common easing functions:

**Linear**
```
e = t
```

**Quadratic**
```
e = t * t
```

**Cubic**
```
e = t * t * t
```

**Smoothstep**
```
e = t * t * (3 - 2*t)
```

**Sigmoid**
```
e = 1 / (1 + torch.exp(-k*(t-0.5)))
```

These are implemented as vectorized PyTorch ops.

### 3. Mode‑aware shaping  
Each mode modifies easing and amplitude:

- **slow** → smoother easing, lower velocity  
- **fast** → sharper easing, higher velocity  
- **tease** → low amplitude, high velocity  
- **edging** → high amplitude, slow easing  
- **chaotic** → minimal shaping, preserve irregularity  
- **break** → flatten amplitude  

Example:

```
if mode == SLOW:
    easing = smoothstep
    amplitude_scale = 0.8
elif mode == FAST:
    easing = cubic
    amplitude_scale = 1.0
elif mode == TEASE:
    easing = quad
    amplitude_scale = 0.4
...
```

### 4. Tempo‑aware shaping  
Tempo changes from Step 4.5 influence:

- stroke spacing  
- easing steepness  
- amplitude scaling  

Acceleration → sharper easing  
Deceleration → smoother easing  
Drift → gradual amplitude adjustment

### 5. Velocity shaping  
Velocity shaping ensures the curve feels natural:

\[
v = \frac{pos_{t+1} - pos_t}{dt}
\]

Adjust velocity using:

- clamping  
- smoothing  
- sigmoid shaping  

### 6. Section boundary smoothing  
Transitions between sections (slow → fast, tease → edging) must be smoothed:

```
blend = torch.linspace(0, 1, steps=k).to(device)
shaped[i:i+k] = shaped[i:i+k] * (1-blend) + next[i:i+k] * blend
```

### 7. GPU acceleration  
All operations—interpolation, easing, blending, scaling—run efficiently on GPU.

Runtime is <1 second for 9,000 frames.

---

## Runtime expectations  
- **GPU:** <1 second  
- **CPU:** 1–3 seconds  
- Memory footprint: negligible  
- Deterministic output  

---

## What a developer must implement

### Core tasks  
- stroke‑level interpolation  
- easing functions  
- mode‑aware shaping  
- tempo‑aware shaping  
- velocity shaping  
- section boundary smoothing  
- batch handling  
- device management  
- unit tests for:  
  - easing correctness  
  - amplitude preservation  
  - mode‑aware shaping  
  - GPU/CPU parity  

### Integration tasks  
- feed shaped curve into Step 5.2 (easing refinement)  
- ensure compatibility with Step 4.4 sections  
- ensure amplitude remains in `[0, 100]`  
- provide config object for:  
  - easing type  
  - shaping strengths  
  - device  

---

## Is this an LLM?  
No.  
This module is **pure curve math** implemented with PyTorch tensor ops.  
No training, no dataset, no model weights.

---

## When would an LLM be involved?  
Only for **semantic shaping**, such as:

- “This section should feel more teasing.”  
- “This edging ramp needs more tension.”  
- “This transition should be smoother.”  

That belongs to Step 3.8 or Step 5.5, not Step 5.1.

---

## What data would an LLM‑based shaping model need?  
If you ever wanted a learned shaping model (optional), it would require:

- raw → human‑edited funscript pairs  
- annotated mode labels  
- supervised training on temporal patterns  

But Step 5.1 does not require this.

---

If you want to continue, the next PyTorch‑based module is **Step 5.2: Easing refinement**, where the system applies micro‑easing and micro‑timing adjustments to make the curve feel even more natural and expressive.