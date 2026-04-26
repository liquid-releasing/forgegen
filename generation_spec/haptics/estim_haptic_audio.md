A multi‑channel e‑stim system built on **JSON → WAV → 7.1 audio interface → e‑stim boxes** needs a single, clean, device‑agnostic schema that describes *what to generate*, not *how to electrically drive it*. The renderer then turns that JSON into an 8‑channel WAV that plays in sync with the video. This is the exact parallel to funscript → stroker, but extended to spatial, multi‑region stimulation.

Below is a complete, extensible schema that captures everything your generator needs: regions, envelopes, overlays, carriers, transitions, and safety constraints.

---

## JSON schema for multi‑channel haptic/e‑stim patterns

### Top‑level structure
This describes the entire haptic timeline for a video.

```json
{
  "version": "1.0",
  "video_id": "example_video_001",
  "sample_rate": 48000,
  "channels": [
    "torso_front",
    "torso_back",
    "chest",
    "abdomen",
    "left_arm",
    "right_arm",
    "left_leg",
    "right_leg"
  ],
  "segments": [
    {
      "start": 0.0,
      "end": 12.5,
      "preset": "tease",
      "base_pattern": {
        "torso_front": 0.2,
        "chest": 0.1
      },
      "overlay": {
        "type": "wave",
        "frequency_hz": 1.2,
        "depth": 0.4,
        "phase_offset": 0.0
      },
      "carrier": {
        "frequency_hz": 850,
        "waveform": "sine"
      },
      "safety": {
        "max_intensity": 0.8,
        "attack_ms": 120,
        "release_ms": 120
      }
    }
  ]
}
```

This is the **device‑agnostic master format**. The renderer uses this to generate the WAV.

---

## What each part means

### Channels  
These are your abstract body regions. They map 1:1 to audio channels in the WAV.

### Segments  
Each segment corresponds to a semantic mode (tease, edging, drop, etc.) and contains:

- **base_pattern** — spatial distribution (region intensities)
- **overlay** — temporal modulation (pulse, wave, tremor, beat‑locked)
- **carrier** — electrical carrier frequency and waveform
- **safety** — max intensity, ramp times, slope limits

The renderer stretches the overlay to fit the segment duration.

---

## Base pattern  
Defines the *static* spatial intensity for each region.

```json
"base_pattern": {
  "torso_front": 0.2,
  "chest": 0.1
}
```

Regions not listed default to 0.

---

## Rhythmic overlay  
Defines the *temporal* modulation applied to the base pattern.

```json
"overlay": {
  "type": "pulse",
  "frequency_hz": 2.0,
  "depth": 0.5,
  "phase_offset": 0.0
}
```

Supported overlay types:
- **constant**  
- **pulse** (square or soft‑square)  
- **wave** (sine/triangle)  
- **tremor** (high‑frequency jitter)  
- **beat_locked** (sync to BPM)  
- **chaotic** (random bursts)  
- **rolling** (phase‑shifted across channels)

---

## Carrier  
Defines the electrical carrier for the channel.

```json
"carrier": {
  "frequency_hz": 850,
  "waveform": "sine"
}
```

Supported waveforms:
- sine  
- triangle  
- soft‑square  
- EMS‑pulse (with strict safety)

---

## Safety  
Defines mandatory constraints.

```json
"safety": {
  "max_intensity": 0.8,
  "attack_ms": 120,
  "release_ms": 120
}
```

The renderer enforces:
- intensity clamping  
- ramp‑in/ramp‑out  
- slope limiting  
- per‑channel isolation (handled in hardware)

---

## How the renderer uses this JSON to generate WAV

For each channel:

1. Create a carrier:  
   `carrier(t) = sin(2π f t)` or chosen waveform.

2. Create an envelope from:  
   - base pattern  
   - overlay  
   - transitions  
   - safety ramps  

3. Multiply:  
   `output(t) = envelope(t) × carrier(t)`

4. Write each region to its own WAV channel.

The result is an **8‑channel WAV** that plays in sync with the video.

---

## How this fits your hardware plan

You are correct on all points:

- You **still need e‑stim boxes** (one per channel or per pair).  
- You **still need electrodes/pads/suit** to place on the body.  
- You **use a 7.1 or 7.2 audio interface** as the transport layer.  
- You **play the WAV with the video**, just like funscript playback.  
- The JSON is the “funscript” equivalent for multi‑channel e‑stim.  
- The renderer deterministically produces the WAV from the JSON.  

Your software becomes the **authoring + rendering engine**, not the electrical hardware.

---

## A natural next step  
To make this fully operational, the next design decision is how you want to map **regions → audio channels** for your 7.1 interface, since that determines how the WAV channels correspond to electrode placement.

------

A clean region→audio‑channel mapping is the last structural piece you need before the JSON schema can drive a deterministic multi‑channel WAV renderer. The goal is to define a **stable, hardware‑agnostic mapping** that works for both your preset system and any 7.1/7.2 audio interface you plug into e‑stim boxes.

---

## Mapping regions to 7.1 channels
A 7.1 interface gives you eight discrete outputs. Assigning each to a body region creates a predictable spatial layout that your renderer can target.

### Recommended mapping
This layout mirrors the physical orientation of the body and keeps left/right symmetry intuitive.

- **Channel 1 — torso_front**  
- **Channel 2 — torso_back**  
- **Channel 3 — chest**  
- **Channel 4 — abdomen**  
- **Channel 5 — left_arm**  
- **Channel 6 — right_arm**  
- **Channel 7 — left_leg**  
- **Channel 8 — right_leg**

This gives you a full upper‑body and limb map that aligns with your preset regions and supports rolling sensations through phase‑shifted overlays.

### Why this mapping works well
- It matches the spatial logic of your base patterns.  
- It keeps torso regions on the primary channels for maximum clarity.  
- It allows left/right rolling effects across arms and legs.  
- It keeps abdomen and chest independent for nuanced edging patterns.  
- It scales cleanly if you add more channels later.

---

## How the JSON schema uses this mapping
The JSON you generate doesn’t need to know about audio channels directly. It only needs to specify **regions**. The renderer then applies the mapping to assign each region’s envelope to the correct audio channel.

### Example
If a segment defines:

```json
"base_pattern": {
  "torso_front": 0.4,
  "abdomen": 0.6
}
```

The renderer knows:
- torso_front → channel 1  
- abdomen → channel 4  

It generates envelopes for those channels and leaves the others silent.

---

## How this integrates with your hardware plan
The mapping becomes the bridge between your software and the physical e‑stim setup.

### What you still need on the hardware side
- A 7.1 or 7.2 audio interface with eight isolated outputs.  
- E‑stim boxes that accept line‑level audio per channel.  
- Electrodes or pads placed according to the region map.  
- Isolation between channels to avoid cross‑current paths.

Your software handles:
- semantic modes  
- presets  
- envelopes  
- rhythmic overlays  
- safety ramps  
- WAV generation  

The hardware handles:
- electrical output  
- current limiting  
- electrode contact  

This separation keeps the system safe and modular.

---

## How this moves you toward full haptic support
With the region→channel mapping defined, you now have all the conceptual pieces:

- a preset system  
- a JSON schema  
- a deterministic renderer  
- a spatial mapping  
- a hardware transport layer  

The remaining work is implementation, not design.

A useful next step is deciding whether you want the renderer to support **per‑region carrier frequencies** or a **global carrier** for all channels, since that affects how distinct each region feels during playback.