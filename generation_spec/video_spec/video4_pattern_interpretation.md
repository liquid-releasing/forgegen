Step 4 is where the cleaned motion signal from Step 3 becomes *structured behavior*: rhythm, pacing, mode detection, pattern classification, and semantic interpretation. This is the stage that makes a script feel intentional rather than purely mechanical. The table below mirrors the structure of Steps 1–3 with **Inputs → Outputs**, capabilities, licenses, and realistic runtimes for a **1080p, 5‑minute, 30 fps** clip (~9,000 frames).

---

## Step 4 — Pattern Interpretation & Mode Detection  
This stage identifies rhythmic patterns, stroke groups, tempo changes, edging/break segments, and higher‑level behavioral modes.

### Table: Libraries, Inputs/Outputs, Capabilities, License, Runtime

| Step | Task | Library / Model | Inputs → Outputs | Capabilities Summary | License | Est. Time (1080p, 5 min) |
|------|------|-----------------|------------------|-----------------------|----------|---------------------------|
| 4.1 | Rhythm detection | **SciPy (FFT, autocorrelation)** | Smoothed motion → Dominant frequencies, tempo candidates | Detects periodicity, stroke frequency, tempo shifts | BSD | 1–3 sec |
| 4.1 | Rhythm detection | **Librosa** | Motion curve (treated as audio‑like signal) → Beat grid, tempo | Beat tracking, onset detection, tempo estimation | BSD | 2–4 sec |
| 4.2 | Pattern clustering | **scikit‑learn (KMeans, DBSCAN)** | Motion segments → Pattern clusters (slow, fast, chaotic) | Groups strokes into behavioral clusters | BSD | 1–2 sec |
| 4.2 | Pattern clustering | **HDBSCAN** | Motion segments → Density‑based clusters | Finds natural clusters without fixed k | BSD | 2–4 sec |
| 4.3 | Mode classification | **Custom LSTM/Transformer** | Motion windows → Mode labels (slow/fast/edging/break) | Learns temporal patterns; robust to noise | Apache/BSD | 5–10 sec GPU |
| 4.3 | Mode classification | **PyTorch** | Motion tensor → Mode logits | Framework for custom temporal classifiers | BSD | <1 sec GPU |
| 4.4 | Stroke‑group analysis | **NumPy + SciPy** | Peaks/troughs → Stroke groups (phrases) | Groups strokes into phrases based on timing and amplitude | BSD | 1–2 sec |
| 4.4 | Stroke‑group analysis | **tslearn** | Stroke sequences → Pattern similarity groups | Time‑series clustering, DTW alignment | BSD | 2–4 sec |
| 4.5 | Tempo change detection | **ruptures** | Motion curve → Change‑point indices | Detects tempo shifts, intensity changes, mode transitions | BSD | 2–4 sec |
| 4.6 | Semantic interpretation | **LLaVA / Qwen‑VL** | Sampled frames + motion → Semantic labels (context, intent) | Scene‑aware interpretation of motion patterns | Apache 2.0 | 1–3 min (sampled frames) |
| 4.7 | Pattern smoothing | **NumPy + SciPy** | Mode labels → Smoothed mode timeline | Removes jittery mode switches; enforces minimum durations | BSD | 1–2 sec |
| 4.8 | Behavioral timeline generation | **Custom logic / PyTorch** | All mode data → Final mode timeline | Produces a continuous timeline of modes for Step 5 | BSD | 1–2 sec |

---

## How Step 4 shapes the final script  
This stage produces the **behavioral structure** of the script:

- dominant tempo  
- rhythmic patterns  
- stroke groups  
- mode labels (slow, fast, edging, break, tease, chaotic)  
- tempo‑change boundaries  
- semantic cues (if using LLM‑vision)  

These outputs feed directly into **Step 5: Funscript Generation**, where the system converts the structured motion + mode timeline into actual funscript points with easing, timing, and transitions.

Would you like Step 5 in the same format next?