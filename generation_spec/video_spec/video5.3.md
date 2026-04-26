Step 5.3 is where the refined motion curve from Step 5.2 is turned into a **precisely timed, uniformly sampled, funscript‑ready signal**. Everything up to now has been about *shape*; Step 5.3 is about *temporal correctness*. This stage ensures that the curve aligns perfectly with timestamps, frame rates, and the funscript spec.

---

## Step 5.3 — Interpolation & Resampling (Developer Specification)

### Purpose  
This module converts the refined motion curve into a **uniformly sampled**, **timestamp‑aligned**, **0–100 amplitude** trajectory. It handles:

- interpolation between irregular stroke timings  
- resampling to a fixed temporal resolution  
- alignment with funscript timestamps  
- correction of micro‑timing drift  
- preservation of curve shape from Step 5.2  

It is fully deterministic and implemented with PyTorch tensor ops.

---

## Inputs and outputs

### Inputs  
- `refined_motion`: tensor `(T,)` or `(B, T)` from Step 5.2  
- `timestamps`: tensor `(T,)` in milliseconds  
- optional:  
  - `target_rate` (e.g., 50–100 Hz)  
  - `target_timestamps` (explicit funscript timestamps)  
  - `interpolation_mode` (linear, cubic, spline‑like)  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `resampled_motion`: tensor `(T_resampled,)`  
- `resampled_timestamps`: tensor `(T_resampled,)`  
- optional:  
  - `interpolation_weights`  
  - `drift_correction_profile`  

---

## Module name  
`signal/resampling/interpolation_resampling_pytorch.py`

---

## Responsibilities  
- Generate a uniform timestamp grid  
- Interpolate the refined curve onto the new grid  
- Correct micro‑timing drift  
- Preserve amplitude and shape  
- Support batch and GPU acceleration  

---

## Required components

### 1. Target timestamp generation  
Two modes:

**A. Fixed rate (recommended)**  
For example, 60 Hz:

```
dt = 1000 / target_rate
target_ts = torch.arange(0, timestamps[-1], dt).to(device)
```

**B. Explicit timestamps**  
If the user wants exact funscript timestamps:

```
target_ts = target_timestamps.to(device)
```

---

### 2. Interpolation  
Interpolation maps the original curve to the new timestamps.

#### Linear interpolation  
Fast and stable:

```
resampled = torch.interp(target_ts, timestamps, refined_motion)
```

#### Cubic interpolation  
More expressive curvature:

- Fit cubic coefficients per segment  
- Evaluate at target timestamps  

#### Spline‑like smoothing  
A lightweight spline approximation using convolution:

```
kernel = gaussian_kernel(size=7, sigma=1.5)
smoothed = F.conv1d(refined_motion_reshaped, kernel, padding=3)
```

Then interpolate the smoothed curve.

---

### 3. Micro‑timing drift correction  
Even after Step 5.2, timestamps may drift slightly relative to the ideal beat grid. Correct drift by:

- computing local tempo  
- aligning stroke peaks to nearest target timestamps  
- blending corrected and original positions  

```
corrected_ts = timestamps + drift_strength * (ideal_ts - timestamps)
```

Then interpolate using `corrected_ts`.

---

### 4. Boundary preservation  
Ensure stroke boundaries remain intact:

- do not interpolate across boundaries  
- reset interpolation segments at each stroke  
- preserve peak indices  

This prevents flattening or distortion of stroke shapes.

---

### 5. Batch support  
If input is `(B, T)`:

- generate target timestamps once  
- interpolate each batch independently  
- preserve batch dimension  

---

### 6. GPU acceleration  
All operations—timestamp generation, interpolation, convolution—run efficiently on GPU.

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
- timestamp grid generation  
- interpolation logic  
- drift correction  
- boundary preservation  
- batch handling  
- device management  

### Testing  
- interpolation correctness  
- timestamp alignment  
- amplitude preservation  
- drift correction accuracy  
- GPU/CPU parity  

### Integration  
- feed resampled curve into Step 5.4 (easing & velocity shaping)  
- ensure compatibility with Step 5.2 refined curve  
- maintain amplitude range `[0, 100]`  
- expose config for:  
  - `target_rate`  
  - `interpolation_mode`  
  - `drift_strength`  

---

## LLM involvement  
This module is strictly mathematical and does not use LLMs.  
Semantic shaping appears later in Step 5.5.

---

## Learned version (optional)  
A learned interpolation model would require:

- raw → human‑edited funscript pairs  
- supervised training on timing corrections  

But Step 5.3 does not require this.

---

If you want to continue, the next PyTorch‑based module is **Step 5.4: Easing & velocity shaping**, where the resampled curve is given its final expressive motion profile before export.