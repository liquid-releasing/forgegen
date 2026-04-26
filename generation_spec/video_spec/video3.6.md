Stroke segmentation is the point in the pipeline where a continuous, normalized motion curve becomes **discrete stroke units**. This is the first moment where the system begins to understand *structure* rather than just *signal*. The PyTorch‑based module in **Step 3.6** is deterministic, GPU‑accelerated, and requires no training or LLMs.

---

## Stroke segmentation in the pipeline
Segmentation identifies the boundaries of individual strokes by analyzing:

- peaks and troughs  
- zero‑crossings of velocity  
- sign changes in first derivative  
- local minima/maxima  
- temporal spacing  

This produces a sequence of stroke intervals that downstream steps use for rhythm detection, mode classification, and funscript generation.

---

## Inputs and outputs

### Inputs  
- `motion`: PyTorch tensor `(T,)` or `(B, T)`  
- `timestamps`: PyTorch tensor `(T,)`  
- optional:  
  - `peak_indices` (from SciPy or PyTorch peak detection)  
  - `min_stroke_duration`  
  - `min_amplitude`  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `strokes`: list or tensor of stroke segments  
  Each segment contains:  
  - `start_idx`  
  - `end_idx`  
  - `peak_idx`  
  - `amplitude`  
  - `duration`  
- optional:  
  - `velocity_profile`  
  - `quality_flags` (e.g., too short, too small)

---

## Developer‑level specification

### Module name  
`signal/segmentation/stroke_segmentation_pytorch.py`

### Responsibilities  
- Compute first derivative (velocity)  
- Detect stroke boundaries using velocity sign changes  
- Validate strokes using amplitude and duration thresholds  
- Support batched input  
- Run efficiently on GPU  
- Produce a clean, structured list of stroke segments  

---

## Required components

### 1. Velocity computation  
Velocity is the first derivative of motion:

\[
v_t = pos_{t+1} - pos_t
\]

PyTorch implementation:

```
velocity = motion[:, 1:] - motion[:, :-1]   # (B, T-1)
```

### 2. Zero‑crossing detection  
A stroke typically ends when velocity changes sign:

```
sign_change = (velocity[:, :-1] > 0) & (velocity[:, 1:] < 0) | \
              (velocity[:, :-1] < 0) & (velocity[:, 1:] > 0)
```

This produces candidate boundaries.

### 3. Peak‑based segmentation (optional but recommended)  
If peak indices are provided:

- each peak becomes the center of a stroke  
- boundaries are midpoints between peaks  

This is more stable than velocity‑only segmentation.

### 4. Stroke extraction  
For each segment:

- `start_idx` = previous boundary  
- `end_idx` = next boundary  
- `peak_idx` = index of max amplitude in segment  
- `amplitude` = `motion[peak_idx] - motion[start_idx]`  
- `duration` = `timestamps[end_idx] - timestamps[start_idx]`

### 5. Stroke validation  
Reject strokes that are:

- too short  
- too low amplitude  
- too noisy  

```
valid = (duration > min_stroke_duration) & (amplitude > min_amplitude)
```

### 6. Batch support  
If input is `(B, T)`:

- compute velocity per batch  
- detect boundaries per batch  
- produce a list of stroke lists per batch  

### 7. GPU acceleration  
All operations—velocity, sign changes, peak selection—run on GPU.

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
- velocity computation  
- sign‑change detection  
- peak‑based segmentation  
- stroke extraction  
- amplitude/duration validation  
- batch handling  
- device management  
- unit tests for:  
  - correct boundary detection  
  - peak alignment  
  - amplitude/duration correctness  
  - GPU/CPU parity  

### Integration tasks  
- ensure output feeds into Step 3.7 (pattern smoothing)  
- ensure segmentation matches amplitude‑normalized motion  
- ensure compatibility with Step 3.4 velocity‑limited output  
- provide config object for:  
  - `min_stroke_duration`  
  - `min_amplitude`  
  - `use_peaks` or `use_velocity`  

---

## Is this an LLM?  
No.  
This module is a **pure signal‑processing and structural‑analysis block** implemented with PyTorch tensor ops.  
No training, no dataset, no model weights.

---

## When would an LLM be involved?  
Only for **semantic segmentation**, such as:

- “This segment looks like edging.”  
- “This is a tease stroke, not a full stroke.”  
- “This pattern is chaotic; treat it differently.”

That is Step 3.8 (semantic smoothing), not Step 3.6.

---

## What data would an LLM‑based segmentation model need?  
If you ever wanted a learned segmentation model (optional), it would require:

- raw motion curves  
- human‑annotated stroke boundaries  
- mode labels  
- supervised training on temporal patterns  

But Step 3.6 does not require this.

---

If you want to continue, the next PyTorch‑based module is **Step 3.7: Pattern smoothing & rhythm enforcement**, which is where segmented strokes are aligned to a consistent rhythmic structure.