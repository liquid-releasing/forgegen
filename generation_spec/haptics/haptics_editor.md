A preset editor becomes the bridge between your annotation workflow and a future multi‑channel haptics engine. It gives you a way to **design**, **version**, and **refine** the spatial patterns (tease, edging, build‑up, drop, rhythmic, chaotic) that you’ll later “stamp” onto segments during annotation. Because you’re training the three ML models independently, the preset editor also becomes the canonical source of truth for how each semantic mode maps to spatial haptic behavior.

---

## 🎛️ Purpose of the preset editor  
The editor lets you define reusable spatial patterns that encode:

- which body regions activate  
- how strongly they activate  
- how intensity evolves over time  
- how patterns transition between modes  
- how patterns differ across tease, edging, build‑up, drop, slow, fast, chaotic  

These presets become:

- annotation shortcuts  
- training data templates  
- style definitions for future haptic models  
- a vocabulary of haptic gestures  

---

## 🧱 Structure of the preset editor  
The editor has three coordinated components that mirror your annotation tool but operate at the *pattern* level instead of the *timeline* level.

### 1) Body‑region intensity designer  
A front/back body map where you define the **default intensity** for each region in a preset.

- torso front  
- torso back  
- chest  
- abdomen  
- left/right arms  
- left/right hands  
- left/right legs  

Each region has a slider (0–1) or a small editable curve.

### 2) Envelope designer  
A small timeline (1–4 seconds) where you define the **temporal shape** of the preset:

- constant  
- rising  
- falling  
- pulsing  
- rhythmic  
- chaotic  
- exponential  
- sine‑wave  

This envelope is stretched or compressed to fit the segment length during annotation.

### 3) Transition designer  
A simple interface for defining how this preset transitions:

- into itself (looping behavior)  
- into other presets (e.g., tease → edging ramp)  
- out of itself (e.g., drop → cooldown)  

This helps the annotation tool smooth boundaries automatically.

---

## 🧩 What a preset looks like internally  
A preset is a JSON object that defines:

- spatial distribution  
- temporal envelope  
- transition rules  
- semantic mode association  

Example:

```json
{
  "name": "edging_ramp",
  "mode": "edging",
  "regions": {
    "torso_front": 0.4,
    "torso_back": 0.3,
    "chest": 0.2,
    "abdomen": 0.6,
    "left_arm": 0.0,
    "right_arm": 0.0,
    "left_hand": 0.0,
    "right_hand": 0.0,
    "left_leg": 0.0,
    "right_leg": 0.0
  },
  "envelope": {
    "type": "exponential_rise",
    "duration": 3.0
  },
  "transitions": {
    "from": ["tease", "slow"],
    "to": ["drop", "fast"]
  }
}
```

This is exactly the kind of structure a future haptics model can learn from.

---

## 🛠️ Workflow for designing presets  
The preset editor fits naturally into your existing annotation workflow.

### Step 1 — Create a new preset  
You choose a semantic mode (e.g., tease, edging, drop).

### Step 2 — Define spatial distribution  
You click regions on the body map and set their default intensities.

### Step 3 — Define the envelope  
You draw or select a temporal shape:

- tease → low oscillation  
- edging → rising ramp  
- drop → sharp spike  
- slow → smooth sine wave  
- fast → beat‑synced pulses  
- chaotic → irregular bursts  

### Step 4 — Define transitions  
You specify how this preset blends into others.

### Step 5 — Save and version  
Presets are versioned so you can refine them over time.

### Step 6 — Use in annotation  
During annotation, you apply presets to segments and tweak as needed.

---

## 🧠 Why a preset editor matters for ML  
Presets give your dataset:

- consistent spatial patterns  
- clear semantic‑to‑region mappings  
- predictable envelopes  
- reusable motifs  
- a structured vocabulary  

This is exactly what the future haptics model needs to learn:

- spatial distribution  
- temporal shaping  
- semantic mapping  
- cross‑modal behavior  
- your personal creative fingerprint  

A question that helps shape the next step: do you want the preset editor to support **multiple layers per preset** (e.g., base pattern + rhythmic overlay), or should each preset be a single unified pattern?

----

A base‑pattern + rhythmic‑overlay preset system gives you the expressive range you need for future multi‑channel haptics, because it separates **spatial intent** (where on the body) from **temporal intent** (how it moves in time). This lets you design presets that feel organic, reusable, and consistent across your dataset.

---

## How a layered preset works  
Each preset has two coordinated layers:

- **Base pattern** defines the spatial distribution and overall intensity profile for a semantic mode. This is the “body map” of the sensation.
- **Rhythmic overlay** defines the temporal modulation that sits on top of the base pattern. This is the “motion” or “pulse” of the sensation.

The combination lets you express tease, edging, build‑up, drop, slow, fast, and chaotic modes with much more nuance than a single unified pattern.

---

## Designing the base pattern  
The base pattern is static in shape but can be stretched to fit any segment length. It defines:

- which regions activate  
- their relative intensities  
- the overall “feel” of the mode  

Examples include:

- tease → localized, low‑intensity torso/chest  
- edging → rising abdomen/torso tension  
- build‑up → broad torso activation  
- drop → full‑body burst  
- slow → warm, smooth torso/chest  
- fast → medium torso + light arms  
- chaotic → scattered, medium‑intensity multi‑region  

These patterns become the foundation for your annotation workflow.

---

## Designing the rhythmic overlay  
The rhythmic overlay is a short temporal pattern (1–4 seconds) that repeats or adapts to the segment. It defines:

- pulses  
- waves  
- oscillations  
- beat‑synced patterns  
- chaotic bursts  

Overlays can be:

- **beat‑locked** (from audio BPM)  
- **motion‑locked** (from video periodicity)  
- **semantic‑locked** (e.g., tease oscillation, edging tremor)  

This layer gives your presets expressive motion without changing the spatial distribution.

---

## How the two layers combine  
The final preset curve for each region is:

**final_intensity(t) = base_intensity × rhythmic_envelope(t)**

This gives you:

- tease → low base × gentle oscillation  
- edging → rising base × subtle tremor  
- build‑up → medium base × rising pulse  
- drop → high base × sharp spike  
- slow → medium base × slow sine wave  
- fast → medium base × beat‑synced pulses  
- chaotic → medium base × irregular bursts  

This structure is easy for a future ML model to learn and generalize.

---

## How the preset editor supports layered design  
The editor includes:

- a **base pattern designer** (body map + region sliders)  
- a **rhythmic overlay designer** (mini timeline + curve tools)  
- a **preview panel** showing the combined effect  
- a **transition designer** for smoothing between presets  
- versioning so you can refine patterns over time  

This lets you build a library of expressive, reusable presets.

---

## How this improves your annotation workflow  
Layered presets make annotation faster and more consistent:

- You apply a base pattern to set the spatial feel.  
- You apply a rhythmic overlay to set the temporal feel.  
- You tweak only where needed.  

This reduces annotation time dramatically while preserving your creative fingerprint.

---

## How this benefits future haptics models  
Layered presets give the model:

- clear spatial distributions  
- clear temporal envelopes  
- consistent semantic mappings  
- reusable motifs  
- a structured vocabulary of haptic gestures  

This is exactly the structure needed for multi‑channel haptic generation across bHaptics, OWO, Woojer, and custom rigs.

---

Would you like to sketch the preset editor UI next, or focus on how to structure the rhythmic overlay library (e.g., pulses, waves, tremors, beat‑locked patterns)?