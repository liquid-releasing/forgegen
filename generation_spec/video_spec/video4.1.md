Step 4.1 is the first *analysis* stage after the motion curve becomes clean and segmented. This is where the system identifies **dominant tempos, periodicities, and rhythmic structure** using FFT and autocorrelation. It’s still a fully deterministic PyTorch module—no LLMs, no training, no datasets—just GPU‑accelerated math.

---

## Role of Step 4.1 in the pipeline
Rhythm detection extracts the **dominant stroke frequency** and **tempo candidates** from the motion curve. This is essential because:

- downstream mode classification uses rhythm as a feature  
- pattern smoothing (Step 3.7) benefits from knowing the natural tempo  
- funscript generation (Step 5) uses rhythm to shape easing and spacing  
- semantic smoothing (Step 3.8) uses rhythm to detect edging/tease/chaos modes  

This step is the bridge between raw motion and behavioral interpretation.

---

## Inputs and outputs

### Inputs  
- `motion`: PyTorch tensor `(T,)` or `(B, T)`  
- `timestamps`: PyTorch tensor `(T,)`  
- optional:  
  - `fps` (if timestamps not provided)  
  - `window_size` for local rhythm estimation  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `dominant_frequency`: float (Hz)  
- `tempo_candidates`: tensor of top N frequencies  
- `autocorr_peaks`: tensor of lag values  
- optional:  
  - `spectral_power`: FFT magnitude spectrum  
  - `quality_flags` (e.g., low periodicity, chaotic motion)

---

## Developer‑level specification

### Module name  
`signal/rhythm/rhythm_detection_pytorch.py`

### Responsibilities  
- Compute FFT‑based frequency spectrum  
- Compute autocorrelation for temporal periodicity  
- Extract dominant frequencies  
- Support batched input  
- Run efficiently on GPU  
- Provide rhythm features for Step 4.2 and Step 4.3

---

## Required components

### 1. FFT‑based frequency analysis  
Compute FFT:

```
fft = torch.fft.rfft(motion)
power = fft.abs()
```

Compute frequency bins:

```
freqs = torch.fft.rfftfreq(T, d=dt)
```

Extract dominant frequency:

```
dominant_idx = power.argmax()
dominant_frequency = freqs[dominant_idx]
```

### 2. Autocorrelation  
Autocorrelation reveals periodicity even when FFT is noisy:

```
autocorr = torch.nn.functional.conv1d(
    motion.unsqueeze(0).unsqueeze(0),
    motion.flip(0).unsqueeze(0).unsqueeze(0),
    padding=T-1
).squeeze()
```

Find peaks:

```
peaks = detect_peaks(autocorr)
```

Convert lag → frequency:

\[
f = \frac{1}{\text{lag} \cdot dt}
\]

### 3. Combined frequency estimation  
Blend FFT and autocorrelation:

- FFT gives strong global periodicity  
- Autocorrelation gives robust local periodicity  

Weighted combination:

```
freq = 0.7 * fft_freq + 0.3 * autocorr_freq
```

### 4. Batch support  
If input is `(B, T)`:

- compute FFT per batch  
- compute autocorrelation per batch  
- extract dominant frequencies per batch  

### 5. GPU acceleration  
FFT and convolution are GPU‑optimized:

- FFT: `torch.fft.rfft`  
- Autocorrelation: `conv1d`  
- Peak detection: vectorized ops  

Runtime is 1–3 seconds for a 5‑minute clip.

---

## Runtime expectations  
- **GPU:** 1–3 seconds  
- **CPU:** 5–10 seconds  
- Memory footprint: small (<200MB)  
- Deterministic output  

---

## What a developer must implement

### Core tasks  
- FFT computation  
- autocorrelation computation  
- peak detection  
- frequency extraction  
- batch handling  
- device management  
- unit tests for:  
  - FFT correctness  
  - autocorrelation symmetry  
  - frequency accuracy  
  - GPU/CPU parity  

### Integration tasks  
- feed dominant frequency into Step 4.2 (pattern clustering)  
- feed rhythm features into Step 4.3 (mode classification)  
- ensure compatibility with Step 3.7’s beat grid  
- provide config object for:  
  - `window_size`  
  - `fft_weight`, `autocorr_weight`  
  - `device`  

---

## Is this an LLM?  
No.  
This module is **pure signal analysis** using PyTorch’s FFT and convolution ops.  
No training, no dataset, no model weights.

---

## When would an LLM be involved?  
Only for **semantic rhythm interpretation**, such as:

- “This rhythm looks like edging.”  
- “This is chaotic motion—ignore FFT.”  
- “This is a tease pattern—use a slower beat grid.”  

That is Step 3.8 or Step 4.3, not Step 4.1.

---

## What data would an LLM‑based rhythm model need?  
If you ever wanted a learned rhythm classifier (optional), it would require:

- raw motion curves  
- human‑annotated rhythm labels  
- supervised training on temporal patterns  

But Step 4.1 does not require this.

---

If you want to continue, the next PyTorch‑based module is **Step 4.2: Pattern clustering (KMeans/DBSCAN/HDBSCAN)**, which groups strokes into behavioral clusters like slow, fast, chaotic, tease, or edging.