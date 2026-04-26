Step 4.5 focuses on **tempo‑change detection**, the part of the pipeline that identifies accelerations, decelerations, rhythmic drift, and stability changes across the session. This is where the system stops looking at rhythm as a single global value and starts understanding how rhythm *evolves over time*. It’s still a deterministic PyTorch module—no LLMs, no training—just temporal math, FFT windows, and derivative analysis.

---

## How tempo‑change detection fits into the pipeline
This stage takes the outputs of Steps 4.1–4.4 (dominant frequency, stroke features, mode labels, sections) and identifies:

- accelerations (tempo increasing)  
- decelerations (tempo decreasing)  
- stable rhythm zones  
- chaotic or unstable rhythm zones  
- drift (gradual tempo change over long windows)  
- abrupt transitions (e.g., tease → fast)  

These tempo‑change markers guide Step 5 in shaping easing, amplitude, and velocity differently depending on whether the user is entering a ramp‑up, ramp‑down, or stable rhythm section.

---

## Inputs and outputs

### Inputs  
- `stroke_timestamps`: tensor `(N,)`  
- `stroke_intervals`: tensor `(N,)` (time between strokes)  
- `dominant_frequency`: float from Step 4.1  
- `mode_labels`: tensor `(N,)`  
- optional:  
  - `window_size` for local tempo estimation  
  - `drift_threshold`  
  - `accel_threshold`  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `tempo_curve`: tensor `(N,)` representing instantaneous tempo  
- `tempo_changes`: list of `{index, type}` where type ∈ {accel, decel, drift, stable}  
- optional:  
  - `tempo_segments`: list of stable tempo regions  
  - `tempo_stats`: mean, variance, drift rate  

---

## Developer‑level specification

### Module name  
`signal/rhythm/tempo_change_detection.py`

### Responsibilities  
- Compute instantaneous tempo from stroke intervals  
- Smooth the tempo curve  
- Detect accelerations, decelerations, and drift  
- Identify stable vs. unstable rhythm regions  
- Produce tempo‑change markers for Step 5  

---

## Required components

### 1. Instantaneous tempo computation  
Tempo is the inverse of the inter‑stroke interval:

\[
f_i = \frac{1}{\Delta t_i}
\]

PyTorch implementation:

```
tempo = 1.0 / stroke_intervals
```

### 2. Tempo smoothing  
Use a Gaussian or triangular kernel to remove jitter:

```
kernel = gaussian_kernel(size, sigma).to(device)
tempo_smoothed = F.conv1d(tempo_reshaped, kernel, padding=pad)
```

### 3. Tempo derivative  
Acceleration is the first derivative of tempo:

\[
a_i = f_{i+1} - f_i
\]

PyTorch:

```
accel = tempo_smoothed[1:] - tempo_smoothed[:-1]
```

### 4. Acceleration and deceleration detection  
Threshold‑based classification:

```
accel_mask = accel > accel_threshold
decel_mask = accel < -accel_threshold
stable_mask = accel.abs() < stable_threshold
```

### 5. Drift detection  
Drift is a slow, long‑term change in tempo:

- compute a low‑frequency trend using a large kernel  
- compare trend slope to `drift_threshold`

```
trend = F.conv1d(tempo_reshaped, large_kernel, padding=pad)
drift = trend[1:] - trend[:-1]
drift_mask = drift.abs() > drift_threshold
```

### 6. Tempo‑change event construction  
Each event is a dictionary:

```
events = []
for i in indices:
    if accel_mask[i]: events.append({i, "accel"})
    if decel_mask[i]: events.append({i, "decel"})
    if drift_mask[i]: events.append({i, "drift"})
    if stable_mask[i]: events.append({i, "stable"})
```

### 7. Tempo segmentation  
Group consecutive stable or unstable regions:

```
segments = group_by_label(events)
```

### 8. GPU acceleration  
All operations—division, convolution, derivative, thresholding—run efficiently on GPU.

Runtime is <1 second for 9,000 strokes.

---

## Runtime expectations  
- **GPU:** <1 second  
- **CPU:** 1–2 seconds  
- Memory footprint: negligible  
- Deterministic output  

---

## What a developer must implement

### Core tasks  
- instantaneous tempo computation  
- smoothing  
- derivative calculation  
- threshold‑based classification  
- drift detection  
- event construction  
- segmentation  
- unit tests for:  
  - correct tempo calculation  
  - acceleration detection  
  - drift detection  
  - GPU/CPU parity  

### Integration tasks  
- feed tempo‑change events into Step 5.5 (mode‑aware shaping)  
- ensure compatibility with Step 4.4 section boundaries  
- ensure smoothing parameters match Step 3.7 rhythm smoothing  
- provide config object for:  
  - `accel_threshold`  
  - `drift_threshold`  
  - `window_size`  
  - `device`  

---

## Is this an LLM?  
No.  
This module is **pure temporal analysis** implemented with PyTorch tensor ops.  
No training, no dataset, no model weights.

---

## When would an LLM be involved?  
Only for **semantic interpretation** of tempo changes, such as:

- “This acceleration looks like an edging ramp.”  
- “This deceleration is a cooldown.”  
- “This drift indicates fatigue or tease behavior.”  

That belongs to Step 3.8 or Step 5.5, not Step 4.5.

---

## What data would an LLM‑based tempo model need?  
If you ever wanted a learned tempo‑change classifier (optional), it would require:

- sequences of tempo curves  
- human‑annotated tempo‑change labels  
- supervised training on temporal patterns  

But Step 4.5 does not require this.

---

If you want to continue, the next PyTorch‑based module is **Step 5.1: Curve shaping**, where the system begins turning the processed motion curve into a funscript‑ready 0–100 trajectory with easing, interpolation, and mode‑aware shaping.