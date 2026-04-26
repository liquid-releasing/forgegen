# forgegen — Value Proposition

## What is it?

forgegen converts media into haptic scripts.

Drop in an audio track or video file. forgegen analyzes the rhythm, energy, and motion, then generates a `.funscript` file that drives any haptic device in sync with that media.

No scripting knowledge required. No manual keyframes. No hours of tedious work.

---

## Why does it exist?

Creating a funscript today means one of three things:

1. **Manual editing** — Open a timeline tool (OpenFunscripter), scrub through the video frame by frame, and place every keyframe by hand. A 10-minute video takes 2–8 hours for an experienced scripter.

2. **Bad automation** — Use PythonDancer or FunscriptFlow and get a mechanical, rigid output that locks to a beat grid without feel. These scripts technically work but don't feel intentional.

3. **VR-only AI tools** — Use FunGen for AI-assisted generation, but only if your content is POV VR video. No music. No live action. No estim.

**The gap:** No tool exists that generates quality funscripts from arbitrary audio or video, handles the estim community's workflow, and integrates cleanly with editing tools.

forgegen is that tool.

---

## Who is it for?

### Primary: Content scripters

Creators who produce funscripts for an audience — posting to EroScripts, selling on Patreon, scripting for video libraries. They produce 2–10 scripts per week. Their bottleneck is time. forgegen gives them a quality starting point in 30 seconds instead of 2 hours.

### Secondary: Music and EDM creators

Artists and fans who want haptic tracks synced to music — club nights, VR experiences, haptic-enabled music videos. No video required. Drop a song, feel the beat. forgegen handles the full music-to-haptics pipeline.

### Secondary: Estim creators and users

The electrostimulation community has unique workflows: stereo audio channels drive two independent stim channels. No mainstream tool handles this. forgegen's estim path treats stereo stim audio as a first-class input, not an afterthought.

### Adjacent: FunScriptForge users who want a starting point

FunScriptForge users are expert editors who polish and refine scripts. Many want a generated draft to start from — not because the generation is perfect, but because starting from something is faster than starting from nothing. forgegen feeds FunScriptForge with a clean, editable draft.

---

## What value does it create?

| Before forgegen | After forgegen |
| --- | --- |
| 2–8 hours to script a 10-minute video | 30-second draft, then polish in FunScriptForge |
| PythonDancer: mechanical beat-locked output | Mode-aware shaping: tease builds, drops hit, slow sections breathe |
| FunGen: VR-only, closed architecture | Any video, any audio, open format |
| Estim workflow: manual Audacity + Python scripts | Native stereo estim path, single UI |
| Fragmented tools that don't talk to each other | forgegen → FunScriptForge → any device, one pipeline |

---

## What makes it different?

**Mode-aware shaping.** forgegen doesn't just map beats to positions. It classifies each phrase — break, tease, slow, steady, fast, edging — and shapes the curve accordingly. A tease phrase has narrow amplitude and restrained peaks. An edging phrase builds progressively from 50% to full range. A drop hits at maximum energy. The result feels written, not generated.

**Library-first architecture.** The generation engine (`videoflow.generate`) is a standalone Python library. The Streamlit UI is ~300 lines because all logic lives in the library. This means forgegen can be embedded in FunScriptForge, run headless in a batch pipeline, or called from any Python script.

**Audio-only is a complete product.** No video required, no GPU required, no cloud API required. forgegen ships a working product today on the audio path while the video pipeline matures.

**CLI-first means pipeline-ready.** Every generation operation is available as a CLI command. forgegen can run headless, be scripted in a watch folder, integrated into CI, or called from any shell. The UI is a convenience layer on top of a fully automatable tool.

**Designed to hand off, not to lock in.** forgegen outputs a standard `.funscript` file. Users take that file into FunScriptForge, OpenFunscripter, or any compatible player. No proprietary format, no lock-in.

---

## Where it fits in the full pipeline

```
Media                  forgegen               FunScriptForge         Device
──────                 ────────               ──────────────         ──────
Audio / Music    →     Generate draft    →    Refine & shape    →    Handy / OSR2
Video / Film           funscript              Tone & trim            Estim
Estim audio                                   Export per-device      bHaptics
```

forgegen never edits funscripts. FunScriptForge never generates from scratch. They are independent tools with a clean handoff at the `.funscript` boundary.

---

## Automation and pipeline integration

forgegen ships a full CLI alongside the UI. Because every operation is a command, forgegen can be embedded in any automated workflow — not just used interactively.

### What this enables

**Watch-folder pipelines.** A content studio drops new audio or video files into an input folder. A shell script or task scheduler calls `videoflow generate-funscript` on each file and deposits the `.funscript` output alongside it. No human in the loop.

**CI/CD for haptic content.** Studios managing large libraries can run forgegen in a CI pipeline: new media committed → funscript auto-generated → posted to a review queue in FunScriptForge. The same pipeline that builds software can build haptic content.

**Batch processing.** Generate funscripts for an entire back-catalog overnight. Regenerate with updated shaping parameters without touching a UI.

**Chained tooling.** Because the CLI outputs a plain `.funscript` file, any downstream tool can consume it — FunScriptForge, SyncPlayer, custom validators, quality-scoring scripts, upload bots.

**Headless servers.** No display required. Run forgegen on a remote machine, a NAS, or a cloud VM (for SFW content). The UI is optional; the library and CLI are the product.

### CLI surface

```bash
# Generate from an audio file
videoflow generate-funscript track.mp3 -o output/track.funscript

# Use percussive stem separation, custom range
videoflow generate-funscript track.mp3 --source percussive --low 10 --high 90

# Generate from a saved beat map (skip re-analysis)
videoflow generate-funscript track.beatmap.json -o output/track.funscript

# Batch example (shell)
for f in media/*.mp3; do
    videoflow generate-funscript "$f" -o funscripts/"$(basename "$f" .mp3).funscript"
done
```

The library is also directly importable for deeper integration:

```python
from videoflow.audio import analyze_beats
from videoflow.generate import generate_from_beats

beat_map = analyze_beats("track.mp3", source="percussive")
generate_from_beats(beat_map, "output/track.funscript", low=10, high=90)
```

---

## What it is not

- **Not a funscript editor.** That is FunScriptForge's job.
- **Not a video editor.** Video assembly and rendering belong in a separate workflow.
- **Not a cloud service.** Local-first. Your media never leaves your machine. No subscriptions required for core functionality.
- **Not a device player.** Use SyncPlayer, Intiface, or the Handy app for playback.
