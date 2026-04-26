Step 4.3 is the first stage in your pipeline where **behavioral interpretation** becomes possible. Everything before this point has been signal‑level math: smoothing, segmentation, clustering, FFT, autocorrelation. Step 4.3 takes those numerical features and assigns each stroke (or stroke group) a **mode label** such as *slow*, *fast*, *tease*, *edging*, *break*, or *chaotic*.

This module can be implemented in two ways:

1) **Deterministic PyTorch logic** (no training, no LLM)  
2) **A small learned temporal model** (LSTM/Transformer) if you want adaptive, human‑like mode classification

Below is the full developer specification for both, with clear boundaries so you can choose the right implementation.

---

## Mode classification in the pipeline
Mode classification assigns a behavioral label to each stroke or segment. These labels drive:

- semantic smoothing (Step 3.8)  
- mode‑aware shaping (Step 5.5)  
- easing selection (Step 5.4)  
- amplitude/velocity shaping  
- break detection  
- edging detection  
- tease vs. fast vs. slow transitions  

This is the first step where the system begins to understand *intent* rather than just *motion*.

---

## Inputs and outputs

### Inputs  
- `stroke_features`: PyTorch tensor `(N, F)`  
- `cluster_labels`: tensor `(N,)` from Step 4.2  
- `dominant_frequency`: float  
- `tempo_candidates`: tensor  
- optional:  
  - `window_size` for temporal context  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `mode_labels`: tensor `(N,)`  
- optional:  
  - `mode_confidence`: tensor `(N,)`  
  - `transition_points`: indices where mode changes  
  - `mode_stats`: per‑mode feature summaries  

---

## Developer‑level specification

### Module name  
`signal/modes/mode_classification.py`

### Responsibilities  
- Combine stroke‑level features with cluster labels  
- Apply deterministic or learned classification  
- Produce mode labels for each stroke  
- Support temporal context  
- Run efficiently on GPU  
- Provide clean interfaces for Step 3.8 and Step 5.5

---

# 1) Deterministic PyTorch mode classifier (recommended starting point)

This version uses **rules + thresholds + cluster statistics**. No training required.

---

## Feature inputs  
Typical features:

- stroke duration  
- amplitude  
- peak velocity  
- inter‑stroke interval  
- rhythm deviation  
- cluster ID  
- FFT dominant frequency  
- autocorrelation lag  
- stroke symmetry  
- local variance  

Constructed as:

```
X = torch.stack([
    duration,
    amplitude,
    peak_velocity,
    interval,
    rhythm_error,
    cluster_id,
], dim=1)
```

---

## Rule‑based classification logic

### Slow mode  
- long duration  
- low amplitude  
- low velocity  
- cluster with low mean frequency  

### Fast mode  
- short duration  
- high velocity  
- high dominant frequency  

### Tease mode  
- small amplitude  
- moderate frequency  
- high rhythm deviation  

### Edging mode  
- long duration  
- high amplitude  
- decreasing frequency trend  
- high tension (velocity variance)  

### Break mode  
- near‑zero amplitude  
- long intervals  
- low energy  

### Chaotic mode  
- high variance  
- inconsistent intervals  
- no clear FFT peak  

These rules are implemented as PyTorch boolean masks:

```
slow_mask = (duration > slow_thresh) & (velocity < vel_thresh)
fast_mask = (duration < fast_thresh) & (velocity > vel_thresh)
...
```

Then combined into a final label tensor.

---

## Temporal smoothing  
Modes should not flicker frame‑to‑frame. Apply a 1‑D majority filter:

```
mode_labels = mode_labels.unfold(0, window_size, 1).mode(dim=1)
```

---

## Runtime  
- **GPU:** <1 second  
- **CPU:** <2 seconds  
- Deterministic and reproducible  

---

# 2) Learned mode classifier (optional advanced version)

If you want human‑like mode detection, you can use a **small LSTM or Transformer**. This is the first place in the pipeline where a learned model makes sense.

---

## Model architecture  
A lightweight temporal model:

### LSTM version  
```
LSTM(input_dim=F, hidden_dim=64, num_layers=2)
Linear(64, num_modes)
```

### Transformer version  
```
TransformerEncoderLayer(d_model=F, nhead=4)
TransformerEncoder(...)
Linear(F, num_modes)
```

---

## Training data required  
To train this model, you need:

- stroke‑level feature sequences  
- human‑labeled mode sequences  
- optional: raw motion curves  
- optional: video context (frames or embeddings)  

A dataset of **500–2000 labeled clips** is enough for a robust classifier.

---

## Training objective  
Cross‑entropy loss:

\[
\mathcal{L} = -\sum y \log(\hat{y})
\]

---

## Inference  
At runtime:

- feed stroke feature sequence  
- get mode logits  
- apply softmax  
- pick highest‑probability mode  
- apply temporal smoothing  

---

## Runtime  
- **GPU:** <10 ms per clip  
- **CPU:** <50 ms  
- Very lightweight  

---

# What a developer must implement

### Core tasks  
- feature construction  
- deterministic classifier OR LSTM/Transformer  
- temporal smoothing  
- mode confidence computation  
- batch handling  
- device management  
- unit tests for:  
  - correct mode assignment  
  - temporal smoothing  
  - cluster integration  
  - GPU/CPU parity  

### Integration tasks  
- feed mode labels into Step 3.8 (semantic smoothing)  
- feed mode labels into Step 5.5 (mode‑aware shaping)  
- ensure compatibility with Step 4.2 clustering  
- provide config object for:  
  - thresholds (deterministic)  
  - model path (learned)  
  - smoothing window  
  - device  

---

A natural next step is Step 4.4, where the system detects **mode transitions** and identifies structural sections like “warm‑up”, “main rhythm”, “edging”, and “cooldown.”