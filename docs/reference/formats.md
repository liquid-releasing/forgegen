# Supported Formats

---

## Input formats

### Audio

| Format | Extension | Notes |
| --- | --- | --- |
| MP3 | `.mp3` | Most common; all bitrates supported |
| WAV | `.wav` | Lossless; fastest analysis |
| FLAC | `.flac` | Lossless compressed |
| OGG Vorbis | `.ogg` | |
| M4A / AAC | `.m4a`, `.aac` | |

### Video

| Format | Extension | Notes |
| --- | --- | --- |
| MP4 | `.mp4` | H.264, H.265 |
| Matroska | `.mkv` | Any codec |
| QuickTime | `.mov` | |

When you load a video file, forgegen extracts the audio track automatically using FFmpeg. The video frames are not analysed in this version — the funscript is driven by the audio track only.

---

## Output format

forgegen exports standard `.funscript` JSON — the same format used by OpenFunscripter, FunScriptForge, SyncPlayer, and all major haptic players.

### File structure

```json
{
  "version": "1.0",
  "inverted": false,
  "range": 90,
  "actions": [
    { "at": 0, "pos": 10 },
    { "at": 500, "pos": 73 },
    { "at": 1000, "pos": 10 },
    ...
  ]
}
```

| Field | Description |
| --- | --- |
| `version` | Always `"1.0"` |
| `inverted` | Always `false` — standard orientation |
| `range` | Device range hint — always `90` |
| `actions` | Array of `{at, pos}` keyframes |
| `at` | Timestamp in milliseconds |
| `pos` | Position 0–100 (0 = bottom, 100 = top) |

### Constraints

- Actions are sorted by timestamp
- Duplicate timestamps are removed (last value wins)
- Positions are clamped to 0–100
- A minimum of 2 actions is required; forgegen raises an error if the curve is empty

---

## Compatibility

The output `.funscript` file is compatible with:

- **FunScriptForge** — recommended next step for refining the draft
- **OpenFunscripter** — open for manual editing
- **SyncPlayer** — direct playback with a connected device
- **Intiface Central** — device bridge for Handy, OSR2, and others
- **Handy app** — direct upload to The Handy
- **MultiFunPlayer** — multi-axis funscript player
