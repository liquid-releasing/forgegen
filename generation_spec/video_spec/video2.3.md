Here is a full developer‑grade specification for the next PyTorch‑based module in the motion‑detection chain: **MoveNet**, which is used in Step 2.3 for fast, single‑person keypoint detection. This matches the depth and structure you approved for the RAFT spec.

---

## MoveNet (PyTorch) — Developer Specification  
MoveNet is a **pose‑estimation model** that outputs 17 body keypoints per frame. It is extremely fast and ideal for pipelines where you want a lightweight, CPU‑friendly or GPU‑accelerated way to extract a clean 1‑D motion signal from body movement.

MoveNet is **not** an LLM.  
It is a pretrained convolutional model that you integrate directly.

---

## Role in the Pipeline  
MoveNet provides **frame‑level keypoints** that Step 2.8 converts into a motion curve. It is especially useful when:

- the tracked object is part of the body  
- you want stable, low‑noise motion  
- you want to avoid heavy optical flow  
- you need real‑time or near‑real‑time performance  

---

## Inputs → Outputs

### Inputs  
- A single RGB frame (`H × W × 3`, uint8)  
- Optional ROI crop  
- Optional resizing (MoveNet prefers 192×192 or 256×256)  
- Device: `"cuda"` or `"cpu"`

### Outputs  
A tensor of shape:

```
17 keypoints × (x, y, confidence)
```

Where:

- `x`, `y` are normalized coordinates in `[0, 1]`  
- `confidence` is a float in `[0, 1]`  
- Keypoints include: nose, shoulders, elbows, wrists, hips, knees, ankles

This is ideal for generating a **vertical displacement curve** from a single joint (e.g., wrist, hip) or a composite of several joints.

---

## Developer‑Level Specification

### Module Name  
`motion/keypoints/movenet_engine.py`

### Responsibilities  
- Load MoveNet (PyTorch port or ONNX → PyTorch wrapper)  
- Preprocess frames into MoveNet’s expected format  
- Run inference efficiently on GPU or CPU  
- Return normalized keypoints  
- Provide a streaming API for Step 2.8

---

## Required Components

### 1. Model Loader  
MoveNet comes in two variants:

- **Lightning** (fastest, lower accuracy)  
- **Thunder** (slower, higher accuracy)  

Both are available as ONNX or TensorFlow Lite models; PyTorch wrappers exist.

```
class MoveNetEngine:
    def __init__(self, model_path, device):
        self.model = load_movenet(model_path).to(device).eval()
```

### 2. Frame Preprocessing  
MoveNet expects:

- `float32`  
- normalized to `[0, 1]`  
- resized to 192×192 or 256×256  
- shape `(1, 3, H, W)`

```
def preprocess(frame):
    tensor = torch.from_numpy(frame).permute(2,0,1).float() / 255.0
    tensor = F.interpolate(tensor.unsqueeze(0), size=(192,192))
    return tensor
```

### 3. Inference  
MoveNet outputs a `(1, 17, 3)` tensor.

```
with torch.no_grad():
    keypoints = self.model(tensor)
```

### 4. Post‑Processing  
- Convert normalized coordinates back to original resolution  
- Apply ROI offset if cropping was used  
- Filter low‑confidence points  
- Optionally smooth keypoints across frames (Step 3)

### 5. Streaming API  
MoveNet is frame‑based, so you expose:

```
def keypoint_stream(frames):
    for frame in frames:
        yield self.compute_keypoints(frame)
```

This allows Step 2.8 to convert keypoints → motion curve on the fly.

---

## Runtime Expectations  
- **GPU:** 20–40 seconds for a 5‑minute 1080p video  
- **CPU:** 2–3 minutes  
- Memory: <1 GB VRAM  
- Batch size: 1 frame at a time (MoveNet is optimized for single‑frame inference)

---

## What a Developer Must Implement

### Core Tasks  
- Model loading (PyTorch or ONNXRuntime → PyTorch wrapper)  
- Preprocessing (resize, normalize, reorder channels)  
- Inference loop  
- Keypoint post‑processing  
- Confidence filtering  
- ROI mapping  
- Streaming interface  
- Unit tests for:  
  - shape correctness  
  - coordinate normalization  
  - confidence thresholding  
  - GPU/CPU parity  

### Integration Tasks  
- Connect MoveNet output to Step 2.8 (keypoints → motion curve)  
- Ensure consistent resolution with Step 1.6 transforms  
- Provide fallback if MoveNet fails (e.g., occlusion)  
- Provide metrics (FPS processed, confidence stats)

---

## Is MoveNet an LLM?  
No.  
MoveNet is a **pose‑estimation CNN**, not a language model.

- No text input  
- No prompts  
- No training required  
- No dataset required at inference time  

You simply load pretrained weights.

---

## When Would an LLM Be Involved?  
Only for **semantic interpretation**, such as:

- “Which keypoint should I track?”  
- “Is this motion relevant?”  
- “Is the person moving or is the camera shaking?”  

In that case, a vision‑language model would need:

- sampled frames  
- keypoint heatmaps  
- motion summaries  

But MoveNet itself does not require this.

---

## What Data Would an LLM‑Based Pose Model Need?  
If you ever wanted to train a pose‑estimation LLM (not recommended), it would require:

- millions of labeled keypoint images  
- datasets like COCO‑Keypoints, MPII, Human3.6M  
- supervised training on GPUs  

This is unnecessary for your pipeline.

---

If you want, the next PyTorch‑based module to spec out could be **YOLO (object detection)** or **ByteTrack (tracking)**—both are central to Step 2 and integrate cleanly with RAFT and MoveNet.