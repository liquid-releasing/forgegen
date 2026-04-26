Step 3.7 is where the pipeline begins to impose **rhythmic structure** on the segmented strokes. Up to this point, everything has been signal‑driven: RAFT, MoveNet, smoothing, velocity limiting, amplitude normalization, and segmentation. Step 3.7 is the first stage that shapes the motion curve into something that feels intentional, rhythmic, and human.

This module is still **pure PyTorch**, fully deterministic, and requires **no LLMs**. It uses convolution, interpolation, and temporal alignment to enforce rhythmic consistency.

---

## Purpose of pattern smoothing and rhythm enforcement
The goal is to take the segmented strokes and:

- align them to a consistent beat grid  
- remove micro‑timing jitter  
- enforce consistent stroke spacing  
- smooth amplitude drift  
- correct irregular stroke durations  
- prepare the curve for mode classification and funscript generation  

This is the “make it feel like a real rhythm” stage.

---

## Inputs and outputs

### Inputs  
- `motion`: PyTorch tensor `(T,)` or `(B, T)`  
- `timestamps`: PyTorch tensor `(T,)`  
- `strokes`: list of stroke segments from Step 3.6  
- optional:  
  - `target_rhythm` (e.g., median stroke duration)  
  - `beat_grid_strength`  
  - `amplitude_smoothing_strength`  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `smoothed_motion`: PyTorch tensor `(T,)` or `(B, T)`  
- optional:  
  - `aligned_strokes`: updated stroke boundaries  
  - `beat_grid`: tensor of idealized stroke centers  
  - `quality_flags`: jitter, drift, irregularity markers  

---

## Developer‑level specification

### Module name  
`signal/patterns/pattern_smoothing_pytorch.py`

### Responsibilities  
- Compute rhythmic statistics from segmented strokes  
- Build a beat grid (idealized stroke centers)  
- Align actual strokes to the beat grid  
- Smooth amplitude and timing drift  
- Preserve the original motion curve shape  
- Run efficiently on GPU  

---

## Required components

### 1. Rhythm estimation  
Compute the median stroke duration:

\[
d_{\text{median}} = \text{median}(t_{\text{end}} - t_{\text{start}})
\]

Compute the median inter‑stroke interval:

\[
\Delta t_{\text{median}} = \text{median}(t_{\text{peak}_{i+1}} - t_{\text{peak}_i})
\]

These define the **target rhythm**.

### 2. Beat grid construction  
Build an idealized sequence of stroke centers:

```
beat_grid = first_peak + torch.arange(num_strokes) * median_interval
```

This grid is used to align actual strokes.

### 3. Stroke alignment  
For each stroke:

- compute offset from beat grid  
- apply partial correction based on `beat_grid_strength`  

\[
t' = t + \alpha (t_{\text{ideal}} - t)
\]

Where:

- \( \alpha \in [0,1] \) controls how strongly strokes snap to the beat grid  
- \( \alpha = 0 \) → no correction  
- \( \alpha = 1 \) → perfect alignment  

### 4. Amplitude smoothing  
Use a 1‑D convolution kernel (Gaussian or triangular):

```
kernel = gaussian_kernel(size, sigma).to(device)
motion_smoothed = F.conv1d(motion_reshaped, kernel, padding=pad)
```

This removes amplitude jitter between strokes.

### 5. Drift correction  
If amplitude drifts upward or downward across the clip:

- compute a low‑frequency trend using a large kernel  
- subtract the trend from the motion curve  
- re‑normalize to `[0, 100]`

### 6. Batch support  
If input is `(B, T)`:

- compute rhythm per batch  
- build beat grid per batch  
- align strokes per batch  
- smooth amplitude per batch  

### 7. GPU acceleration  
All operations—kernel convolution, interpolation, alignment—run on GPU.

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
- rhythm estimation  
- beat grid construction  
- stroke alignment  
- amplitude smoothing  
- drift correction  
- batch handling  
- device management  
- unit tests for:  
  - correct beat grid generation  
  - alignment correctness  
  - amplitude smoothing correctness  
  - GPU/CPU parity  

### Integration tasks  
- ensure output feeds into Step 3.8 (semantic smoothing)  
- ensure alignment does not break velocity limits (Step 3.4)  
- ensure amplitude remains in `[0, 100]` (Step 3.5)  
- provide config object for:  
  - `beat_grid_strength`  
  - `amplitude_smoothing_strength`  
  - `kernel_size`, `sigma`  
  - `device`  

---

## Is this an LLM?  
No.  
This module is a **pure temporal‑signal shaping block** implemented with PyTorch tensor ops.  
No training, no dataset, no model weights.

---

## When would an LLM be involved?  
Only for **semantic rhythm shaping**, such as:

- “This section looks like edging—slow it down.”  
- “This pattern is chaotic—don’t enforce a beat grid here.”  
- “This is a tease segment—use small amplitude oscillations.”  

That is Step 3.8, not Step 3.7.

---

## What data would an LLM‑based rhythm model need?  
If you ever wanted a learned rhythm‑shaping model (optional), it would require:

- raw → human‑edited funscript pairs  
- annotated mode labels  
- supervised training on temporal patterns  

But Step 3.7 does not require this.

---

If you want to continue, the next PyTorch‑based module is **Step 4.1: Rhythm detection using FFT/autocorrelation**, which is where the system identifies dominant frequencies and tempo candidates.