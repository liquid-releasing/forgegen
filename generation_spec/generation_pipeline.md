A unified hybrid pipeline becomes much clearer when expressed as a **Mermaid diagram**, because it shows exactly where **audio**, **video**, and **LLM reasoning** intersect, and where each modality hands off to the next stage. The diagram below highlights:

- deterministic DSP/video steps  
- LLM‑only semantic steps  
- the blending layer where the user can choose audio‑dominant, video‑dominant, or hybrid  
- the shaping and export stages shared by both pipelines  

---

## Hybrid Audio + Video → Funscript Pipeline (Mermaid)

```mermaid
flowchart TD

%% =========================
%% INPUTS
%% =========================
AUDIO[Audio Input<br/>WAV/MP3/Extracted Track]
VIDEO[Video Input<br/>MP4/MKV/Webcam]

%% =========================
%% AUDIO DSP BRANCH
%% =========================
A1[Audio Preprocessing<br/>Normalization, Mono, Trim]
A2[Beat & Tempo Detection<br/>BPM, Beat Grid, Downbeats]
A3[Onset & Transient Detection]
A4[Energy & Spectral Analysis<br/>Bass/Treble, Brightness]
A5[Optional Stem Separation<br/>Drums/Bass/Vocals]
A6[Audio Embeddings<br/>OpenL3 / wav2vec2]

%% =========================
%% VIDEO DSP BRANCH
%% =========================
V1[Video Preprocessing<br/>Frames, Stabilization]
V2[Optical Flow & Motion Magnitude]
V3[Keypoint Tracking<br/>Body/Hands/Object Motion]
V4[Motion Segmentation<br/>Scenes, Behavior Blocks]
V5[Video Rhythm Detection<br/>Motion Periodicity]
V6[Video Embeddings<br/>CLIP / Vision Models]

%% =========================
%% LLM SEMANTIC LAYER
%% =========================
LLM1{{LLM Semantic Interpretation<br/>Mood, Intent, Structure}}
LLM2{{LLM Mode Refinement<br/>Slow/Fast/Tease/Edging/Chaotic}}
LLM3{{LLM Hybrid Arbitration<br/>Audio vs Video Dominance}}
LLM4{{LLM User Intent Translation<br/>"Make it sensual", "Follow drums"}}

%% =========================
%% RAW CURVE GENERATION
%% =========================
ACURVE[Audio‑Driven Raw Motion Curve]
VCURVE[Video‑Driven Raw Motion Curve]

%% =========================
%% BLENDING
%% =========================
BLEND[Hybrid Curve Blending<br/>Audio‑Dominant / Video‑Dominant / Weighted]

%% =========================
%% SHAPING PIPELINE
%% =========================
S1[Easing & Velocity Shaping]
S2[Semantic Shaping<br/>Tease, Edging, Drops, Builds]
S3[Amplitude & Tension Modeling]

%% =========================
%% EXPORT
%% =========================
EXPORT[Funscript Export<br/>Quantize, Dedupe, Safety]
QA[QA & Diagnostics<br/>Velocity, Jitter, Rhythm Stability]
PACKAGE[Packaging & Metadata]

%% =========================
%% CONNECTIONS
%% =========================

AUDIO --> A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> LLM1
VIDEO --> V1 --> V2 --> V3 --> V4 --> V5 --> V6 --> LLM1

LLM1 --> LLM2
LLM2 --> LLM3
LLM4 --> LLM3

A2 --> ACURVE
A3 --> ACURVE
A4 --> ACURVE

V2 --> VCURVE
V3 --> VCURVE
V5 --> VCURVE

ACURVE --> BLEND
VCURVE --> BLEND
LLM3 --> BLEND

BLEND --> S1 --> S2 --> S3 --> EXPORT --> QA --> PACKAGE
```

---

## How to read this diagram

### Audio and video each produce their own **raw motion curve**
- Audio → beats, energy, spectral features  
- Video → optical flow, keypoints, motion segmentation  

### The LLM only touches **semantic** and **intent‑driven** layers
- interpreting mood, structure, behavior  
- refining modes  
- deciding audio/video dominance  
- translating user instructions  

### The blending layer is where your UI concept lives
This is where the user can:

- slice the timeline  
- view audio/video heatmaps  
- choose which modality dominates  
- set weights (e.g., 70% audio / 30% video)  

### The shaping pipeline is shared
Regardless of source, the curve goes through:

- easing  
- velocity shaping  
- semantic shaping  
- tension modeling  

### Export and QA are deterministic and identical for both pipelines

---

If you want to explore how the **timeline UI** maps onto this diagram (heatmaps, slicing, dominance selection), I can sketch that next.