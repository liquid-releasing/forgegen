# Analysis output

When you click **Analyse**, forgegen runs a multi-stage pipeline that builds a layered understanding of your media. The visible result is a `.funscript` — but the **full** analysis is preserved in a companion `<stem>.analysis.json` sidecar so downstream tools don't have to re-derive any of it.

This page explains what forgegen considers and what it writes.

---

## What forgegen analyses

### Layer 1 — audio features

- **Beat grid** — every beat detected by `librosa`'s `beat_track` (fast, deterministic) or `plp` (predominant local pulse — robust on long or genre-bending tracks). The detector is auto-selected based on track length.
- **BPM** — derived from the beat grid.
- **Downbeats** — every 4th beat (v0.1 assumes 4/4 time).
- **Per-beat energy** — RMS energy at each beat, normalised 0–1. Peaks tend to land on kicks and snares.
- **Phrases** — every 16 beats grouped into one phrase (4 bars × 4/4). The unit forgegen uses for mode classification.

### Layer 2 — structural inferences

- **Phrase mode** — each phrase is auto-classified as one of `break`, `tease`, `slow`, `steady`, `fast`, or `edging` based on energy profile and BPM context. See [Phrase Modes](modes.md).
- **Energy trend per phrase** — rising, falling, flat, or arc-shaped.
- **Chapters** — read from:
    1. Embedded mp4 chapters (via `ffprobe -show_chapters`)
    2. A `<stem>.chapters.json` sidecar next to the source

    Audio auto-detection from silences/structural similarity is v0.5 scope and not done in v0.1. If neither source has chapters, the chapter list is simply empty.

### Layer 4 — generation decisions

When you pick a style and click **Generate**, forgegen records the choices it made:

- **Style** — Rhythmic / Sensual / Intense / Chaotic (sets `low`, `high`, beat source)
- **Stroke density** — 1, 2, 4, or 8 strokes per beat
- **Tone trajectory** — flat / rise / fall / auto
- **Energy normalization** — the 95th-percentile energy used to scale peak amplitude consistently across tracks

> **Layer 3 (event proposals)** — auto-detected accents, edge holds, climax candidates — is v0.5+ scope. v0.1 emits an empty proposal list.

---

## What gets exported

### `<stem>.funscript`

Standard funscript JSON. Just the curve — `actions: [{at, pos}, ...]`. Nothing forge-specific.

### `<stem>.analysis.json` (companion)

Written next to the funscript when you click **Save to folder** (browser download path is funscript-only). Minimal in v0.1:

```jsonc
{
  "version": "1.0",
  "generated_by": {
    "tool": "forgegen",
    "tool_version": "0.1.0-alpha",
    "videoflow_version": "0.0.5-alpha",
    "generated_at": "2026-04-29T19:25:02Z"
  },
  "source": {
    "audio_path": "track.mp4",
    "duration_ms": 279777,
    "audio_md5": "8072d2881c179a94b4cef99ba3b834e1"
  },
  "structural": {
    "chapter_proposals": [
      // empty when source has no embedded chapters and no .chapters.json sidecar
    ]
  }
}
```

The `audio_md5` is a partial hash (first + last 1MB) — sufficient for downstream cache invalidation, cheap on long files.

#### What's coming in future versions

The schema is forward-compatible. Later releases will additively populate:

- `audio_features` — bpm, beats, energy, phrases (so FunScriptForge skips re-analysis)
- `video_features` — scene changes, motion energy (when video path lands in v0.3)
- `event_proposals` — accents, edge holds, climax candidates (v0.5+ when forgevents arrives)
- `generation_choices` — exactly which style/density/tone produced this curve

Tools that read v1.0 today keep working: missing optional sections are simply ignored.

The full schema lives in [analysis-schema.md](../architecture/analysis-schema.md).

---

## Why the sidecar exists

The principle is **canonical-emit** — every analysis-derived value lives in one place and every downstream tool reads it instead of recomputing.

What that buys you in practice:

- **FunScriptForge** opens a funscript and finds the same chapters forgegen used — no re-analysis pass.
- **ForgePlayer** can show those chapters as visual markers during playback.
- **forgevents** (planned) consumes auto-detected event proposals as starting candidates for human curation.
- **Future ML** uses paired `<funscript, analysis.json>` as labeled training data.

See [canonical-emit-pattern.md](../architecture/canonical-emit-pattern.md) for the full architectural rationale and how it applies across the forge tool family.
