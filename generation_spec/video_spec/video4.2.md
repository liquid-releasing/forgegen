Step 4.2 is where the pipeline begins turning raw rhythmic information into **behavioral structure**. Pattern clustering groups strokes into categories like *slow*, *fast*, *tease*, *edging*, or *chaotic* based purely on numerical features—no semantics yet. This module is still deterministic and PyTorch‑driven, but it integrates with clustering algorithms such as KMeans, DBSCAN, or HDBSCAN.

---

## How pattern clustering fits into the pipeline
This stage takes the outputs of Steps 3.6–4.1 (stroke segments + rhythm features) and groups strokes into clusters that represent distinct behavioral patterns. These clusters become the foundation for:

- mode classification (Step 4.3)  
- semantic smoothing (Step 3.8)  
- funscript shaping (Step 5)  
- tempo‑change detection (Step 4.5)  

It’s the first step where the system begins to understand *patterns* rather than just *signals*.

---

## Inputs and outputs

### Inputs  
- `stroke_features`: PyTorch tensor `(N, F)`  
  - `N` = number of strokes  
  - `F` = features per stroke (duration, amplitude, velocity, rhythm alignment, etc.)  
- optional:  
  - `num_clusters` (for KMeans)  
  - `eps`, `min_samples` (for DBSCAN)  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `cluster_labels`: tensor `(N,)`  
- optional:  
  - `cluster_centers` (KMeans)  
  - `noise_mask` (DBSCAN/HDBSCAN)  
  - `cluster_stats` (mean duration, amplitude, etc.)

---

## Developer‑level specification

### Module name  
`signal/patterns/pattern_clustering.py`

### Responsibilities  
- Build stroke‑level feature vectors  
- Run clustering (KMeans, DBSCAN, or HDBSCAN)  
- Assign each stroke to a cluster  
- Provide cluster‑level statistics  
- Support GPU acceleration for feature preprocessing  
- Produce deterministic, reproducible results  

---

## Required components

### 1. Feature construction  
Each stroke becomes a feature vector. Typical features:

- duration  
- amplitude  
- peak velocity  
- inter‑stroke interval  
- alignment to beat grid  
- local rhythm deviation  
- normalized position of peak  
- stroke symmetry  

Constructed as:

```
features = torch.stack([
    duration,
    amplitude,
    peak_velocity,
    interval,
    rhythm_error,
    symmetry,
], dim=1)
```

### 2. Feature normalization  
Clustering requires normalized features:

```
features = (features - features.mean(dim=0)) / (features.std(dim=0) + 1e-6)
```

### 3. Clustering algorithms  
Three clustering modes are supported.

#### A. KMeans (fixed number of clusters)  
Good for predictable patterns.

```
kmeans = KMeans(n_clusters=k)
labels = kmeans.fit_predict(features.cpu().numpy())
```

#### B. DBSCAN (density‑based)  
Good for chaotic or irregular patterns.

```
db = DBSCAN(eps=eps, min_samples=min_samples)
labels = db.fit_predict(features.cpu().numpy())
```

#### C. HDBSCAN (hierarchical density‑based)  
Best for natural clusters with variable density.

```
hdb = HDBSCAN(min_cluster_size=...)
labels = hdb.fit_predict(features.cpu().numpy())
```

### 4. GPU acceleration  
PyTorch handles:

- feature construction  
- normalization  
- distance computation (optional)  

Clustering libraries run on CPU, but the heavy math is already done on GPU.

### 5. Cluster statistics  
Compute per‑cluster means:

```
cluster_stats = {
    c: features[labels == c].mean(dim=0)
    for c in unique_clusters
}
```

---

## Runtime expectations  
- **GPU:** <1 second for feature prep  
- **CPU:** 1–3 seconds for clustering  
- Memory footprint: small (<200MB)  
- Deterministic if seeded  

---

## What a developer must implement

### Core tasks  
- feature vector construction  
- feature normalization  
- clustering wrapper (KMeans/DBSCAN/HDBSCAN)  
- cluster statistics  
- label assignment  
- unit tests for:  
  - feature correctness  
  - cluster reproducibility  
  - handling of noise points  
  - GPU/CPU parity  

### Integration tasks  
- feed cluster labels into Step 4.3 (mode classification)  
- ensure features match Step 3.7’s smoothed strokes  
- ensure compatibility with Step 4.1’s rhythm features  
- provide config object for:  
  - clustering algorithm  
  - number of clusters  
  - DBSCAN/HDBSCAN parameters  

---

## Is this an LLM?  
No.  
This module is **pure clustering and feature analysis**.  
No training, no dataset, no model weights.

---

## When would an LLM be involved?  
Only for **semantic interpretation** of clusters, such as:

- “Cluster 2 looks like edging.”  
- “Cluster 0 is chaotic; treat it differently.”  

That happens in Step 4.3 or Step 3.8, not here.

---

## What data would an LLM‑based clustering model need?  
If you ever wanted a learned behavioral classifier (optional), it would require:

- stroke‑level features  
- human‑labeled behavior categories  
- supervised training on temporal patterns  

But Step 4.2 does not require this.

---

If you want to continue, the next PyTorch‑related module is **Step 4.3: Mode classification**, which is the first stage that *can* optionally involve a small temporal model (LSTM/Transformer) if you want learned behavior labels.