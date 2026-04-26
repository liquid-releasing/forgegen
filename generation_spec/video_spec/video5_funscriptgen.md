Step 5 is where everything from Steps 1–4 finally turns into an actual **funscript**: timestamps, positions, easing curves, mode‑aware transitions, and structural consistency. This stage is mechanical in one sense (JSON generation) but also expressive, because it encodes the behavioral timeline into a stroke‑by‑stroke sequence.

The table below matches the structure of Steps 1–4 with **Inputs → Outputs**, capabilities, licenses, and realistic runtimes for a **1080p, 5‑minute, 30 fps** clip (~9,000 frames).

---

## Step 5 — Funscript Generation  
This stage converts the cleaned motion curve + mode timeline into a valid `.funscript` file with positions, timestamps, easing, and transitions.

### Table: Libraries, Inputs/Outputs, Capabilities, License, Runtime

| Step | Task | Library / Model | Inputs → Outputs | Capabilities Summary | License | Est. Time (1080p, 5 min) |
|------|------|-----------------|------------------|-----------------------|----------|---------------------------|
| 5.1 | Timestamp mapping | **NumPy / Pandas** | Frame indices → Millisecond timestamps | Converts frame numbers to ms using FPS; handles dropped/duplicate frames | BSD | <1 sec |
| 5.2 | Position mapping | **NumPy / SciPy** | Normalized motion → 0–100 positions | Maps amplitude‑normalized motion into funscript position space | BSD | <1 sec |
| 5.3 | Stroke point generation | **Custom Python logic** | Peaks/troughs → Funscript points | Generates points at stroke tops/bottoms; ensures correct ordering | BSD | 1–2 sec |
| 5.4 | Easing curve assignment | **SciPy / custom easing functions** | Raw points → Points with easing | Applies linear, quad, cubic, or custom easing per segment | BSD | 1–2 sec |
| 5.5 | Mode‑aware shaping | **PyTorch / NumPy** | Mode timeline + points → Adjusted points | Adjusts stroke intensity, spacing, or easing based on mode (slow/fast/edging/break) | BSD | 1–3 sec |
| 5.6 | Velocity enforcement | **NumPy / PyTorch** | Points → Velocity‑safe points | Ensures Δposition/Δtime stays within safe limits; clamps or subdivides segments | BSD | 1–2 sec |
| 5.7 | Pattern reinforcement | **SciPy + custom logic** | Points → Smoothed, consistent pattern | Enforces rhythmic consistency, removes micro‑jitters, aligns strokes to beat grid | BSD | 1–3 sec |
| 5.8 | JSON structuring | **Python json / orjson** | Points → Funscript JSON dict | Builds valid funscript structure with metadata, actions, version | MIT/BSD | <1 sec |
| 5.9 | Validation | **jsonschema / custom validators** | JSON dict → Validated funscript | Checks for malformed timestamps, negative positions, illegal jumps | MIT/BSD | <1 sec |
| 5.10 | Export | **Python I/O** | JSON dict → `.funscript` file | Writes final file; ensures UTF‑8 and correct formatting | MIT/BSD | <1 sec |

---

## How Step 5 shapes the final output  
This stage produces the actual `.funscript` file, with:

- millisecond‑accurate timestamps  
- 0–100 positions  
- easing curves  
- mode‑aware shaping (slow, fast, edging, break)  
- velocity‑safe transitions  
- consistent rhythmic structure  
- validated JSON  

This is the first point where the pipeline produces something directly usable by devices or players.

---

## What comes next  
Step 6 is typically **post‑processing**, where you can apply:

- global smoothing passes  
- velocity caps  
- amplitude compression  
- pattern reinforcement  
- multi‑track merging  
- metadata injection  

If you want, I can build Step 6 in the same format so the entire pipeline from Step 1 → Step 9 is fully documented and consistent.