Step 8 is the **quality‑assurance and human‑in‑the‑loop review** layer. It sits after the script is generated and refined, and before large‑scale distribution or device playback. This stage ensures correctness, consistency, safety, and subjective quality. It also provides hooks for manual adjustments when needed.

The structure below matches Steps 1–7 with **Inputs → Outputs**, capabilities, licenses, and realistic runtimes for a 5‑minute clip.

---

## Step 8 — Quality Assurance, Review, and Optional Human‑in‑the‑Loop Refinement

### Table: Libraries, Inputs/Outputs, Capabilities, License, Runtime

| Step | Task | Library / Model | Inputs → Outputs | Capabilities Summary | License | Est. Time (1080p, 5 min) |
|------|------|-----------------|------------------|-----------------------|----------|---------------------------|
| 8.1 | Visual waveform inspection | **Matplotlib / Plotly** | Funscript → Waveform plot | Visualizes motion curve, detects anomalies, flatlines, spikes | BSD | 1–2 sec |
| 8.2 | Motion‑to‑video overlay | **OpenCV** | Video + funscript → Overlay preview | Renders motion curve over video for alignment checking | BSD | 5–10 sec |
| 8.3 | Playback simulation | **Custom Python player** | Funscript → Simulated device motion | Simulates device movement to detect unnatural transitions | BSD | 1–3 sec |
| 8.4 | Statistical QA | **NumPy / SciPy** | Funscript → Stats (velocity, amplitude, stroke rate) | Computes velocity histograms, amplitude ranges, stroke frequency | BSD | 1–2 sec |
| 8.5 | Pattern consistency checks | **scikit‑learn / tslearn** | Stroke sequences → Pattern similarity metrics | Detects inconsistent rhythm, mode drift, or pattern breaks | BSD | 2–4 sec |
| 8.6 | Semantic QA | **LLaVA / Qwen‑VL** | Sampled frames + funscript → Semantic alignment | Checks if motion matches scene context (e.g., slow vs fast) | Apache 2.0 | 1–3 min (sampled frames) |
| 8.7 | Human‑in‑the‑loop editing | **OpenFunscripter (OFS)** | Funscript → Manually refined funscript | Precision editing, easing adjustments, stroke corrections | GPL | Manual (30 sec–5 min typical) |
| 8.8 | Automated anomaly correction | **Custom logic / PyTorch** | Funscript → Corrected funscript | Fixes timestamp collisions, removes duplicates, repairs spikes | BSD | 1–2 sec |
| 8.9 | Multi‑pass validation | **jsonschema / custom validators** | Funscript → Validated funscript | Ensures structural correctness, no illegal jumps, valid JSON | MIT/BSD | <1 sec |
| 8.10 | Approval & tagging | **Python dict ops / Stash API** | Funscript + metadata → Approved asset | Marks script as “QA‑passed,” attaches tags, versioning | MIT | 1–2 sec |

---

## What Step 8 accomplishes  
This stage ensures the script is not only technically valid but also **subjectively high‑quality**:

- waveform looks clean and intentional  
- motion aligns with video content  
- no velocity spikes or unnatural jumps  
- rhythm and mode transitions feel coherent  
- semantic alignment is correct (slow scenes → slow strokes, etc.)  
- human review can correct edge cases  
- final script is validated and approved  

It’s the last checkpoint before distribution, playback, or integration into a larger library.

A natural next step is Step 9, which typically covers **distribution, packaging, and long‑term archival**. Would you like Step 9 documented in the same structured format?