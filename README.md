# forgegen

**Audio to funscript — in seconds, not hours.**

forgegen is a haptic content generation engine. Drop in a music track. It
analyses the rhythm, phrase structure, and energy envelope, then outputs a
`.funscript` ready to drive any haptic device.

A better, free alternative to PythonDancer for audio-driven funscript
generation: phrase-level mode shaping (tease / edging / break / chaotic
profiles), offline, MIT-licensed, with a clean handoff to FunscriptForge for
editing.

> **Status:** v0.0.4-alpha ships the engine + UI overhaul. Comparison-strip
> previews show every Style / Stroke-density / Tone option as a velocity-
> coloured curve thumbnail with synced ◀▶ scroll + 5-step zoom ladder
> (4s → 16s → 1m → 3m → 10m). Stats sidebar surfaces the same metrics
> FunscriptForge uses (mean pos, range, avg vel, p90 vel, peak vel) so a
> generated curve is comparable to gold-standard reference tracks at a
> glance. PLP-based stable beat tracking, locked-BPM mode, sub-beat
> density (1/2/4/8 actions per beat), per-phrase auto-tone, and shared
> `videoflow.events` + `videoflow.chapters` infrastructure for v0.0.5
> chapter intent. The video-input path is on the roadmap — see
> [Architecture](architecture/ARCHITECTURE.md).

---

## Who is this for?

- **Content scripters** — get a quality draft in under a minute instead of 2–8 hours of manual keyframing.
- **Music and EDM creators** — sync haptics to any track. No video or scripting tools required.
- **FunscriptForge users** — start from a generated draft; spend your time on refinement instead of ground-up creation.
- **Pipeline builders** — full CLI and importable Python library; fits into watch-folder pipelines, CI/CD, and batch workflows.

## Why it exists

The existing toolchain is fragmented:

- **OpenFunscripter** — manual-only.
- **PythonDancer** — mechanical beat-locked output with no phrase shaping. Upstream archived.
- **FunGen** — VR-only.
- **FunscriptFlow** — requires coding.

No tool generates quality funscripts from arbitrary audio with phrase-level
mode shaping, offline, with a clean handoff to an editing tool. forgegen is
that tool.

---

## How it works

```text
Audio → Beat & energy analysis → Phrase classification → Curve shaping → .funscript
```

1. **Analyse** — detect beat grid, BPM, phrase boundaries, and energy envelope.
2. **Classify** — label each phrase: `break`, `tease`, `slow`, `steady`, `fast`, or `edging`.
3. **Shape** — sculpt the motion curve per mode (tease = narrow, edging = builds 50→100%, break = minimal).
4. **Export** — validated `.funscript` JSON, compatible with every major player and editor.

---

## Stack

```text
forgegen          (this repo — Streamlit UI)
  └── videoflow   (generation engine — beats, classification, curve shaping, funscript export)
        └── librosa / FFmpeg
```

---

## Quick start

```bash
# Clone alongside videoflow
git clone https://github.com/liquid-releasing/forgegen.git
git clone https://github.com/liquid-releasing/videoflow.git

cd forgegen
pip install -r requirements.txt

streamlit run app.py
```

Open `http://localhost:8501`. Drop in an audio file. Pick a style. Generate.

### CLI (via videoflow)

```bash
# Generate a funscript from an audio file
videoflow generate-funscript track.mp3

# Full mix source, custom range
videoflow generate-funscript track.mp3 --source full --low 20 --high 75

# Batch (shell)
for f in media/*.mp3; do
    videoflow generate-funscript "$f" -o funscripts/"$(basename "$f" .mp3).funscript"
done
```

---

## Styles

| Style | Low | High | Source | Best for |
| --- | --- | --- | --- | --- |
| 🥁 Rhythmic | 10 | 90 | percussive | EDM, beat-locked |
| 🌊 Sensual | 20 | 75 | full mix | Slow, melodic |
| ⚡ Intense | 5 | 95 | percussive | Maximum range |
| 🌪 Chaotic | 10 | 90 | full mix | Complex mixes, unpredictable peaks |

---

## Where it fits

forgegen is the **generation** layer. FunscriptForge is the **editing** layer.
ForgeAssembler is the **assembly** layer.

```text
forgegen  →  .funscript  →  FunscriptForge  →  ForgeAssembler  →  player
```

forgegen never edits funscripts. FunscriptForge never generates from scratch.
Clean handoff at the `.funscript` boundary.

---

## Related projects

- **[bREadbeats](https://github.com/breadfan69-2/bREadbeats)** — real-time music→motion generator for Restim by breadfan69-2. Does live what forgegen does offline: multi-band beat detection, BPM lock, and motion generation from audio. Their v2.0 "motion intelligence" profile system (trained adaptive models) is architecturally similar to forgegen's phrase classification. Source-available license (non-commercial only) — study for inspiration, not for direct use.

---

## Docs

Full documentation: `mkdocs serve` from the repo root, or see `docs/`.

---

## License

MIT. See [LICENSE](LICENSE). © 2026 Liquid Releasing.
