Step 3 is where the raw motion signal from Step 2 becomes a *usable*, *stable*, *normalized*, and *stroke‑ready* waveform. This version includes the same **Inputs → Outputs** column you requested, and it mirrors the structure of Steps 1 and 2 so the entire pipeline stays consistent and modular.

---

## Step 3 — Signal Cleanup & Smoothing  
This stage removes jitter, enforces velocity limits, normalizes amplitude, identifies peaks/troughs, segments strokes, and optionally applies semantic smoothing.

### Table: Libraries, Inputs/Outputs, Capabilities, License, Runtime

| Step | Task | Library / Model | Inputs → Outputs | Capabilities Summary | License | Est. Time (1080p, 5 min) |
|------|------|-----------------|------------------|-----------------------|----------|---------------------------|
| 3.1 | Noise reduction & smoothing | **SciPy (Butterworth, Savitzky–Golay, filtfilt)** | Raw motion array → Smoothed motion array | High‑quality low‑pass filtering, zero‑phase smoothing, polynomial smoothing | BSD | 1–3 sec |
| 3.1 | Noise reduction & smoothing | **NumPy** | Raw motion array → Smoothed array | Rolling averages, convolution smoothing, vectorized ops | BSD | <1 sec |
| 3.1 | Noise reduction & smoothing | **PyTorch** | Raw motion tensor → Smoothed tensor | GPU‑accelerated convolution filters, batch transforms | BSD | <1 sec GPU |
| 3.2 | Peak & trough detection | **SciPy (find_peaks)** | Smoothed motion → Peak indices, trough indices | Robust peak detection with prominence, width, distance constraints | BSD | 1–2 sec |
| 3.2 | Peak & trough detection | **PeakUtils** | Smoothed motion → Peak indices | Lightweight peak detection for simple waveforms | MIT | <1 sec |
| 3.3 | Outlier removal | **SciPy / NumPy** | Motion array → Cleaned motion array | Z‑score filtering, median filtering, MAD‑based outlier removal | BSD | 1–2 sec |
| 3.3 | Outlier removal | **Pandas** | Motion series → Cleaned series | Rolling windows, quantile clipping, smoothing | BSD | 1–2 sec |
| 3.4 | Velocity limiting | **Custom PyTorch / NumPy kernels** | Motion array → Velocity‑clamped array | Enforce max Δposition/Δtime, clamp unrealistic speeds | BSD | 1–2 sec |
| 3.5 | Amplitude normalization | **NumPy / SciPy** | Motion array → 0–100 normalized array | Min–max scaling, dynamic range compression | BSD | <1 sec |
| 3.5 | Amplitude normalization | **scikit‑learn (MinMaxScaler)** | Motion array → Normalized array | Consistent normalization across clips | BSD | <1 sec |
| 3.6 | Stroke segmentation | **SciPy + custom logic** | Peaks/troughs → Stroke segments | Segment continuous motion into strokes using peaks, zero‑crossings, velocity sign changes | BSD | 1–3 sec |
| 3.6 | Stroke segmentation | **PyTorch** | Motion tensor → Segmented strokes | GPU‑accelerated segmentation for large batches | BSD | <1 sec GPU |
| 3.7 | Pattern smoothing & rhythm enforcement | **NumPy + SciPy** | Stroke segments → Smoothed, rhythm‑consistent segments | Enforce consistent stroke spacing, remove micro‑jitters | BSD | 1–3 sec |
| 3.7 | Pattern smoothing & rhythm enforcement | **Custom ML (LSTM/Transformer)** | Raw strokes → Human‑like smoothed strokes | Learn smoothing patterns; enforce human‑like rhythm | Apache/BSD | 5–10 sec GPU |
| 3.8 | Semantic smoothing (LLM‑based) | **LLaVA / Qwen‑VL** | Sampled frames + motion → Mode labels (slow/fast/edging/break) | Scene‑aware smoothing suggestions, pattern classification | Apache 2.0 | 1–2 min (sampled frames) |
| 3.9 | Final waveform validation | **jsonschema / custom validators** | Motion array → Validated funscript‑ready array | Ensure no illegal jumps, malformed timestamps, negative positions | MIT/BSD | <1 sec |

---

## How Step 3 fits into the pipeline  
This stage transforms Step 2’s noisy motion into a **clean, normalized, velocity‑safe, stroke‑segmented waveform**. It is the first point where the motion begins to feel intentional rather than mechanical.

The outputs of Step 3 typically include:

- a smoothed motion curve  
- normalized amplitude (0–100)  
- velocity‑limited transitions  
- peak/trough indices  
- segmented strokes  
- optional semantic mode labels  

These feed directly into **Step 4: Pattern Interpretation & Mode Detection**, where rhythm, pacing, and behavioral patterns are extracted.

Would you like Step 4 in the same format next?