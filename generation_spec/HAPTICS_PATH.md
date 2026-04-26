# The Path to Haptics

## What This Is

forgegen is a **haptic content generation engine**.

A funscript is just motion data — position values over time. What device plays it, and what media syncs to it, is entirely up to you. The format is the same. The devices are different. The content has no restrictions.

```
Audio / Video / Music
        ↓
    forgegen
        ↓
    funscript
        ↓
  Handy / OSR2 / estim / bHaptics / Owo / any device
```

---

## The Demo Use Case — Music → Haptics

**Drop a song. Feel it.**

1. Add an MP3 (or any audio file)
2. forgegen detects beats, BPM, energy, spectral content
3. Generates a funscript matched to the music
4. Export to any haptic device
5. Play the song — feel the rhythm, drops, builds

This is:
- **Completely SFW** — works for any music, any genre
- **Universal** — everyone has music they love
- **30-second demo** — drop file → generate → feel
- **No video required** — pure audio-to-haptics path
- **Any device** — Handy, OSR2, estim, bass shakers, haptic suits

This is the door. It works for anyone with a haptic device and a music library.

---

## Why This Goes Fast

forgegen's audio pipeline is already specced:

```
MP3/WAV
  ↓
Beat & BPM detection      → pulse timing
Energy & spectral analysis → intensity envelope
Bass / transients         → impact points
Build / drop detection    → tension and release
  ↓
funscript
```

No video analysis needed. No LLM. Pure DSP.
Beat detection → funscript is a solved problem. The pipeline is deterministic and fast.

---

## Product boundary

```
forgegen       = GENERATES funscripts   (audio/video → funscript)
FunScriptForge = EDITS funscripts       (funscript → tone → shape → export)
```

forgegen never requires an existing funscript. FunScriptForge never generates from scratch.
They are independent tools with a clean handoff: forgegen's output is FunScriptForge's input.

---

## Three first-class input paths

```
Audio only        →  funscript    music, beat track, any audio file — no video needed
Video only        →  funscript    motion-driven, optical flow + keypoints
Audio + Video     →  funscript    hybrid, user controls which dominates per segment
```

Audio is not a companion to video. It is an equal first-class path.

| Input | Use Case | Pipeline |
|---|---|---|
| Audio only | Music → haptics. The SFW demo. Universal. | Pure DSP — beat, energy, spectral. Fast. No LLM needed. |
| Video only | Motion-driven generation | Optical flow, keypoints, motion segmentation |
| Audio + Video | Hybrid | Weighted blend, LLM arbitration on per-segment dominance |
| Audio + Video + Captions | Semantic haptics | Language meaning shapes the pattern |

Every path produces a funscript. Device fan-out happens in FunScriptForge at export.

---

## The Stack

```
forgegen (generation — audio/video → funscript)
    ↓ output funscript handed to
FunScriptForge (authoring — funscript → tone → shape → export)
    ↓ exported to
Device folders (Handy / OSR2 / estim-foc / estim-stereo / ...)
    ↓ published to
Distribution Hub (content discovery + delivery)
    ↓ played by
SyncPlayer (synced playback — video + audio + haptics)
```

Each tool is independent. Each does one thing well.
Together they are the complete path from any media to any haptic device.

---

## forgegen App — Input scenarios

The forgegen app handles three input scenarios. All three are first-class.

**Scenario 1: Audio only**
- Drop a music file (MP3, WAV, FLAC)
- Instant BPM + waveform displayed on load
- Style cards (same vocabulary as FunScriptForge Tone)
- [ Generate ] → funscript plotly builds in real time
- Preview: music + funscript play together, beats visible as pulses
- [ Open in FunScriptForge ] or [ Export directly ]

**Scenario 2: Video only**
- Drop a video file
- Motion analysis runs on load (background)
- Style cards + intensity slider
- [ Generate ] → funscript from motion

**Scenario 3: Audio + Video**
- Drop both
- Both heatmaps displayed on same time axis (comparable)
- Per-segment dominance: Audio / Video / Hybrid slider
- [ Generate ] → blended funscript

---

## Positioning Line

> **Turn any audio into a haptic experience.**
> Drop a song. Feel the beat.
> forgegen generates haptic content from music, video, or both.
> Any device. Any genre. Any content.
