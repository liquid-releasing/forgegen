Here is **Step 1 — Input Ingestion & Preprocessing** rebuilt with the same structure you approved for Step 2: including **Inputs → Outputs**, capabilities, license, and realistic processing times for a **1080p, 5‑minute, 30 fps** video (~9,000 frames).

Your open tabs include Funscript‑Flow’s license page, but none of the tabs contain content relevant to Step 1’s technical details, so no tab‑based citations are required.

---

## Step 1 — Input Ingestion & Preprocessing  
### Frame extraction, normalization, stabilization, ROI detection, metadata extraction

### Table: Libraries, Inputs/Outputs, Capabilities, License, Runtime

| Step | Task | Library / Model | Inputs → Outputs | Capabilities Summary | License | Est. Time (1080p, 5 min) |
|------|------|-----------------|------------------|-----------------------|----------|---------------------------|
| 1.1 | Video decoding & frame extraction | **FFmpeg** | Video file → Raw frames (RGB or YUV), audio, metadata | Fast decoding, FPS normalization, format conversion, cropping, scaling | LGPL/GPL | 10–20 sec GPU / 30–60 sec CPU |
| 1.1 | Video decoding & frame extraction | **PyAV** | Video file → Python frame objects (ndarrays) | Python bindings for FFmpeg; frame‑accurate extraction | LGPL | 20–40 sec |
| 1.2 | Frame resizing & normalization | **OpenCV** | Frames → Resized frames, normalized color, denoised frames | Resize, color‑space conversion, histogram equalization, denoising | BSD | 10–20 sec |
| 1.2 | Frame resizing & normalization | **scikit‑image** | Frames → Enhanced/normalized frames | Exposure correction, gamma adjustment, denoise filters | BSD | 20–40 sec |
| 1.3 | Video stabilization | **vidstab** | Frames → Stabilized frames + crop window | Motion estimation + smoothing; simple, robust CPU pipeline | MIT | 1–3 min CPU |
| 1.3 | Video stabilization | **OpenCV ECC / optical‑flow stabilizer** | Frames → Stabilized frames | Customizable stabilization using ECC or optical flow | BSD | 1–2 min CPU |
| 1.4 | Automatic ROI detection | **YOLOv8 / YOLOv9** | Frames → Bounding boxes + class + confidence | Fast object detection; ideal for selecting motion‑relevant ROI | AGPL | 5–10 sec GPU / 20–40 sec CPU |
| 1.4 | Automatic ROI detection | **MediaPipe** | Frames → Pose/hand/body landmarks | Lightweight CPU‑friendly ROI detection via keypoints | Apache 2.0 | 10–20 sec CPU |
| 1.4 | Automatic ROI detection | **Detectron2** | Frames → Boxes + masks + classes | High‑accuracy segmentation for precise ROI | Apache 2.0 | 20–40 sec GPU |
| 1.5 | Metadata extraction | **FFprobe** | Video file → FPS, resolution, codec, duration | Instant metadata extraction | LGPL/GPL | <1 sec |
| 1.6 | Preprocessing orchestration | **MoviePy** | Video file → Trimmed/resized frames, audio, composites | High‑level Python video editing; integrates FFmpeg | MIT | 30–60 sec |
| 1.6 | Preprocessing orchestration | **PyTorch transforms** | Frames → Batched, normalized tensors | GPU‑accelerated resizing, normalization, batching | BSD | 10–20 sec GPU |
| 1.7 | Semantic preprocessing | **LLaVA / Qwen‑VL / InternVL** | Sampled frames → Scene classification, ROI hints | Vision‑LLMs for semantic filtering, scene selection | Apache 2.0 | 1–3 min (sampled frames only) |

---

## How Step 1 feeds the rest of the pipeline
The outputs of Step 1 become the inputs to Step 2:

- **Normalized frames** (consistent resolution, color, FPS)  
- **Optional stabilized frames**  
- **ROI bounding boxes**  
- **Metadata** (duration, frame count, FPS, resolution)  

These ensure that Step 2’s motion detection operates on clean, consistent data.

If you want, I can now regenerate **Step 3** with the same Inputs → Outputs column added, so all three steps match perfectly.