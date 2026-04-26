A PyTorch‑based **amplitude‑normalization module** in Step 3.5 is the part of the pipeline that takes your velocity‑safe motion curve and maps it into a consistent **0–100** range used by funscripts. It ensures that every script—regardless of source, camera angle, or motion‑detection method—lands in a predictable amplitude space that downstream steps (pattern detection, mode shaping, easing, export) can rely on.

This module is deterministic, GPU‑accelerated, and requires no training or LLMs.

---

## What amplitude normalization accomplishes  
It solves three core problems:

- Motion extracted from RAFT, MoveNet, YOLO, or ByteTrack can have wildly different ranges.  
- Some scenes produce tiny motion (e.g., subtle wrist movement), others huge (full‑body motion).  
- Downstream steps expect a **standardized amplitude** so that “50” always means “mid‑stroke.”

Normalization ensures:

- **0** = minimum motion  
- **100** = maximum motion  
- everything else is proportionally scaled  
- optional compression/expansion for stylistic shaping  

---

## Inputs and outputs

### Inputs  
- `motion`: PyTorch tensor `(T,)` or `(B, T)`  
- optional:  
  - `min_val` and `max_val` (manual override)  
  - `clip_percentile` (e.g., 1%–99% to remove outliers)  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `normalized_motion`: PyTorch tensor of identical shape, values in `[0, 100]`  
- optional:  
  - `scale_params`: `(min_used, max_used)` for reproducibility  
  - `mask`: boolean tensor marking clipped values  

---

## Developer‑level specification

### Module name  
`signal/normalization/amplitude_normalization_pytorch.py`

### Responsibilities  
- Compute min/max or percentile‑based bounds  
- Normalize motion into `[0, 100]`  
- Optionally clip outliers  
- Support batch and GPU acceleration  
- Preserve tensor shape  
- Provide deterministic output  

---

## Required components

### 1. Bound computation  
Two modes are required:

**A. Direct min/max**

```
min_val = motion.min()
max_val = motion.max()
```

**B. Percentile‑based (recommended)**  
Removes extreme spikes before scaling.

```
min_val = torch.quantile(motion, clip_low)
max_val = torch.quantile(motion, clip_high)
```

### 2. Normalization formula  
\[
norm = \frac{motion - min}{max - min} \times 100
\]

PyTorch implementation:

```
norm = (motion - min_val) / (max_val - min_val + 1e-6)
norm = norm.clamp(0, 1) * 100
```

### 3. Batch support  
If input is `(B, T)`:

- compute bounds per batch  
- normalize each batch independently  

### 4. GPU acceleration  
All operations run on GPU:

- quantiles  
- subtraction  
- division  
- clamping  

Runtime is <1 second for 9,000 frames.

### 5. Optional amplitude compression  
Some scripts benefit from compressing extremes:

- logarithmic compression  
- sigmoid compression  
- custom curves  

These can be implemented as optional post‑processing:

```
norm = 100 * torch.sigmoid((norm/100 - 0.5) * strength)
```

---

## Runtime expectations  
- **GPU:** <1 second  
- **CPU:** 1–2 seconds  
- Memory footprint: negligible  
- Deterministic output  

---

## What a developer must implement

### Core tasks  
- min/max or percentile bound computation  
- normalization formula  
- batch handling  
- device management  
- optional compression curves  
- unit tests for:  
  - shape preservation  
  - correct scaling  
  - percentile clipping  
  - GPU/CPU parity  

### Integration tasks  
- ensure output feeds into Step 3.6 (stroke segmentation)  
- ensure amplitude range matches Step 5 (funscript generation)  
- ensure compatibility with Step 3.4 velocity‑limited output  
- provide config object for:  
  - `clip_low`, `clip_high`  
  - `compression_strength`  
  - `device`  

---

## Is this an LLM?  
No.  
This module is a **pure mathematical transform** implemented with PyTorch tensor ops.  
No training, no dataset, no model weights.

---

## When would an LLM be involved?  
Only for **semantic amplitude shaping**, such as:

- “In edging mode, reduce amplitude by 30%.”  
- “In tease mode, keep amplitude low but velocity high.”  

That is Step 3.8 (semantic smoothing), not Step 3.5.

---

## What data would an LLM‑based amplitude model need?  
If you ever wanted a learned amplitude‑shaping model (optional), it would require:

- pairs of raw → human‑edited funscripts  
- annotated mode labels  
- supervised training on temporal patterns  

But Step 3.5 does not require this.

---

If you want to continue, the next PyTorch‑based module is **Step 3.6: Stroke segmentation**, which is where the normalized motion curve becomes discrete stroke units.