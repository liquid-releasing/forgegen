# Long-form scaling: auto-chunking + chapter intent

> Currently planned for **v0.5** (see [ROADMAP.md](ROADMAP.md)). Version subject to change; this document describes the architecture independent of when it ships.

## Problem

forgegen v0.1's audio path tips over on long media. The exact threshold is unknown but the failure mode is consistent: at some duration the analysis stalls, runs out of memory, or returns a degraded result. This is most likely the librosa tempogram cliff (memory grows with track length); the WAV temp file and the in-memory `y` PCM buffer are also suspects.

Today the user has no good signal that the file is too long until something breaks. That's not acceptable for a "drop a song, feel the beat" promise — multi-hour audio sets, feature-length video, full-album mixes are exactly the content people want to script.

## Goal

forgegen handles arbitrarily long media. Multi-hour audio and feature-length video do not crash, run out of memory, or stall the UI. Long files complete with a per-chapter progress bar instead of one opaque wait.

## Design overview

Chunk processing along **natural boundaries** — never mid-phrase, never on a silly time grid. When a file has chapters, use them. When it doesn't, generate them by detecting scenes / silences and grouping the result to a target chunk duration (~5–6 minutes).

Three layers, all in `videoflow`:

1. **`videoflow.structural.auto_chapter(media, target_minutes=5.5) -> list[Chapter]`** — synthesizes a Chapter list when `videoflow.chapters.load_chapters()` returns None. Reusable across every lqr tool that takes long media.
2. **Chapter-aware analysis path** — `analyze_beats()` (and downstream) accept a `chapters` arg and process one chunk at a time, holding only one chunk's tempogram in memory.
3. **Stitching** — per-chunk `AudioBeatMap`s merge into a single timeline. Tempo + energy preserved per-chunk so chapter intent (the original v0.5 idea) has signal to bias on.

forgegen's surface change is small: a per-chapter progress bar in the Generate panel, no new user-facing controls in v1. Auto-chunking happens transparently; users can override later if needed.

## Sub-features

### `videoflow.structural` (new module)

- `auto_chapter(media, target_minutes=5.5, min_minutes=2.0, max_minutes=10.0) -> list[Chapter]`
- Video files: groups `videoflow.analysis.detect_scenes` (PySceneDetect) output. Coalesce adjacent scenes until target duration reached; never split a scene in half.
- Audio files: combines silence detection + structural segmentation (`librosa.segment.recurrence_matrix` / `agglomerative`). Coalesce similar segments to target.
- Returns `Chapter` objects compatible with the existing `videoflow.chapters` resolver — same downstream code consumes either source.

### Chapter-aware analysis

- `analyze_beats(media, chapters=None)`: when chapters provided, runs librosa per-chunk
- `progress_callback` already supports staged feedback (per the v0.0.4 audio work) — extend to emit per-chapter events
- Per-chunk results stitched, with chunk boundaries preserved as metadata for chapter intent

### Stitching strategy (decision: defer or commit)

Two open paths:

- **Concatenate, drop overlap** — simpler, may produce a beat discontinuity at the seam
- **Crossfade beats across the seam** — cleaner output, more code

Pick later. Concatenation is the v1 default; crossfade is a polish item if seams audibly degrade output.

### forgegen UI

- Generate panel shows "Chapter 2 of 7 — analyzing beats" instead of one opaque progress
- No new controls; auto-chunking is invisible by default
- Comparison strips and energy chart already render per-window; should compose with chapters automatically

## What this enables

- The original v0.5 idea (chapter intent — different generation behavior per chapter) becomes meaningful, because every long file now HAS chapters
- v0.3 video work becomes tractable on feature-length content (which is most adult video)
- v0.4 hybrid blending can use chapters to switch dominance per section ("quiet music chapter → use video here")

## Reusability

Lives in `videoflow.structural`, not forgegen. Consumers:

- **forgegen** — the immediate driver; unblocks long audio
- **forgeplayer** — chapter nav already exists; auto-chapters give it material when source has none
- **forgeassembler** — could use auto-chapters to suggest cut points
- **funscriptforge** — chapter nav in editor, same logic
- Future tools — any long-media pipeline benefits

This is why this work isn't in forgegen's repo. forgegen consumes the videoflow primitive; videoflow ships the implementation.

## Open questions

1. **Where does the cliff actually live?** Need a quick reproducer (30 / 60 / 90 / 120 min synthetic audio) to map the failure curve. Changes design: a 90-min cliff means 5 min chunks are massive overkill; a 20-min cliff means 5 min is exactly right.
2. **Audio-only scene detection — what's the right algorithm?** `librosa.segment.recurrence_matrix` is the obvious starting point but tuning the similarity threshold for music vs. spoken vs. ambient material is real work.
3. **Should auto-chapters be cached?** A `<stem>.chapters.json` sidecar would let scene detection run once per file. Fits the existing chapter-resolver priority order.
4. **User override** — when the user wants different chunk boundaries (e.g. for a specific album where chapters should match track listing), is that v0.5 scope or deferred?
5. **Stitching seam quality** — measure before deciding crossfade vs. concat.

## Cross-references

- `videoflow.chapters` docstring already reserves `videoflow.structural` for this work ("Auto-detection is v0.0.5+ scope")
- forgegen ROADMAP.md v0.5 entry — short summary + link here
- `videoflow/src/videoflow/analysis.py` — existing scene detection (PySceneDetect wrapper) is the building block for video files
