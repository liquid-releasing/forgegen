Here is the expanded **Step 2: Motion Detection** table with the new **Inputs / Outputs** column added. This version keeps the structure consistent with Step 1 and is tuned for a 1080p, 5‑minute, 30 fps video (~9,000 frames). It focuses on the actual data each library consumes and produces, which is essential for wiring your multi‑stage transformer pipeline.

---

## Step 2 — Motion Detection  
### Optical flow, keypoints, object tracking, hybrid ML motion extraction

### Table: Libraries, Inputs, Outputs, Capabilities, License, Runtime

| Step | Task | Library / Model | Inputs → Outputs | Capabilities Summary | License | Est. Time (1080p, 5 min) |
|------|------|-----------------|------------------|-----------------------|----------|---------------------------|
| 2.1 | Dense optical flow | **OpenCV Farnebäck** | Frames (grayscale) → Dense flow field (dx, dy per pixel) | Fast, classic dense flow; good for smooth motion | BSD | 2–4 min CPU |
| 2.1 | Dense optical flow | **OpenCV DualTV‑L1** | Frames → Dense flow field | More accurate, robust to noise; slower | BSD | 4–8 min CPU |
| 2.1 | Dense optical flow | **RAFT (PyTorch)** | Frames (RGB) → Dense flow tensor (H×W×2) | State‑of‑the‑art deep optical flow | Apache 2.0 | 30–60 sec GPU / 6–10 min CPU |
| 2.2 | Sparse optical flow | **OpenCV Lucas‑Kanade** | Frames + keypoints → Tracked keypoint trajectories | Tracks selected points; fast; ideal for ROI | BSD | 1–2 min CPU |
| 2.3 | Keypoint detection | **MediaPipe Pose** | Frames → 33‑point body skeleton (x,y,z,score) | Fast, CPU‑friendly pose detection | Apache 2.0 | 1–2 min CPU |
| 2.3 | Keypoint detection | **OpenPose** | Frames → Full body/hand/face keypoints | High‑accuracy multi‑person pose detection | Apache 2.0 | 2–4 min GPU / 10–15 min CPU |
| 2.3 | Keypoint detection | **MoveNet** | Frames → 17‑point skeleton | Ultra‑fast single‑person pose detection | Apache 2.0 | 20–40 sec GPU / 2–3 min CPU |
| 2.4 | Object detection | **YOLOv8 / YOLOv9** | Frames → Bounding boxes + class + confidence | Fast object detection; ideal for tracking ROI | AGPL | 5–10 sec GPU / 20–40 sec CPU |
| 2.4 | Object detection | **Detectron2** | Frames → Boxes + masks + classes | High‑accuracy detection & segmentation | Apache 2.0 | 20–40 sec GPU |
| 2.5 | Object tracking | **DeepSORT** | Boxes + embeddings → Object tracks (ID + trajectory) | Multi‑object tracking with re‑ID | MIT | 30–60 sec GPU / 2–3 min CPU |
| 2.5 | Object tracking | **ByteTrack** | Boxes → Object tracks | Very fast, high‑accuracy tracker | MIT | 10–20 sec GPU / 1–2 min CPU |
| 2.6 | Hybrid ML motion extraction | **Funscript‑Flow tracker** | Frames → 1D motion curve (vertical displacement) | Motion‑only tracking using optical flow + heuristics | MIT | 1–3 min CPU |
| 2.6 | Hybrid ML motion extraction | **FunGen motion pipeline** | Frames → Multi‑stage motion curve + metadata | ML‑based detection + tracking + curve extraction | MIT | 1–2 min GPU / 3–5 min CPU |
| 2.7 | Scene‑aware motion interpretation | **LLaVA / Qwen‑VL** | Sampled frames → ROI selection, scene classification | Helps choose what to track; semantic filtering | Apache 2.0 | 1–3 min (sampled frames) |
| 2.8 | Frame‑to‑signal conversion | **NumPy / SciPy** | Keypoints/boxes/flow → 1D motion signal | Converts tracked positions into continuous motion | BSD | <10 sec |
| 2.9 | Motion normalization | **PyTorch / TensorFlow** | Raw motion → normalized, smoothed motion | GPU‑accelerated filtering, smoothing, normalization | BSD / Apache 2.0 | 10–20 sec GPU |

---

## How this stage connects to Step 3
The outputs from Step 2 feed directly into Step 3 (Signal Cleanup & Smoothing). Depending on the method:

- **Optical flow** → dense motion field → reduced to vertical displacement curve  
- **Keypoints** → y‑coordinate of target joint → stroke waveform  
- **Bounding boxes** → box center or height → motion curve  
- **Hybrid pipelines** → already‑smoothed motion curve + confidence  

Your transformer‑based smoothing and mode‑window logic will sit on top of these outputs.

If you want, I can build **Step 3** next with the same structure, including inputs/outputs for smoothing, filtering, peak detection, and velocity limiting.