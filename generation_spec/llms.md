Only a **small handful of pipeline stages** genuinely benefit from an LLM. Everything else is deterministic DSP, optical flow, clustering, or PyTorch shaping. The table below isolates the *exact* points where an LLM adds meaningful value for **audio**, **video**, or **hybrid** funscript generation.

---

## Where an LLM Improves Audio/Video → Funscript  
These are the *only* stages where an LLM provides leverage that DSP or PyTorch cannot.

### LLM‑Relevant Stages Across Both Pipelines

| Stage | Audio Role | Video Role | Why an LLM Helps | Inputs → Outputs |
|-------|------------|------------|------------------|------------------|
| **Semantic Section Interpretation** | Identify mood, structure (verse/chorus/drop), emotional tone | Identify behavior (slow/fast/tease/edging), scene intent | DSP can detect *motion* or *sound*, but not *meaning*; LLM interprets narrative/intent | Audio/video embeddings → semantic labels |
| **Mode/Behavior Refinement** | Suggest tease, build‑up, drop, ambient, rhythmic modes | Suggest tease, edging, slow, fast, chaotic modes | LLM can infer “what this section *feels like*” beyond raw signals | Raw modes → refined semantic modes |
| **User Intent Translation** | Convert “make it feel sensual” into shaping parameters | Convert “make it more responsive” into shaping parameters | Natural language → parameter sets is an LLM’s strength | User text → shaping config |
| **Creative Shaping Suggestions** | “Make the drop explode”, “follow the drums more” | “Make this scene smoother”, “increase tension here” | LLM can propose shaping strategies DSP cannot infer | User intent + features → shaping directives |
| **Hybrid Audio/Video Arbitration** | Decide which modality should dominate a segment | Same | LLM can reason about ambiguous cases (“audio is strong but video is chaotic”) | Audio+video features → dominance weights |
| **Timeline Explanation & Summaries** | Describe why a section is beat‑heavy or melodic | Describe why a section is motion‑heavy or calm | Helps users understand the pipeline’s decisions | Features → human‑readable summary |
| **Preset Generation & Style Mapping** | “Club track”, “ambient tease”, “bass‑driven” | “Sensual slow”, “chaotic fast”, “mechanical precision” | LLM can map high‑level styles to parameter bundles | Style text → preset config |

---

## Why these are the *only* LLM‑relevant stages
Every other part of the pipeline is:

- deterministic  
- mathematical  
- GPU‑accelerated  
- reproducible  
- not improved by probabilistic reasoning  

LLMs shine only where **meaning**, **intent**, or **creative interpretation** is required.

---

## How this fits your UI vision  
Your idea of a **timeline with heatmaps** and **slice‑and‑assign dominance** aligns perfectly with these LLM touchpoints:

- The LLM can **describe** each segment (“strong bass‑driven intro”, “high‑motion action scene”).  
- The LLM can **suggest** which modality should dominate.  
- The LLM can **translate** user instructions (“make the first minute follow the beat”) into dominance weights.  
- The LLM can **generate presets** for entire sections.  

Everything else — beat detection, optical flow, shaping, easing, velocity, export — stays deterministic.

---

## A natural next step  
Would you like a **unified hybrid pipeline diagram** showing exactly where audio, video, and LLM layers intersect and how the blending model works across the timeline?