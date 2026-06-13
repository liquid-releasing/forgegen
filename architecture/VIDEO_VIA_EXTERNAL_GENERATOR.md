# Video funscript generation via external generators (Funscript-Flow)

> **Status:** architecture decision note (2026-06-05). The strategy for
> bringing **video** into forgegen's generation mix. Lead with this when
> someone asks "why aren't we building the video1-9 pipeline?" or "how
> does video relate to the audio influence mix?"
>
> Canonical copy. Licensing/strategy companion (private):
> `.forgegen-internal/architecture/funscript-flow.md`.

Reference: **Funscript-Flow** — https://github.com/Funscript-Flow/Funscript-Flow
(computer-vision, auto-generates funscripts synced to any 2D/non-VR video,
batch mode ~100GB/day, **Apache-2.0**). Sibling for VR/POV: **FunGen**.

---

## The decision

**Do not rebuild the video CV pipeline. Consume it.** forgegen's own
[`generation_spec/video_spec/`](../generation_spec/video_spec/) (stages
video1-9) describes the exact pipeline FF-Flow already implements —
[`algorithm.md`](../generation_spec/video_spec/algorithm.md) says so in its own
words: stage 2 is *"the heart of tools like Funscript-Flow and FunGen,"* and
*"this is the same architecture used by Funscript-Flow, FunGen, and commercial
pipelines."* So the video_spec is not an implementation roadmap — it's a **map
of what we buy vs. where we add value on top.**

### Stage ownership (forgegen video_spec stage → owner)

| Stage | Owner | Rationale |
|---|---|---|
| 1 Ingestion / preprocess | **FF-Flow** | commodity; internal to it |
| 2 Motion detection (optical flow / keypoint / bbox) | **FF-Flow** | the expensive CV core — months to rebuild for a tie |
| 3 Signal cleanup / smoothing | FF-Flow baseline → forgegen Polish | usable out, we refine |
| 4 Pattern interpretation (chapters / phrases / tone / modes) | **forgegen** ⭐ | our differentiation; FF-Flow is weak here |
| 5 Funscript generation | **FF-Flow** | emits `.funscript` directly |
| 6 Post-processing | forgegen transforms / Polish | ours |
| 7 Batch automation | FF-Flow | already there |
| 8 Human-in-the-loop refine | **FunscriptForge** ⭐ | the "six-task transformer"; video_spec places it here |

forgegen's differentiated value is the two starred rows. Everything else is
commodity CV that FF-Flow does well and Apache-licenses for free.

---

## The real abstraction: external source tracks

The integration is **not** "FF-Flow support." It's a generic notion of an
**external source track** — a funscript produced outside the audio pipeline.
A per-chapter source can be:

- **audio-synth** (forgegen's existing audio influence mix) — the default
- **FF-Flow video** (automated CV, 2D)
- **FunGen** (automated CV, VR/POV)
- **a user's own great script** (reuse part of an existing hand/AI track)
- **OpenFunscripter hand-work** or any imported `.funscript`

FF-Flow is just the first *automated* external provider. Designing for
"external source track" (not "FF-Flow") means reusing a great existing script
falls out for free as source #3 — no new architecture. The import path you build
for "my own great script" is the *same code path* that ingests FF-Flow's output.

---

## Per-chapter source selection (the first try at video)

Audio and video are **not peers as influences** — audio legs (Beat / Bass /
Voice / Ambient) are feature *envelopes*; a video CV track is a finished motion
track derived from visual reality. You can't merge them as radar vertices.
The honest first cut is a **per-chapter source switch**, which fits forgegen's
existing per-chapter authoring grain:

- Per chapter, pick the source: `audio | video | (external track) | …`.
- The audio influence-mix radar is the *sub-control* for chapters set to audio;
  when a chapter is set to video, the radar greys out and shows a CV-tracking
  quality readout instead. **Hierarchy: Source first, then the controls for
  that source.**
- **Auto-suggest, don't start blank.** Default each chapter to the
  higher-confidence source (FF-Flow tracking confidence vs. audio beat/energy
  clarity), mark it "suggested," allow override — mirroring the existing
  "Suggested" influence button.
- **Per-chapter is *correct*, not just convenient:** CV reliability varies by
  region (great on clear POV/action, noisy on cuts/multi-person/dark/abstract).
  The selector is the escape valve — route video to the chapters where it shines.
- **Seams reuse existing machinery:** a source switch at a chapter boundary is
  the same stitch as switching recipes — reuse `--blend-seams`.
- **Make the video pass opt-in:** CV is batch-heavy. Audio runs always (cheap);
  video is an "Analyze video motion" button that populates the video option.
  The user opts a project in; they don't pay the cost by default.
- **Carry provenance downstream:** stamp the chosen source per chapter into the
  sidecar so FunscriptForge knows which chapters came from video (they may want
  different refine defaults — CV tracks are jittery and want smoothing;
  audio-synth tracks are clean but generic). See FunscriptForge
  `internal/source_provenance.md`.

**Wild scheme for later (not v1):** a third per-chapter mode, *"Video timing +
Audio intensity"* — CV decides *where* strokes land, audio decides *how hard*.
That's the true hybrid; ship the clean two-way switch first.

In the `ACURVE / VCURVE / BLEND` pipeline diagram
([`generation_pipeline.md`](../generation_spec/generation_pipeline.md)), v1 makes
the BLEND layer a **selector** (pick A or B per chapter); a true weighted blend
comes later.

---

## Integration depth — start shallow

| | Shallow (consume the `.funscript`) | Deep (consume the raw motion signal) |
|---|---|---|
| FF-Flow does | stages 1-5 | stages 1-2 only |
| forgegen does | 6 + 8 | **3-4-5** + 6 + 8 |
| Result | finished track, FF-Flow's shaping *baked in* — clean it, can't re-interpret | video as a true peer signal you shape yourself; can feed the influence mix |
| Effort | lowest | needs FF-Flow to expose intermediates (vendor + modify) |
| Licensing | **Mode 1** (attribution only) | **Mode 2** (vendor + state changes) |

**Ship shallow.** It maps to the per-chapter A/B first try. Deep is the eventual
true-blend path.

---

## Licensing — MIT project + Apache-2.0 component

> **Decision (2026-06-13):** **Mode 2 — vendor the source**, and **keep forgegen
> MIT** (no Apache patent grant for our own code for now). The Apache-2.0 license
> boundary follows the vendored *folder*; our glue stays MIT. Obligations to
> honour when the source lands: keep FF-Flow's `LICENSE` + any `NOTICE` in its
> subfolder, **state significant changes** if we modify it, and list it in
> [`THIRD_PARTY_LICENSES.md`](../THIRD_PARTY_LICENSES.md) (entry added ahead of
> the vendor drop). Revisit the keep-MIT call only if we want the patent grant
> for the novel generation IP (depth law / density arc).

FF-Flow is **Apache-2.0**, which is **compatible with forgegen's MIT** — we do
**not** relicense the project. Keep forgegen MIT; carry FF-Flow under its own
terms. Two modes by integration depth:

- **Mode 1 — run as a tool, consume output (recommended first):** shell out to /
  recommend FF-Flow, ingest the `.funscript`. The output of a tool is **not** a
  derivative of the tool → essentially zero entanglement. List it as an optional
  recommended dependency (already in
  [`bring_your_own_to_compare/roll_your_own.md`](../generation_spec/bring_your_own_to_compare/roll_your_own.md)).
- **Mode 2 — vendor its source (only if going deep):** Apache-2.0 terms apply to
  the vendored folder: keep the LICENSE, retain notices, propagate any `NOTICE`
  file, **state significant changes** if modified, add to
  [`THIRD_PARTY_LICENSES.md`](../THIRD_PARTY_LICENSES.md). Bonus over MIT:
  explicit patent grant. Keep the vendored code in its own subfolder; the license
  boundary follows the *folder*, not the feature — your own glue code stays MIT.

Don't "upgrade" the whole project to Apache — it carries more obligations
(NOTICE propagation, change statements) than MIT for no benefit. Isolate the
Apache piece.

> Engineering/OSS-hygiene read, not legal advice. If you vendor *and* modify,
> a quick lawyer pass on NOTICE handling is cheap insurance.

---

## First-pass scope (recommended build order)

1. **External-source-track ingest** — import any `.funscript` as a candidate
   source, time-aligned (FF-Flow already emits `at_ms`). Covers FF-Flow,
   FunGen, and "my own great script" in one stroke.
2. **Opt-in "Analyze video motion"** — run FF-Flow as a subprocess (Mode 1),
   populate the video source. Analyze-stage, not interactive.
3. **Per-chapter source picker** + auto-suggest from confidence; radar becomes
   the audio sub-control.
4. **Seam stitch** at source switches (reuse `--blend-seams`).
5. **Provenance** in the sidecar → FunscriptForge.

Defer: deep/raw-signal integration (Mode 2), the "video timing + audio
intensity" hybrid mode, sub-chapter switching, a true weighted blend.

---

## Cross-references

- [`generation_spec/video_spec/algorithm.md`](../generation_spec/video_spec/algorithm.md) — the 9-stage pipeline this note maps ownership onto.
- [`generation_spec/generation_pipeline.md`](../generation_spec/generation_pipeline.md) — the `ACURVE/VCURVE/BLEND` hybrid diagram; BLEND = selector in v1.
- [`generation_spec/bring_your_own_to_compare/roll_your_own.md`](../generation_spec/bring_your_own_to_compare/roll_your_own.md) — FF-Flow / FunGen / OFS / funscript.io as external generators feeding FunscriptForge.
- [`HAPTICS_GENERATOR_FAMILY.md`](HAPTICS_GENERATOR_FAMILY.md) — author-once / target-many; video is a *source*, haptics targets are *sinks*.
- FunscriptForge `internal/source_provenance.md` — the downstream refiner's read of the per-chapter `source` field.
