A PyTorch‑based **velocity‑limiting module** in Step 3.4 is a deterministic safety and realism layer. It ensures that the motion curve produced by Steps 1–3 never exceeds physically plausible or device‑safe speeds. This module is simple, fast, and fully GPU‑accelerated, and it does **not** involve any LLMs or training.

---

## Velocity limiting in the pipeline
This module takes the smoothed motion curve and enforces a maximum allowed change in position per unit time. It prevents:

- sudden spikes from optical‑flow noise  
- unrealistic jumps from keypoint tracking errors  
- unsafe transitions that exceed device velocity limits  
- artifacts introduced by segmentation or smoothing  

It is mathematically straightforward but essential for script safety and quality.

---

## Inputs and outputs

### Inputs  
- `motion`: PyTorch tensor shaped `(T,)` or `(B, T)`  
- `timestamps`: PyTorch tensor shaped `(T,)` in milliseconds  
- `max_velocity`: scalar (units: position units per millisecond)  
- optional:  
  - `device`: `"cuda"` or `"cpu"`  
  - `mode`: `"clamp"` or `"subdivide"`

### Outputs  
- `velocity_safe_motion`: PyTorch tensor of identical shape  
- optional:  
  - `velocity_profile`: tensor of instantaneous velocities  
  - `mask`: boolean tensor marking clamped points  

---

## Developer‑level specification

### Module name  
`signal/velocity/velocity_limit_pytorch.py`

### Responsibilities  
- Compute instantaneous velocity across the motion curve  
- Detect segments exceeding the allowed velocity  
- Apply correction using clamping or subdivision  
- Preserve the original length and timestamps  
- Run efficiently on GPU for large sequences  

---

## Required components

### 1. Velocity computation  
Velocity is computed as:

\[
v_t = \frac{pos_{t+1} - pos_t}{time_{t+1} - time_t}
\]

Implemented in PyTorch:

```
dt = timestamps[1:] - timestamps[:-1]
dp = motion[1:] - motion[:-1]
velocity = dp / dt
```

### 2. Violation detection  
Identify indices where:

\[
|v_t| > v_{\text{max}}
\]

```
mask = velocity.abs() > max_velocity
```

### 3. Correction modes  
Two correction strategies are required.

#### Mode A: Clamp  
Clamp the delta to the maximum allowed:

```
dp_clamped = dp.clamp(-max_velocity * dt, max_velocity * dt)
motion_safe = torch.cat([motion[0:1], motion[0] + torch.cumsum(dp_clamped, dim=0)])
```

#### Mode B: Subdivide (higher quality)  
If a jump is too large, insert intermediate points:

- compute required number of subdivisions  
- interpolate linearly  
- preserve timestamps  

This produces smoother transitions but requires a dynamic tensor.

### 4. Batch support  
If input is `(B, T)`:

- compute velocity per batch  
- apply clamping per batch  
- preserve batch dimension  

### 5. GPU acceleration  
All operations run on GPU:

- vectorized velocity computation  
- vectorized clamping  
- cumulative sums  

Runtime is <1 second for 9,000 frames.

---

## Runtime expectations  
- **GPU:** <1 second  
- **CPU:** 1–2 seconds  
- Memory footprint: negligible  
- Deterministic output  

---

## What a developer must implement

### Core tasks  
- velocity computation  
- violation detection  
- clamping and subdivision logic  
- batch handling  
- device management  
- unit tests for:  
  - shape preservation  
  - velocity correctness  
  - clamping correctness  
  - GPU/CPU parity  

### Integration tasks  
- ensure output feeds into Step 3.5 (amplitude normalization)  
- ensure velocity limits match device constraints  
- ensure compatibility with Step 3.1 smoothing output  
- provide config object for `max_velocity`, `mode`, and `device`  

---

## Is this an LLM?  
No.  
This module is a **pure mathematical transform** implemented with PyTorch tensor ops.  
No training, no dataset, no model weights.

---

## When would an LLM be involved?  
Only for **semantic velocity shaping**, such as:

- “In edging mode, reduce velocity by 20%.”  
- “In slow mode, enforce smoother transitions.”  

That is Step 3.8 (semantic smoothing), not Step 3.4.

---

## What data would an LLM‑based velocity model need?  
If you ever wanted a learned velocity‑shaping model (optional), it would require:

- pairs of raw → human‑edited funscripts  
- annotated mode labels  
- supervised training on temporal patterns  

But Step 3.4 does not require this.

---

If you want to continue, the next PyTorch‑based module is **Step 3.5: Amplitude normalization**, which is another deterministic tensor operation but with its own developer‑level considerations.