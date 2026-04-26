A single, consolidated table gives you the clearest high‑level view of the **audio‑to‑funscript pipeline**, the **Python DSP stack**, and the **LLM semantic layer**. This mirrors the structure you used for the video pipeline: each row is a pipeline step, and each column captures the tooling, inputs/outputs, capabilities, licensing, and runtime expectations.

---

## Audio‑to‑Funscript Pipeline: Python + LLM Tooling Overview

### Core DSP, shaping, and semantic layers mapped step‑by‑step

| Step | Python / LLM Tooling | Inputs → Outputs | Capabilities | License | Runtime |
|------|-----------------------|------------------|--------------|---------|---------|
| **1. Audio Ingestion & Normalization** | `librosa`, `soundfile`, `pydub` | Audio file → mono waveform, normalized amplitude | Load audio, resample, normalize loudness, trim silence | Librosa BSD, Pydub MIT | ~0.2–0.5s |
| **2. Beat & Tempo Detection** | `librosa.beat`, PyTorch FFT | Waveform → BPM, beat grid, downbeats | Beat tracking, tempo curve, half/double‑time detection | BSD | ~0.5–1.5s |
| **3. Onset & Transient Detection** | `librosa.onset`, PyTorch STFT | Waveform → onset timestamps | Detect percussive hits, accents, rhythmic events | BSD | ~0.3–1s |
| **4. Energy & Spectral Analysis** | `librosa.feature`, PyTorch STFT | Waveform → energy envelope, spectral centroid, bass/treble bands | Identify builds, drops, brightness, bass hits | BSD | ~1–2s |
| **5. Stem Separation (optional)** | `spleeter`, `demucs` | Audio → drums, bass, vocals, other stems | Isolate drums (beats), bass (deep strokes), vocals (semantic cues) | MIT | ~5–20s (GPU) |
| **6. Audio Embeddings** | `torchaudio`, `openl3`, `wav2vec2` | Waveform → embeddings | High‑level representation for semantic analysis | Apache/MIT | ~1–3s |
| **7. Semantic Audio Interpretation** | LLM (GPT‑4‑class) | Embeddings + audio sections → semantic labels | Identify mood, structure (verse/chorus/drop), tease/edging analogs | Model‑dependent | ~0.5–2s |
| **8. Raw Motion Curve Generation** | PyTorch | Beats + energy + spectral features → motion curve | Map beats to peaks, energy to amplitude, bass to deep strokes | BSD | ~0.5–1s |
| **9. Audio‑Driven Mode Classification** | PyTorch + `sklearn` clustering | Features → modes (beat‑driven, melodic, ambient, drop, build) | Cluster sections by rhythm/energy | BSD | ~0.3–0.8s |
| **10. Curve Shaping (Easing, Velocity)** | PyTorch | Raw curve → shaped curve | Easing, velocity shaping, amplitude envelopes | BSD | ~1–2s |
| **11. Semantic Shaping (optional)** | LLM | Modes + structure → shaping directives | “Make drops hit harder”, “smooth verses”, “increase tease oscillation” | Model‑dependent | ~0.5–2s |
| **12. Funscript Export** | Python JSON | Curve → funscript actions | Quantize, dedupe, enforce device limits | Python stdlib | ~0.1–0.2s |
| **13. QA & Diagnostics** | PyTorch | Curve → QA report | Velocity spikes, jitter, rhythm stability, safety | BSD | ~0.5–1s |

---

## How to interpret this table for your architecture

### Python owns the deterministic DSP and shaping
Everything involving FFTs, beat tracking, envelopes, clustering, and curve shaping is handled by Python and PyTorch. These steps are:

- reproducible  
- GPU‑accelerated  
- mathematically grounded  
- safe and predictable  

This mirrors your video pipeline’s structure and fits your preference for modular, semantic, reproducible workflows.

### LLMs own the semantic and creative layers
Audio contains emotional and structural cues that DSP alone cannot interpret. LLMs provide:

- mood classification  
- section labeling (verse, chorus, drop, build)  
- creative shaping directives  
- user‑intent translation (“make it feel more sensual”)  

This keeps the user interface intuitive while the DSP stays rigorous.

### The combination gives users a powerful experience
Users don’t need to understand FFTs or beat grids. They can express intent in natural language:

- “Follow the drums.”  
- “Make the drop explode.”  
- “Make the verses soft and teasing.”  
- “Make it feel like a club track.”  

The LLM translates that into shaping parameters; Python executes it deterministically.

---

## A natural next step
Would you like a **parallel table** that maps these same steps to **user‑facing controls** (e.g., beat strength, bass emphasis, tease intensity, drop impact), so you can see how the internal pipeline collapses into a small, intuitive UI?