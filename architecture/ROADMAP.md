# forgegen — Product Roadmap

## Goal

Replace and outperform the existing fragmented toolchain:
- PythonDancer (audio-driven, basic)
- FunGen (AI-powered, VR-only)
- FunscriptFlow (Apache, generic)
- funscript.io (micro-apps, Handy-specific)
- OpenFunscripter (manual editing, not generation)

forgegen is the **generation** layer. FunscriptForge is the **editing** layer. Together they cover the full pipeline from any media to any device.

---

## Release milestones

### v0.1 — Audio-to-funscript (the 30-second demo) ✅ COMPLETE

**Goal:** Drop a song. Feel the beat. Ship something people can use today.

Pure DSP — no video, no LLM, no GPU required.

**Big chunks:**

- [x] Wire `analyze_beats()` output → raw motion curve (`beats_to_curve()` in `videoflow.generate`)
- [x] Mode classifier: label segments slow / fast / tease / edging from energy/BPM shape (`classify_modes()`)
- [x] Curve shaping: easing + velocity profiles per mode (`shape_curve()`)
- [x] Funscript JSON export with validation (`export_funscript()`)
- [x] File-drop UI: load audio → BPM display → style cards → Generate → preview → export `.funscript`
- [x] Per-phrase mode override + advanced controls (Details tab)
- [ ] "Open in FunsriptForge" handoff — protocol decision still needed
- [ ] Preview / playback: media + funscript curve synchronized

**What this replaces:** PythonDancer, basic audio path of FunscriptFlow.

**What to do next:** Test with real audio files. Get user feedback before building the next milestone.

---

### v0.2 — Estim audio path

**Goal:** First-class support for the estim community. Differentiated from all existing tools.

**Big chunks:**
- [ ] Peak-based estim audio → funscript converter
- [ ] Stereostim A/B channel interpretation (channel dominance → stroke position)
- [ ] Blend estim path into the same UI as music path
- [ ] Export: single-channel funscript for estim devices
- [ ] Stand up mkdocs site for videoflow (lives in videoflow; forgegen docs cross-link to it for shared concepts — `analyze_beats()`, AudioBeatMap, structural primitives)

Open questions

- [ ] Can or should we output alpha and beta (left right) funscripts channels corresponding to the left right channels in the music
- [ ] Does this technique provide emphasis on beats. And do we add this as optional for the user?
- [ ] Does this export a beat map (json or metadata to be used in other forge apps?) so we can align features (such as events) to a nearby beat?

**What this replaces:** Manual Audacity + Python workflows. No existing tool does this cleanly.

---

### v0.3 — Video funscript generation

**Goal:** Motion-driven generation from any video. Replace FunGen (without the VR-only limitation).

**Big chunks:**
- [ ] Video ingest pipeline (FFmpeg frames → normalized tensors)
- [ ] ROI detection (MediaPipe pose for CPU; YOLOv8 for GPU)
- [ ] Optical flow: OpenCV Farnebäck (CPU) and RAFT (GPU optional)
- [ ] Signal cleanup: smoothing, velocity limiting, amplitude normalization
- [ ] Stroke segmentation and pattern detection
- [ ] Mode classification (deterministic rule-based — no ML required for V1)
- [ ] Funscript export (same as audio path)
- [ ] Video UI: motion heatmap + controls + preview

**What this replaces:** FunGen (broader: not VR-only), FunscriptFlow video path.

**GPU note:** Video path works on CPU (slower). RAFT adds ~30–60s on GPU vs. several minutes on CPU. OpenCV Farnebäck is the CPU-viable fallback.

---

### v0.4 — Hybrid audio + video

**Goal:** The full pipeline. Per-segment dominance. The UI that shows both heatmaps.

**Big chunks:**
- [ ] Blending layer: weighted merge of audio and video motion curves
- [ ] Timeline UI: three-band display (audio heatmap / video heatmap / mode labels)
- [ ] Per-segment dominance selector: Audio / Video / Hybrid slider
- [ ] LLM arbitration (optional): suggest dominance per segment based on audio/video features

**What this enables:** The unique use case — "this section is quiet music but visually intense, use video here."

---

### v0.5 — Long-form scaling: auto-chunking + chapter intent

**Goal:** forgegen handles arbitrarily long media. Multi-hour audio and feature-length video do not crash, run out of memory, or stall the UI.

**Driver:** v0.1 audio path tips over on long files (threshold currently unknown — likely librosa's tempogram memory cliff). The fix is to chunk processing along natural boundaries (chapters when present, scene-detected synthetic chapters when not).

**Big chunks (lives in videoflow, consumed here):**
- [ ] `videoflow.structural.auto_chapter()` — synthetic Chapter list when source has none, by grouping scenes / silences to a ~5–6 min target
- [ ] Chapter-aware `analyze_beats()` — process one chunk at a time, hold one tempogram in memory
- [ ] Per-chunk AudioBeatMap stitching — single output timeline, per-chunk metadata preserved for intent
- [ ] forgegen UI: per-chapter progress bar instead of opaque wait

**What this enables:** chapter intent becomes meaningful (every long file has chapters). v0.3 video work and v0.4 hybrid blending compose with this naturally.

**Reusability:** Lives in `videoflow.structural`, so forgeplayer / forgeassembler / funscriptforge / future tools all benefit.

**Deep dive:** [LONG_FORM_SCALING.md](LONG_FORM_SCALING.md)

---

### v0.6 — LLM semantic layer

**Goal:** Natural language control. "Make the drop hit harder." "Follow the bass."

**Big chunks:**
- [ ] Local LLM integration (Ollama — required for adult content, no cloud calls)
- [ ] User intent translator: natural language → parameter set
- [ ] Semantic shaping: mood/arc-driven envelope adjustments
- [ ] Mode inference from audio/video embeddings

**Privacy decision required before this milestone.**

---

### v0.7 — Haptics expansion

**Goal:** Beyond single-axis. Multi-device, multi-channel.

**Big chunks:**
- [ ] bHaptics body-region tagging schema
- [ ] Haptic preset system (tease → spatial activation pattern)
- [ ] Multi-device export: bHaptics, Owo, bass shakers
- [ ] Haptics editor UI: visualize which body regions activate per segment

**What this enables:** The full "feel any music / any video" demo for any device class.

---

### v1.0 — Product release

**Goal:** Installable product. Replaces the fragmented toolchain completely.

**Big chunks:**
- [ ] Windows installer (NSIS or equivalent — consistent with FunScriptForge pattern)
- [ ] VR / 360 video support (equirectangular → ROI extraction for POV content)
- [ ] ML-trained models: behavior segmentation + curve shaping (trained on expert scripts)
- [ ] Batch processing: watch folder → auto-generate → library output
- [ ] Full FunScriptForge integration spec
- [ ] Linux support

---

## Gaps — what was missed or forgotten

These are not in the spec and need decisions before building.

### 1. Preview / playback during generation
The spec never describes how a user previews the output. Before exporting, they need to see the funscript curve synced to the audio/video. This is a significant UX piece — it's the moment where the tool feels like magic or feels broken. **No spec exists for this.**

### 2. VR / 360 video
FunGen specifically targets VR POV video. forgegen's spec doesn't mention equirectangular or VR at all. VR is a large and active segment of the funscript community. **Forgetting VR means failing to replace FunGen.**

### 3. Privacy model for LLMs
The spec calls for GPT-4-class LLMs for semantic interpretation. Adult content **cannot** go to OpenAI, Anthropic, or any cloud API. This is not just a preference — it's a legal and community trust issue. Local Ollama must be the default. **This decision shapes the entire LLM architecture.**

### 4. Content-specific ROI detection
YOLO and MediaPipe are general-purpose object detectors. For adult video, neither reliably finds the region of interest. Specialized models exist but are not mentioned in the spec. **Without solving this, the video path won't produce good funscripts on the primary content type.**

### 5. FunscriptForge handoff protocol
"Open in FunsriptForge" is mentioned everywhere but never specced. File path? Named pipe? Shared temp folder? API call? This is a coordination decision between two products. **It needs a written spec before building either side of the integration.**

### 6. Distribution / installer
How does a user get forgegen? The spec says nothing about packaging. Electron/Tauri desktop app? Streamlit served locally? Python package? Windows installer? **The answer shapes the entire UI architecture.**

### 7. Training data pipeline for ML models
The ML models need 500–2000 labeled expert scripts. The spec doesn't say where these come from, who labels them, or what the labeling tool looks like. Without labeled data, the ML models can't be trained. **This is a content/community problem, not an engineering one, and it's not addressed anywhere.**

### 8. The "easy button" UX scope
HAPTICS_PATH.md describes a 30-second demo: "drop a song, feel it." The easybutton_tab.md describes a much more complex interface with intent selection, crop/trim, comparison workflows. **These are in tension. Decide what V1 exposes before building the UI.**

### 9. Batch / library mode
Mentioned briefly (watch folders in video7) but not central to the product vision. For creators producing content at scale — multiple videos per week — batch generation is a core workflow. **This needs a first-class spec, not an afterthought.**

### 10. Versioning and funscript format compatibility
Different devices interpret funscripts differently. Some have velocity limits, some have position constraints, some support extensions. The spec treats funscript as a single format. **Device-specific constraints should be part of the export spec, not left to FunScriptForge alone.**

### 11. Estim path as first-class input
Estim audio → funscript is buried in `estim_audio_input/notes.md`. It doesn't appear in the main pipeline diagram. But for the estim community, this is the primary use case. **It should be a named first-class input path alongside audio-only and video-only.**

### 12. Testing strategy
How do you know a generated funscript is good? The spec has QA/validation for technical correctness (no illegal velocity jumps, valid JSON) but no strategy for functional quality. **What does "this funscript is good" mean, and how do you measure it?**

---

## Is this over-engineered?

**For the 30-second demo: yes, parts of it are.** The audio-only path (v0.1) requires almost none of the complex video pipeline. Everything needed to ship "drop a song, feel the beat" is:

1. `analyze_beats()` — already built
2. beats + energy → motion curve — ~100 lines of NumPy
3. motion curve → funscript JSON — ~50 lines
4. file-drop UI — ~200 lines Streamlit

The full pipeline — RAFT optical flow, MoveNet, pattern clustering, ML models, LLM layer — is the right long-term architecture. But the 9-stage video spec is engineering for the 2-year vision, not the 2-week demo.

**Recommendation:** Build v0.1 (audio funscript) and v0.2 (estim path) first. Ship them. Use real user feedback to decide how much of the video pipeline complexity is actually needed vs. theoretical.

The risk of building the full video pipeline before validating that users want it: high. The risk of shipping audio-only first: low.
