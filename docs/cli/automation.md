# Pipeline Integration & Automation

Because forgegen exposes a full CLI, it can be embedded in any automated content pipeline — no UI required.

---

## Batch processing

Generate funscripts for an entire folder of audio files:

```bash
#!/bin/bash
# batch-generate.sh
INPUT_DIR="media"
OUTPUT_DIR="funscripts"

mkdir -p "$OUTPUT_DIR"

for f in "$INPUT_DIR"/*.mp3 "$INPUT_DIR"/*.wav "$INPUT_DIR"/*.flac; do
    [ -f "$f" ] || continue
    stem=$(basename "$f" | sed 's/\.[^.]*$//')
    echo "Generating: $stem"
    videoflow generate-funscript "$f" \
        --source percussive \
        --low 10 --high 90 \
        -o "$OUTPUT_DIR/$stem.funscript"
done

echo "Done. $(ls "$OUTPUT_DIR"/*.funscript | wc -l) funscripts generated."
```

---

## Watch-folder pipeline

Watch an input folder and auto-generate whenever a new file appears.

Requires `inotifywait` (Linux) or `watchmedo` (cross-platform via `watchdog`):

```bash
# Install watchdog
pip install watchdog

# Watch and generate
watchmedo shell-command \
    --patterns="*.mp3;*.wav;*.flac;*.mp4" \
    --recursive \
    --command='videoflow generate-funscript "${watch_src_path}" -o funscripts/"${watch_file_stem}.funscript"' \
    media/
```

On Windows, use a scheduled task or PowerShell FileSystemWatcher:

```powershell
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = "C:\media"
$watcher.Filter = "*.mp3"
$watcher.EnableRaisingEvents = $true

Register-ObjectEvent $watcher Created -Action {
    $file = $Event.SourceEventArgs.FullPath
    $stem = [System.IO.Path]::GetFileNameWithoutExtension($file)
    & videoflow generate-funscript $file -o "C:\funscripts\$stem.funscript"
}
```

---

## Multi-style generation

Generate multiple style variants from a single analysis pass. Analysing beats is the slow step — save the beat map once, generate all variants from it:

```python
from videoflow.audio import analyze_beats
from videoflow.generate import generate_from_beats

STYLES = {
    "rhythmic": dict(low=10, high=90),
    "sensual":  dict(low=20, high=75),
    "intense":  dict(low=5,  high=95),
    "chaotic":  dict(low=10, high=90),
}

beat_map = analyze_beats("track.mp3", source="percussive")

for name, params in STYLES.items():
    out = f"output/track.{name}.funscript"
    generate_from_beats(beat_map, out, **params, title=f"track ({name})")
    print(f"  → {out}")
```

---

## CI/CD integration

Add funscript generation to a GitHub Actions or similar CI workflow. This pattern auto-generates funscripts for every new media file committed to a content repository:

```yaml
# .github/workflows/generate-funscripts.yml
name: Generate Funscripts

on:
  push:
    paths:
      - "media/**"

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Generate funscripts
        run: |
          mkdir -p funscripts
          for f in media/*.mp3 media/*.wav; do
            [ -f "$f" ] || continue
            stem=$(basename "$f" | sed 's/\.[^.]*$//')
            videoflow generate-funscript "$f" -o "funscripts/$stem.funscript"
          done

      - name: Commit generated funscripts
        run: |
          git config user.name "forgegen-bot"
          git config user.email "bot@liquidreleasing.com"
          git add funscripts/
          git diff --cached --quiet || git commit -m "chore: auto-generate funscripts"
          git push
```

---

## Quality checks in the pipeline

Because funscripts are plain JSON, you can add validation steps to your pipeline:

```python
import json
from pathlib import Path

def validate_funscript(path: str) -> bool:
    data = json.loads(Path(path).read_text())
    actions = data.get("actions", [])
    if len(actions) < 10:
        print(f"  WARNING: only {len(actions)} actions — may be too sparse")
        return False
    timestamps = [a["at"] for a in actions]
    if timestamps != sorted(timestamps):
        print("  ERROR: actions not sorted by timestamp")
        return False
    positions = [a["pos"] for a in actions]
    if any(p < 0 or p > 100 for p in positions):
        print("  ERROR: positions out of range")
        return False
    return True
```

forgegen's own export step already validates and sorts actions — this is an example of adding custom quality gates in a downstream step.

---

## Headless operation

forgegen requires no display for automation. The Tauri UI is optional; the library and CLI run headless on any machine:

- Remote Linux server (no display needed)
- NAS or home server
- Cloud VM (for SFW content — see [privacy considerations](../reference/formats.md))
- Docker container

```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y ffmpeg libsndfile1
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
ENTRYPOINT ["videoflow", "generate-funscript"]
```
