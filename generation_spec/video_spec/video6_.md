Step 6 is the **post‑processing and refinement** stage. This is where the generated funscript is polished, corrected, optimized, and prepared for final export or downstream tooling. It’s also the stage where your own transformer‑based multi‑window logic can apply global adjustments, pattern reinforcement, or safety constraints.

The structure below matches Steps 1–5 with **Inputs → Outputs**, capabilities, licenses, and realistic runtimes for a **1080p, 5‑minute, 30 fps** clip (~9,000 frames).

---

## Step 6 — Post‑Processing & Refinement

### Table: Libraries, Inputs/Outputs, Capabilities, License, Runtime

| Step | Task | Library / Model | Inputs → Outputs | Capabilities Summary | License | Est. Time (1080p, 5 min) |
|------|------|-----------------|------------------|-----------------------|----------|---------------------------|
| 6.1 | Global smoothing pass | **SciPy (Savitzky–Golay, Butterworth)** | Funscript positions → Smoothed positions | Removes micro‑jitters, enforces smooth transitions | BSD | 1–3 sec |
| 6.1 | Global smoothing pass | **NumPy** | Positions → Smoothed positions | Rolling averages, convolution smoothing | BSD | <1 sec |
| 6.2 | Velocity capping | **NumPy / PyTorch** | Positions → Velocity‑safe positions | Enforces max Δposition/Δtime; clamps or subdivides segments | BSD | 1–2 sec |
| 6.3 | Amplitude compression | **scikit‑learn (MinMaxScaler)** | Positions → Re‑scaled positions | Compresses or expands amplitude ranges for consistency | BSD | <1 sec |
| 6.4 | Pattern reinforcement | **SciPy + custom logic** | Stroke groups → Reinforced rhythmic patterns | Aligns strokes to beat grid; enforces consistent spacing | BSD | 1–3 sec |
| 6.4 | Pattern reinforcement | **PyTorch (custom kernels)** | Motion tensor → Reinforced pattern tensor | GPU‑accelerated pattern shaping | BSD | <1 sec GPU |
| 6.5 | Mode‑aware adjustments | **Custom ML (LSTM/Transformer)** | Mode timeline + positions → Adjusted positions | Applies mode‑specific shaping (slow, fast, edging, break) | Apache/BSD | 5–10 sec GPU |
| 6.6 | Multi‑track merging | **NumPy / Pandas** | Multiple motion tracks → Unified track | Merges multiple sources (e.g., object + keypoint) into one | BSD | 1–2 sec |
| 6.7 | Conflict resolution | **Custom logic** | Overlapping points → Clean, deduplicated timeline | Removes duplicates, resolves timestamp collisions | BSD | <1 sec |
| 6.8 | Metadata injection | **Python dict ops** | Funscript JSON → JSON with metadata | Adds title, duration, generator info, version | MIT/BSD | <1 sec |
| 6.9 | Final validation | **jsonschema / custom validators** | JSON → Validated funscript | Ensures no malformed timestamps, negative positions, or illegal jumps | MIT/BSD | <1 sec |
| 6.10 | Export | **Python I/O** | JSON → `.funscript` file | Writes final file with correct formatting | MIT/BSD | <1 sec |

---

## How Step 6 shapes the final output

This stage ensures the script is:

- **smooth** (no jitter or micro‑noise)  
- **safe** (velocity‑limited, amplitude‑bounded)  
- **consistent** (pattern‑reinforced, mode‑aligned)  
- **clean** (no duplicate timestamps, no malformed JSON)  
- **complete** (metadata included, validated, export‑ready)  

It’s also the stage where your **multi‑window transformer** can apply global logic such as:

- slow‑mode shaping  
- edging‑mode intensity curves  
- break‑mode suppression  
- rhythmic alignment  
- amplitude compression  
- safety constraints  

This is the final refinement before Step 7, which typically handles **batch automation**, **library integration**, or **pipeline orchestration**.

Would you like Step 7 in the same structured format?