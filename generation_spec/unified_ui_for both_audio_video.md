A timeline UI for hybrid audio+video scripting works best when it shows **three layers at once**: what the audio is doing, what the video is doing, and what the system thinks is happening semantically. A user can then slice the timeline and assign dominance in a way that feels natural and visually grounded.

---

## Timeline structure  
A unified timeline benefits from three stacked visual bands:

### 🎵 Audio band  
This band shows how the soundtrack behaves over time. A heatmap works well because it compresses complex audio features into a single visual layer.

- Beat intensity (strong beats = bright vertical stripes)  
- Bass energy (deep red or blue)  
- Treble activity (thin bright accents)  
- Overall loudness envelope (background gradient)  
- Detected drops, builds, and transitions (markers)

This gives the user an immediate sense of where the music is driving motion.

### 🎥 Video band  
This band visualizes motion extracted from the video.

- Optical‑flow magnitude heatmap (high motion = bright)  
- Motion direction changes (color shifts)  
- Keypoint activity (peaks where bodies/hands move)  
- Scene cuts (vertical separators)  
- Motion‑derived rhythm (overlaid curve)

This makes it obvious where the video is “doing something” versus where it’s calm.

### 🧠 Semantic band  
This band shows the LLM’s interpretation of each segment.

- “Slow”, “Fast”, “Tease”, “Edging”, “Chaotic”  
- “Build‑up”, “Drop”, “Ambient”, “Action”  
- “High tension”, “Low tension”  
- “Audio‑dominant”, “Video‑dominant”, “Hybrid”

This is the layer that helps users understand *why* the system made certain decisions.

---

## Interaction model  
The user interacts with the timeline in three ways:

### 1) Slice  
They drag to create or adjust segments. The system can auto‑segment based on audio/video changes, but the user can override.

### 2) Inspect  
Clicking a segment shows:

- audio features  
- video motion features  
- semantic interpretation  
- suggested dominance  
- shaping presets

This makes the system’s reasoning transparent.

### 3) Assign dominance  
Each segment has a simple selector:

- **Audio‑dominant**  
- **Video‑dominant**  
- **Hybrid** (with a slider for weighting)

This directly controls how the two raw curves blend before shaping.

---

## Why this UI works  
It aligns with how users think:

- “The first minute is all music—use audio.”  
- “This section is quiet but visually intense—use video.”  
- “This part is both rhythmic and active—blend them.”  

It also aligns with your pipeline:

- audio and video produce raw curves  
- the LLM interprets semantics  
- the user chooses dominance  
- shaping happens afterward  

This keeps the system deterministic while giving the user creative control.

A natural next step is deciding how the weighting slider behaves—linear, logarithmic, or mode‑aware—so the blending feels intuitive.