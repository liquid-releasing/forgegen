# forgegen → FunscriptForge handoff

> The "Open in FunscriptForge" v0.1 milestone in [ROADMAP.md](../../architecture/ROADMAP.md)
> resolved by piggybacking on the canonical analysis sidecar rather than
> defining a new IPC. This doc records the decision and scopes the phases.

## Decision (2026-04-29)

The handoff vehicle is the canonical **`<stem>.analysis.json`** sidecar
(see [`analysis-schema.md`](analysis-schema.md)). forgegen writes it next to
the funscript on save. FunscriptForge reads it on funscript load.

No new protocol, no IPC, no URL handler, no shared temp folder — just
*the sidecar that was already specced for cross-app data sharing*. The
"Open in FunscriptForge" UX is at most a launch button (subprocess) and is
not on the v0.1 critical path; users opening a funscript directly in FF
get the chapter handoff for free.

### Why analysis.json

- **Already specced.** v1.0 schema, versioning rules, and consumer matrix
  are written ([`analysis-schema.md`](analysis-schema.md)).
- **Canonical-emit aligned.** Per [`canonical-emit-pattern.md`](canonical-emit-pattern.md),
  every analysis-derived value should live in one canonical artifact rather
  than being re-derived per tool. Adding a separate handoff format would
  fork that pattern.
- **Composable.** FunscriptForge becomes one consumer among many; ForgePlayer,
  forgevents, FF Pro inherit the same handoff mechanism without further design.
- **Forward-compatible.** v0.1 only ships chapters; later phases add
  audio_features, structural.phrases, event_proposals — all backwards-compatible
  per the schema's versioning rules.

## Phased rollout

### Phase 1 — v0.1 chapters only (this milestone)

forgegen emits a **minimal** analysis.json with just enough to carry chapter
information. FunscriptForge reads it; FF's existing `_*.json` cache files
(`_beats.json`, `_assessment.json`, etc.) are **untouched**.

forgegen writes:

```jsonc
{
  "version": "1.0",
  "generated_by": {
    "tool": "forgegen",
    "tool_version": "<from package>",
    "videoflow_version": "<from package>",
    "generated_at": "<ISO 8601 UTC>"
  },
  "source": {
    "audio_path": "<input file name>",
    "duration_ms": <int>,
    "audio_sample_rate": <Hz>,
    "audio_md5": "<hex>"
  },
  "structural": {
    "chapter_proposals": [
      { "start_ms": ..., "end_ms": ..., "intent_proposal": "...",
        "confidence": 1.0, "evidence": ["embedded_mp4"] }
    ]
  }
}
```

Other top-level sections (`audio_features`, `video_features`,
`event_proposals`, `generation_choices`) are **omitted** in Phase 1.
Per the schema's versioning rules, missing optional sections are valid.

#### Chapter sources for v0.1

Per [`chapter-composition.md`](chapter-composition.md) and the chapter
resolver locked 2026-04-27, forgegen reads chapters from:

1. **Embedded mp4 chapters** — `videoflow.chapters.load_chapters()` calls
   `ffprobe -show_chapters` on video sources. Authored by external tools.
2. **`<stem>.chapters.json` sidecar** — already supported as input by
   `videoflow.chapters.read_sidecar_chapters()`.

Audio auto-detection is **out of scope for v0.1**. It lives in
`videoflow.structural` and is v0.5 per [`LONG_FORM_SCALING.md`](../../architecture/LONG_FORM_SCALING.md).
For audio-only sources without authored chapters, forgegen emits
`structural.chapter_proposals: []` (empty) — FF treats this the same as
"no chapters discovered."

#### Where the writer lives

The funscript-export path in the Tauri bridge (`tauri/src-tauri/src/commands.rs`)
has two branches:

- **`Save to folder`** (line ~625) — writes `<stem>.funscript` to the user's
  output dir. Add: `<stem>.analysis.json` adjacent.
- **Save/copy actions** — Tauri native file operations. Browser download is not the primary desktop path.
  a sidecar through `download_button`. **Phase 1 caveat:** browser download
  carries the funscript only; users who download (rather than save) lose the
  analysis.json. Acceptable trade-off for v0.1.

Optional future enhancement: ship a `.zip` with both files for the download
path. Or embed analysis into `funscript.metadata.analysis` per the schema's
"Optional embed" section. Not v0.1.

### Phase 2 — additive sections in analysis.json

Once Phase 1 is in production, expand what forgegen writes:

- `audio_features` — bpm, beats, phrases, energy. forgegen already computes
  these for generation; persisting them lets downstream tools (FF, ForgePlayer,
  forgevents) skip recomputation.
- `structural.phrases` — phrase-mode labels.
- `generation_choices` — what forgegen decided when producing the curve.

Each addition is backwards-compatible (no schema bump). FF reads what it
recognizes, ignores what it doesn't.

### Phase 3 — FF migrates its caches

FunscriptForge's `_beats.json`, `_assessment.json`, `_video_motion.json`,
etc. fold into the canonical `analysis.json`:

- FF stops writing scattered `_*.json`; reads/writes the canonical schema instead.
- FF's `assessment` and `phrases` populate `structural.phrases`.
- FF's `_beats.json` matches `audio_features.beats`.

Round-trip: forgegen → FF analysis.json works both ways.

This is a real migration, not a v0.1 task. Decide when after Phase 2 ships
and we have a sense of where field shapes need divergence vs. convergence.

## Open questions deferred past v0.1

1. **Launch mechanism for the "Open in FunscriptForge" button.** Phase 1
   does not require a button — funscript+sidecar in the same dir is enough
   for FF to pick up when the user opens the funscript through FF's normal
   UI. Subprocess invocation (`funscriptforge --open <funscript>`) can be
   added trivially in a later phase.
2. **`.forge/` bundle vs. flat sidecar layout.** Both are valid per
   `analysis-schema.md`. v0.1 emits flat sidecars next to the source; the
   `.forge/` layout is a bundle convenience for forge-family tools and can
   be added later without schema change.
3. **`source.audio_md5` performance.** Hashing a long audio file is non-trivial.
   v0.1 may opt to compute the md5 over the first + last 1MB rather than the
   full file. Decision deferred to implementation time.

## Cross-references

- **Canonical schema:** [`analysis-schema.md`](analysis-schema.md)
- **Cross-app principle:** [`canonical-emit-pattern.md`](canonical-emit-pattern.md)
- **Chapter resolver priority:** [`chapter-composition.md`](chapter-composition.md)
- **Roadmap entry:** [`../../architecture/ROADMAP.md`](../../architecture/ROADMAP.md), v0.1 — "Open in FunscriptForge" handoff
- **FunscriptForge side:** `funscriptforge/docs/architecture/ARCHITECTURE_forgegen_handoff.md`

## Implementation checklist (v0.1)

- [ ] Confirm `videoflow` is on forgegen's import path (add to requirements if not)
- [ ] In the Tauri generate path: call `videoflow.chapters.load_chapters(source)`, build minimal analysis.json dict, write next to funscript
- [ ] Map `videoflow.chapters.Chapter` → `structural.chapter_proposals[]` shape (per schema: `start_ms`, `end_ms`, `intent_proposal`, `confidence`, `evidence`)
- [ ] Compute `source.audio_md5` (decide partial-vs-full hashing)
- [ ] Test: video with embedded chapters → sidecar contains them
- [ ] Test: audio with `<stem>.chapters.json` sidecar → contents propagate
- [ ] Test: audio with no chapters → `chapter_proposals: []`
- [ ] Update ROADMAP.md to check off the v0.1 handoff item once shipped
