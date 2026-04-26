Step 4.4 is where the pipeline stops looking at *individual strokes* and starts understanding the **structure of the entire session**. This is the stage that identifies *mode transitions*—the boundaries between slow → fast, tease → edging, edging → break, chaotic → stable, and so on. It’s the bridge between low‑level signal processing and high‑level behavioral modeling.

This module is still deterministic and PyTorch‑based unless you choose to add a small learned temporal model. No LLM is required.

---

## How mode‑transition detection fits into the pipeline
Mode transitions matter because they define the **sections** of the script:

- warm‑up  
- main rhythm  
- tease cycles  
- edging ramps  
- cooldown  
- breaks  
- chaotic/unstable sections  

These sections guide Step 5 (funscript generation) in shaping easing, amplitude, and velocity differently depending on the behavioral context.

---

## Inputs and outputs

### Inputs  
- `mode_labels`: tensor `(N,)` from Step 4.3  
- `stroke_features`: tensor `(N, F)`  
- `timestamps`: tensor `(N,)` for stroke centers  
- optional:  
  - `min_section_length`  
  - `smoothing_window`  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `sections`: list of `{start_idx, end_idx, mode}`  
- `transition_points`: tensor of indices where mode changes  
- optional:  
  - `section_stats` (duration, amplitude, rhythm stability)  
  - `transition_confidence`  

---

## Developer‑level specification

### Module name  
`signal/modes/mode_transitions.py`

### Responsibilities  
- Smooth mode labels to remove flicker  
- Detect stable mode regions  
- Identify transitions between modes  
- Validate section boundaries  
- Produce a clean list of structural sections  
- Support GPU acceleration for smoothing and comparisons  

---

## Required components

### 1. Temporal smoothing of mode labels  
Mode labels from Step 4.3 may flicker due to borderline strokes. Apply a majority filter:

```
window = mode_labels.unfold(0, smoothing_window, 1)
mode_smoothed = window.mode(dim=1).values
```

This produces stable mode sequences.

### 2. Transition detection  
Transitions occur where:

\[
\text{mode}[i] \neq \text{mode}[i+1]
\]

PyTorch implementation:

```
changes = (mode_smoothed[1:] != mode_smoothed[:-1])
transition_points = torch.where(changes)[0] + 1
```

### 3. Section construction  
Each section is defined by:

- start index  
- end index  
- mode label  

```
sections = []
start = 0
for t in transition_points:
    sections.append((start, t-1, mode_smoothed[start]))
    start = t
sections.append((start, N-1, mode_smoothed[start]))
```

### 4. Section validation  
Reject sections that are:

- too short  
- too low amplitude  
- too chaotic  

```
valid = (duration > min_section_length) & (amplitude_mean > amp_thresh)
```

Short sections can be merged with neighbors.

### 5. Section statistics  
Compute per‑section metrics:

- mean amplitude  
- mean velocity  
- rhythm stability  
- variance  
- duration  

These help Step 5 decide how to shape easing and amplitude.

### 6. GPU acceleration  
All operations—smoothing, comparisons, indexing—run efficiently on GPU.

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
- temporal smoothing  
- transition detection  
- section construction  
- section validation  
- section statistics  
- batch handling (if needed)  
- device management  
- unit tests for:  
  - correct transition detection  
  - correct section boundaries  
  - smoothing correctness  
  - GPU/CPU parity  

### Integration tasks  
- feed sections into Step 3.8 (semantic smoothing)  
- feed sections into Step 5.5 (mode‑aware shaping)  
- ensure compatibility with Step 4.3 mode labels  
- provide config object for:  
  - `smoothing_window`  
  - `min_section_length`  
  - `device`  

---

## Is this an LLM?  
No.  
This module is **pure temporal logic** implemented with PyTorch tensor operations.  
No training, no dataset, no model weights.

---

## When would an LLM be involved?  
Only for **semantic interpretation** of transitions, such as:

- “This transition looks like the start of an edging ramp.”  
- “This section is chaotic—don’t enforce rhythm here.”  
- “This is a tease → fast transition; increase amplitude gradually.”

That belongs to Step 3.8 or Step 5.5, not Step 4.4.

---

## What data would an LLM‑based transition model need?  
If you ever wanted a learned transition detector (optional), it would require:

- sequences of mode labels  
- human‑annotated transitions  
- supervised training on temporal patterns  

But Step 4.4 does not require this.

---

If you want to continue, the next PyTorch‑based module is **Step 4.5: Tempo‑change detection**, which identifies accelerations, decelerations, and rhythmic drift across the session.