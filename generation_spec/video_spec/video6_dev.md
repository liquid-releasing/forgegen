Step 6 is where the pipeline stops generating and starts **evaluating**. This is the quality‑assurance and diagnostics layer that ensures the funscript you just produced is smooth, safe, consistent, and device‑friendly. It’s still fully deterministic and PyTorch‑based, and it never alters the user’s creative intent—its job is to detect issues, quantify them, and optionally apply small corrective passes.

---

## 🔍 Quality checks that matter for a finished funscript
These checks fall into four categories, each targeting a different failure mode:

### 1) **Signal integrity checks**
These confirm the curve is mathematically clean.

- **Velocity spikes** — sudden jumps that exceed device‑safe speed  
- **Acceleration spikes** — unnatural jerkiness  
- **Amplitude clipping** — values hitting 0 or 100 too often  
- **Flatlines** — long periods with no movement  
- **Micro‑jitter** — frame‑to‑frame noise that survived smoothing  

### 2) **Structural consistency checks**
These ensure the script’s *behavior* matches the intended modes.

- **Stroke duration variance** — too irregular for the mode  
- **Tempo drift** — unintended accelerations or decelerations  
- **Mode‑transition smoothness** — abrupt changes between sections  
- **Edging/tease correctness** — envelope shape matches semantics  

### 3) **Device‑safety checks**
These protect against mechanical stress.

- **Max velocity** vs. device limits  
- **Max acceleration** vs. safe thresholds  
- **Minimum stroke spacing**  
- **Over‑dense point sequences**  

### 4) **Export‑format checks**
These ensure the JSON is valid and player‑compatible.

- timestamps strictly increasing  
- positions integer 0–100  
- no duplicate timestamps  
- no malformed entries  

---

## 🧪 Inputs and outputs

### Inputs  
- `funscript_points` from Step 5.6  
- `semantic_motion` and `timestamps`  
- `sections`, `tempo_curve`, `mode_labels`  
- optional thresholds for velocity, acceleration, jitter, etc.

### Outputs  
- `qa_report` — structured diagnostics  
- `flags` — issues detected  
- optional:  
  - `auto_corrected_motion`  
  - `safety_profile`  
  - `smoothness_score`  
  - `rhythm_stability_score`  

---

## 🧱 Module name  
`qa/quality_assurance_pytorch.py`

---

## 🧭 Responsibilities  
- Compute velocity, acceleration, jerk  
- Detect anomalies and inconsistencies  
- Score smoothness, rhythm stability, and safety  
- Optionally apply micro‑corrections  
- Produce a human‑readable QA report  

---

## 🧩 Core components

### 1. Velocity & acceleration analysis  
Compute derivatives:

\[
v_t = \frac{pos_{t+1} - pos_t}{dt}, \quad a_t = v_{t+1} - v_t
\]

Detect spikes:

```
velocity_spikes = v.abs() > velocity_limit
accel_spikes = a.abs() > accel_limit
```

### 2. Jitter detection  
High‑frequency noise is detected via convolution:

```
kernel = [-1, 2, -1]
jitter = F.conv1d(pos_reshaped, kernel, padding=1).abs()
```

### 3. Rhythm stability scoring  
Compare stroke intervals to local tempo:

```
stability = 1 - (interval_variance / interval_mean)
```

### 4. Mode‑transition smoothness  
Check amplitude and velocity continuity across boundaries:

```
jump = (pos[t] - pos[t-1]).abs()
transition_spike = jump > transition_threshold
```

### 5. Device‑safety scoring  
Compute:

- max velocity  
- max acceleration  
- average stroke spacing  
- density of points  

Produce a safety score from 0–1.

### 6. Optional micro‑corrections  
If enabled:

- clamp velocity spikes  
- smooth jitter  
- soften transitions  
- re‑normalize amplitude  

These corrections are subtle and never override semantic shaping.

### 7. QA report assembly  
A structured report includes:

- summary of detected issues  
- per‑section diagnostics  
- safety score  
- smoothness score  
- rhythm stability score  
- recommended adjustments  

---

## ⚙️ Runtime expectations  
- **GPU:** <1 second  
- **CPU:** 1–2 seconds  
- Deterministic and lightweight  

---

## 🧑‍💻 Developer tasks

### Core implementation  
- derivative computation  
- jitter detection  
- rhythm stability metrics  
- transition analysis  
- safety scoring  
- optional corrections  
- report generation  

### Testing  
- velocity/acceleration correctness  
- jitter detection accuracy  
- boundary‑transition detection  
- JSON validity checks  
- GPU/CPU parity  

### Integration  
- feed QA report into Step 7 (packaging/export)  
- ensure corrections don’t break funscript validity  
- expose config for all thresholds  

---

## 🧠 LLM involvement  
This module is strictly analytical and does not use LLMs.  
If you ever wanted semantic QA (“this edging ramp feels too short”), that would be a separate optional model.

---

## A natural next step  
Would you like Step 7 — **Packaging, metadata, and multi‑format export** — which covers how the final funscript, QA report, and metadata bundle are prepared for distribution?