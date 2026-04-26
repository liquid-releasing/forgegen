A PyTorch‑based preprocessing module for **Step 1.6 (Preprocessing orchestration)** is not an LLM and does **not** require training a model. It is a **GPU‑accelerated tensor pipeline** that converts decoded video frames into a consistent, normalized, batched tensor format for downstream motion‑detection models.

This section gives you a **developer‑ready specification**: what the module does, what inputs/outputs look like, how it fits into the pipeline, and what a developer must implement.

---

## What this module *is*
A **PyTorch transforms pipeline** that performs:

- resizing  
- normalization  
- batching  
- optional color‑space conversion  
- optional frame augmentation (if needed)  
- GPU transfer  

It is analogous to torchvision transforms used in image models, but applied to video frames.

It is **not** an LLM, not a model, and does not require training.  
It is a deterministic preprocessing stage.

---

## What this module *does*
### 1) Accepts decoded frames  
Input:  
- A list or generator of frames as NumPy arrays (`H × W × 3`, uint8)

### 2) Converts to PyTorch tensors  
- Converts each frame to `torch.float32`  
- Normalizes pixel values to `[0, 1]`  
- Reorders channels to `C × H × W`

### 3) Applies GPU‑accelerated transforms  
Typical transforms:

- **Resize** to a fixed resolution (e.g., 256p or 512p)  
- **Normalize** using mean/std (e.g., ImageNet or custom)  
- **Optional**: grayscale conversion  
- **Optional**: center crop or ROI crop  
- **Optional**: temporal subsampling (e.g., 30fps → 15fps)

### 4) Batches frames efficiently  
- Groups frames into batches (e.g., 32 or 64 frames per batch)  
- Moves batches to GPU (`cuda:0`)  
- Yields them to the next stage (motion detection)

### 5) Outputs a tensor stream  
Output:  
- A generator or list of tensors shaped:  
  `batch_size × 3 × H × W`

This is the ideal input format for RAFT, MoveNet, YOLO, or any PyTorch‑based motion model.

---

## Developer Specification  
### Module Name  
`preprocessing/transforms_pytorch.py`

### Responsibilities  
- Provide a clean API for frame → tensor preprocessing  
- Handle GPU/CPU fallback  
- Maintain consistent resolution and normalization across the pipeline  
- Provide batched output for efficient inference

### Inputs  
- `frames`: iterable of NumPy arrays  
- `target_size`: `(height, width)`  
- `batch_size`: integer  
- `device`: `"cuda"` or `"cpu"`  
- `normalize`: mean/std tuples  
- `roi`: optional bounding box for cropping

### Outputs  
- Generator of PyTorch tensors:  
  `torch.Tensor(batch_size, 3, H, W)`

### Required Dependencies  
- `torch`  
- `torchvision` (optional but recommended)  
- `numpy`  

### Required Functions  
#### 1. `to_tensor(frame: np.ndarray) -> torch.Tensor`
- Converts to float32  
- Normalizes to `[0, 1]`  
- Reorders channels  

#### 2. `resize(tensor: torch.Tensor, size: Tuple[int,int])`
- Uses `torch.nn.functional.interpolate`  

#### 3. `normalize(tensor, mean, std)`
- Standard per‑channel normalization  

#### 4. `batchify(frames, batch_size)`
- Groups frames into batches  

#### 5. `to_device(batch, device)`
- Moves batch to GPU  

#### 6. `preprocess_stream(frames, config)`
- Orchestrates the entire pipeline  
- Yields batches to downstream motion detection  

---

## Example Developer‑Level Flow (Conceptual)

```
frames (NumPy) 
    → to_tensor() 
    → resize() 
    → normalize() 
    → batchify() 
    → to_device() 
    → yield batch (PyTorch tensor)
```

This is exactly what RAFT, MoveNet, YOLO, and other PyTorch models expect.

---

## Is this an LLM?  
**No.**  
This module is purely deterministic tensor processing.  
No training, no dataset, no model weights.

---

## When would an LLM be used instead?  
Only if you want **semantic preprocessing**, such as:

- “Which object should I track?”  
- “Which region of the frame contains the action?”  
- “Is this scene slow or fast?”  

Those tasks require a **vision‑language model** (LLaVA, Qwen‑VL, InternVL).  
But Step 1.6 is not that.  
It is strictly tensor preparation.

---

## What a developer must implement  
- A clean, reusable PyTorch transform pipeline  
- GPU‑accelerated resizing and normalization  
- Efficient batching  
- Optional ROI cropping  
- A streaming API that yields batches to Step 2  
- Unit tests for:  
  - shape correctness  
  - normalization correctness  
  - GPU/CPU fallback  
  - batch boundary behavior  

---

## What data is required?  
None.  
This module does not learn anything.  
It only transforms frames.

---

If you want, I can produce the **actual code‑level API design** next (function signatures, module layout, config objects), or I can continue with the next PyTorch‑based step in the pipeline.