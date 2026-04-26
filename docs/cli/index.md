# CLI Reference

The forgegen CLI is provided through the `videoflow` library. Every operation available in the UI is also available as a command.

---

## Installation check

```bash
python -m videoflow --help
# or
videoflow --help
```

---

## `generate-funscript`

Generate a `.funscript` from an audio file, video file, or saved beat map.

```bash
videoflow generate-funscript <input> [options]
```

### Arguments

| Argument | Description |
| --- | --- |
| `input` | Path to an audio file, video file, or `.json` beat map |

### Options

| Option | Default | Description |
| --- | --- | --- |
| `-o`, `--output` | `<input-stem>.funscript` | Output path for the `.funscript` file |
| `--source` | `percussive` | Beat source: `percussive` or `full` |
| `--low` | `10` | Trough position (0–40) |
| `--high` | `90` | Peak ceiling (60–100) |
| `--title` | `""` | Title written into the funscript metadata |

### Examples

**Basic — generate from MP3:**
```bash
videoflow generate-funscript track.mp3
# Output: track.funscript
```

**Specify output path:**
```bash
videoflow generate-funscript track.mp3 -o output/track.funscript
```

**Use full mix source with custom range:**
```bash
videoflow generate-funscript track.mp3 --source full --low 20 --high 75
```

**Generate from a video file (audio is extracted automatically):**
```bash
videoflow generate-funscript video.mp4 -o video.funscript
```

**Generate from a saved beat map (skips re-analysis):**
```bash
videoflow generate-funscript track.beatmap.json -o track.funscript
```

---

## `analyze-beats`

Analyse a media file and save the beat map to JSON. Useful when you want to analyse once and generate multiple funscripts with different parameters.

```bash
videoflow analyze-beats <input> [options]
```

### Options

| Option | Default | Description |
| --- | --- | --- |
| `-o`, `--output` | `<input-stem>.beatmap.json` | Output path for the beat map JSON |
| `--source` | `percussive` | Beat source: `percussive` or `full` |

### Example

```bash
# Analyse once
videoflow analyze-beats track.mp3 -o track.beatmap.json

# Generate multiple styles from the same analysis
videoflow generate-funscript track.beatmap.json --low 10 --high 90 -o track.rhythmic.funscript
videoflow generate-funscript track.beatmap.json --low 20 --high 75 -o track.sensual.funscript
videoflow generate-funscript track.beatmap.json --low 5  --high 95 -o track.intense.funscript
```

---

## Python library

All CLI commands wrap the `videoflow` Python library. For programmatic use:

```python
from videoflow.audio import analyze_beats
from videoflow.generate import generate_from_beats, beats_to_curve, classify_modes, shape_curve

# Full pipeline in one call
beat_map = analyze_beats("track.mp3", source="percussive")
generate_from_beats(beat_map, "track.funscript", low=10, high=90, title="My Track")

# Step-by-step for custom control
beat_map = analyze_beats("track.mp3", source="full")
curve    = beats_to_curve(beat_map, low=20, high=75)
modes    = classify_modes(beat_map)
shaped   = shape_curve(curve, modes, low=20)
# ... inspect or modify shaped here ...
from videoflow.generate import export_funscript
export_funscript(shaped, "track.funscript", title="My Track")
```
