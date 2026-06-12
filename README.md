# forgegen

**Audio to funscript — in seconds, not hours.**

forgegen is a haptic content generation engine. Drop in a music track. It
analyses the rhythm, phrase structure, and energy envelope, then outputs a
`.funscript` ready to drive any haptic device.

A better, free alternative to PythonDancer for audio-driven funscript
generation: phrase-level mode shaping (tease / edging / break / chaotic
profiles), offline, MIT-licensed, with a clean handoff to FunscriptForge for
editing.

> **Status:** v0.2.0-mvp2 — second MVP cut on the Tauri+React rewrite.
> Live per-stage progress (Extract / Load / Detect / Beats / Phrases /
> Sidecar) lights up dot-by-dot during auto-chapter and Generate runs,
> with ffmpeg sub-stage timecodes during long extracts. Pick file →
> analyse → review chapters/phrases → author per-chapter recipes with
> target preset → generate funscript. Tauri + React is the only supported
> desktop UI in this repo. See
> [REFACTOR_TO_TAURI_REACT.md](REFACTOR_TO_TAURI_REACT.md) and
> [BRIDGE_DESIGN.md](BRIDGE_DESIGN.md) for the new architecture.

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

> **forgegen reads the structure of the audio and generates against that structure — not against an undifferentiated stream.**

A 90-minute video opens with ambient pacing, builds through tension, peaks, and cools down. Whole-file analysis flattens that — the loud climax dominates the energy distribution, the quiet sections get crushed, and the resulting funscript is either music-only-good or motionless on long-form material. forgegen detects the natural sections of the audio first, then runs the analysis once per section, so each section's pacing is preserved in the output.

```text
Audio → Audio structure → Per-section beat & energy → Per-section classification → Curve shaping → .funscript
```

1. **Structure** — detect natural sections from silence, recurrence, and energy transitions (typically chapters of around 5–6 minutes). Written to a small `<stem>.chapters.json` sidecar so other lqr tools see the same sections.
2. **Analyse** — detect beat grid, BPM, phrase boundaries, and energy envelope per chapter; energy normalises within each section's own range so a quiet ambient passage isn't drowned out by a loud climax elsewhere in the file.
3. **Classify** — label each phrase relative to its chapter's distribution: `break`, `tease`, `slow`, `steady`, `fast`, or `edging`. A phrase that's average for its quiet ambient chapter classifies as `steady` — not crushed to `break` because its absolute energy is low.
4. **Shape** — sculpt the motion curve per mode (tease = narrow, edging = builds 50→100%, break = minimal).
5. **Export** — validated `.funscript` JSON, compatible with every major player and editor.

The chapter sidecar is shared across the lqr toolchain. ForgePlayer uses it for navigation on videos that have no built-in chapter markers; ForgeAssembler uses it as suggested cut points; FunscriptForge overlays it as a second ruler-track in the editor. Refining chapters in one tool flows through to the others — forgegen picks them up automatically on the next run.

---

## Stack

```text
forgegen          (this repo — Tauri + React desktop UI)
  └── videoflow   (generation engine — beats, classification, curve shaping, funscript export)
        └── librosa / FFmpeg
```

---

## Quick start

```bash
# Clone alongside videoflow
git clone https://github.com/liquid-releasing/forgegen.git
git clone https://github.com/liquid-releasing/videoflow.git

cd forgegen/tauri
npm install
npm run tauri:dev
```

Open the launched desktop window. Pick an audio/video file, review analysis,
choose sources and recipes, then generate.

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
