RAFT sits at the heart of Step 2 because it converts raw frames into a dense motion field that downstream stages can turn into a 1‑D motion curve. Unlike the PyTorch transforms in Step 1, RAFT **is** a trained deep model, but you do **not** need to train it yourself. You integrate it as a pretrained module and wrap it with a developer‑level interface that fits your pipeline.

The sections below give you a complete developer specification: what RAFT does, what inputs/outputs look like, how to incorporate it, what code modules are required, and what data an LLM‑based variant would need (if you ever wanted one).

---

## RAFT’s role in the pipeline
RAFT is a **dense optical‑flow model**. It takes two consecutive frames and predicts a full‑resolution flow field:

- Input: two RGB frames  
- Output: a tensor of shape **H × W × 2**  
  - channel 0 = horizontal flow  
  - channel 1 = vertical flow  

This flow field is the most accurate way to extract motion from video without relying on keypoints or bounding boxes.

---

## Developer‑level specification for RAFT integration

### Module name  
`motion/optical_flow/raft_engine.py`

### Responsibilities  
- Load the pretrained RAFT model  
- Preprocess frames into RAFT’s expected tensor format  
- Run inference on GPU (or CPU fallback)  
- Return dense flow fields for each frame pair  
- Provide a streaming API so Step 2.8 can convert flow → motion curve

---

## Inputs → Outputs

### Inputs  
- `frame_t`: NumPy array or PyTorch tensor, shape `(H, W, 3)`  
- `frame_t1`: same shape  
- Optional:  
  - `roi`: bounding box for cropping  
  - `resize`: target resolution (RAFT often uses 320×240 or 512×384)  
  - `device`: `"cuda"` or `"cpu"`

### Outputs  
- `flow`: PyTorch tensor, shape `(2, H, W)`  
  - `flow[0]` = horizontal displacement  
  - `flow[1]` = vertical displacement  
- Optional:  
  - confidence map  
  - upsampled flow to original resolution  
  - masked flow (if ROI applied)

---

## Required components

### 1. Model loader  
Loads the pretrained RAFT weights (publicly available under Apache 2.0).

```
class RAFTEngine:
    def __init__(self, model_path, device):
        self.model = load_raft(model_path).to(device).eval()
```

### 2. Frame preprocessing  
RAFT expects:

- `float32`  
- normalized to `[0, 1]`  
- shape `(1, 3, H, W)`  
- optionally resized to RAFT’s native resolution  

```
def preprocess(frame):
    tensor = torch.from_numpy(frame).permute(2,0,1).float() / 255.0
    return tensor.unsqueeze(0)
```

### 3. Inference  
RAFT takes two frames and returns a flow tensor.

```
with torch.no_grad():
    flow_low, flow_up = self.model(frame_t, frame_t1, iters=20)
```

### 4. Post‑processing  
- Convert flow to CPU if needed  
- Resize back to original resolution  
- Optionally crop to ROI  
- Return `(2, H, W)` tensor

### 5. Streaming API  
For a 5‑minute clip (~9,000 frames), you never want to load all frames into memory.  
You expose a generator:

```
def compute_flow_stream(frames):
    for t in range(len(frames)-1):
        yield self.compute_flow(frames[t], frames[t+1])
```

This allows Step 2.8 to convert flow → motion curve on the fly.

---

## Runtime expectations  
- **GPU:** 30–60 seconds for a 5‑minute 1080p video  
- **CPU:** 6–10 minutes  
- Memory: ~2–4 GB VRAM depending on resolution  
- Batch size: RAFT processes frame pairs one at a time (no batching)

---

## What a developer must implement  
### Core tasks  
- Model loading and device management  
- Frame preprocessing (resize, normalize, reorder channels)  
- RAFT inference loop  
- Flow post‑processing (upsampling, ROI cropping)  
- Streaming interface for downstream modules  
- Unit tests for:  
  - shape correctness  
  - GPU/CPU parity  
  - deterministic output  
  - ROI correctness  

### Integration tasks  
- Connect RAFT output to Step 2.8 (flow → motion curve)  
- Ensure consistent resolution with Step 1.6 transforms  
- Handle fallback if GPU unavailable  
- Provide metrics (runtime, FPS processed)

---

## Is RAFT an LLM?  
No.  
RAFT is a **convolutional recurrent optical‑flow model**, not a language model.

- It does not use text  
- It does not require prompts  
- It does not require training data at inference time  
- You do not train it yourself  

You simply load pretrained weights and run inference.

---

## When would an LLM be involved?  
Only if you want **semantic motion interpretation**, such as:

- “Which object should RAFT track?”  
- “Is this motion relevant or background noise?”  
- “Should I crop to this region?”  

In that case, a vision‑language model (LLaVA, Qwen‑VL) would need:

- sampled frames  
- bounding boxes  
- scene descriptions  
- motion summaries  

But RAFT itself does not require any of this.

---

## What data would an LLM‑based RAFT replacement need?  
If you ever wanted an LLM‑driven optical‑flow model (not recommended today), it would require:

- paired frames  
- ground‑truth flow fields  
- large‑scale video datasets (e.g., FlyingChairs, FlyingThings3D, Sintel, KITTI)  
- supervised training on millions of frame pairs  

This is far beyond what is needed for your pipeline.  
Using pretrained RAFT is the correct approach.

---

If you want, the next PyTorch‑based module to spec out is **MoveNet**, **YOLO**, or **ByteTrack**, depending on which branch of Step 2 you want to document next.
