# Auto-Detection — What We Can Detect, With What Confidence

> What forgegen can derive automatically from audio and video, where
> the algorithms are reliable, where they fail, and how the design
> embraces partial automation with human review.
>
> Honest accounting matters: the architecture so far describes *what
> we'll do*; this doc describes *how reliably we expect it to work*.

## Design pattern: propose with confidence + human review

forgegen's auto-detection is **never authoritative on its own**. It
produces *proposals* with *confidence scores*. Downstream tooling
(forgevents, FF Pro) presents proposals to the artist who accepts /
adjusts / rejects.

This pattern is non-negotiable for long-form work. A 90-minute track
can't be trusted to fully automatic output even at 95% accuracy — that's
~5 minutes of wrong decisions. The design choice is to make review
*fast* (high-confidence proposals are one-keystroke confirms; only
low-confidence ones need real attention).

The analysis schema reserves explicit confidence fields:

- `chapter_proposals[i].confidence` — 0–1
- `event_proposals[i].confidence` — 0–1
- `structural.audio_video_alignment.boundary_agreement_score` — 0–1

forgevents UI uses these to:

- **Pre-accept** high-confidence proposals (>0.9) — visible but not flagged
- **Flag for review** medium-confidence proposals (0.6–0.9)
- **Hide unless requested** low-confidence proposals (<0.6) — too noisy to surface by default

## Audio-only chapter detection

### Algorithms (available in librosa today)

| Algorithm | What it does | When it works |
|---|---|---|
| `librosa.segment.agglomerative` | Hierarchical segmentation; returns boundaries at multiple time scales | Music with clear sectional structure |
| `librosa.segment.recurrence_matrix` + diagonal smoothing | Self-similarity-based segmentation | Music with repeating sections |
| Phrase-aggregation heuristic | Group adjacent phrases by character / mode similarity | Heuristic for long-form, drone-heavy content |
| Energy-contour thresholds | Detect big energy drops as boundaries | Clear dynamic shifts |

### Where audio-only is strong

- Pop / EDM / dance with clear verse / chorus / bridge structure
- Music with explicit transitions (key changes, drops, builds)
- Tracks where energy contour visibly shifts at section boundaries

### Where audio-only is weak

- **Drone-heavy or homogeneous sections** — the music doesn't shift,
  but the artist may still want a narrative chapter break (RoD has
  long passages where audio doesn't help)
- **Continuous-mood tracks** — an entire 90-minute set at the same
  energy / character; no audio signal for boundaries
- **Tracks with long continuous build** — auto-detect sees one long
  phrase; artist may want to subdivide

### Expected accuracy

**60–80% useful proposals** for typical tracks. The remaining
20–40% need human boundary placement.

## Video-only chapter detection

### Signals, ordered by ease

| Signal | Implementation | Status |
|---|---|---|
| Hard cuts | PySceneDetect — frame-to-frame histogram delta | one library call |
| Black frames / fades | brightness threshold + variance | trivial |
| Significant scenery change | colour histogram shift over windows | easy |
| Cut density windows | derivable from PySceneDetect output | easy |
| Camera motion changes | optical flow vector classification | moderate |
| Scene-type classification | scene-classification CNN (Places365) | future, model bundle |
| Object / pose changes | YOLO / pose models | future |

### Black frames as chapter markers

Many edited videos use fade-to-black between sections — an explicit
chapter marker the editor *already placed*. Detection: brightness +
colour variance both below threshold for ≥250 ms. **High-confidence
boundary signal.** Should be treated as ~0.95 confidence.

### Where video-only is strong

- Cut-driven edited content (most pro-level material)
- Content with explicit fade transitions
- Content with clear scenery shifts

### Where video-only is weak

- Single-take or sparse-cut content
- Continuous performance footage (one camera angle for minutes)
- Stylised content where cuts don't correspond to narrative shifts

### Expected accuracy

**70–85% useful proposals on typical edited content**, lower on
long-take or single-camera material.

## Audio + video co-detection (the strongest signal)

### The agreement principle

When an audio boundary aligns with a video boundary within a few
seconds, confidence multiplies. When they disagree, the boundary is
weaker — likely modality-specific.

```
Audio boundary at 90.0s + video cut at 89.7s  → CHAPTER BOUNDARY (confidence 0.95)
Audio boundary at 480s, no nearby video event → music-driven chapter (confidence 0.65)
Video cut at 600s, no nearby audio event      → visual-only marker  (confidence 0.55)
Both agree at multiple consecutive boundaries → tight section structure → high overall confidence
```

### Implementation

For each candidate boundary from either modality:

1. Find the nearest boundary in the other modality
2. Compute time delta
3. If delta < 2.5s → agreement → confidence ≥ 0.85
4. If delta 2.5–10s → partial alignment → confidence 0.65–0.85
5. If no nearby boundary → modality-specific → confidence 0.5–0.65

### Expected accuracy

**80–90% useful proposals on cut-driven content** with both modalities
present. The remaining 10–20% are typically narrative-only chapter
breaks the artist wants for reasons not present in either signal.

## Confidence trajectory across versions

| Stage | Boundary accuracy | Required human work |
|---|---|---|
| v0.0.5 (audio only) | ~60–80% | Review 20–40% of proposals |
| v0.0.6 (audio + video co-detection) | ~80–90% | Review 10–20% |
| v0.0.7+ (corpus-trained refinements) | ~85–95% on tracks similar to corpus | Review 5–15%, mostly low-confidence cases |

**Even at 95% there's still review.** The architecture must support
review-as-a-first-class workflow at every stage.

## Event auto-detection

Events are *easier* to auto-detect than chapters — they're sparse,
moment-anchored, and tied to specific signals. But they're *harder*
to place precisely (millisecond accuracy required).

| Event type | Primary signal | Expected confidence |
|---|---|---|
| `accent` | Sub-beat onset peak | 0.8–0.95 (easy to find, easy to place) |
| `edge_hold` | Sustained-energy peak (3+ seconds at high energy) | 0.6–0.85 (signal is there but boundaries are fuzzy) |
| `vocal_cue` | Vocal energy + pitch detection | 0.4–0.75 (harder — easy false positives without speech models) |
| `climax_candidate` | Audio peak + video peak + tight-cut window co-occurrence | 0.7–0.95 when modalities agree |
| `scene_accent` | PySceneDetect cut | 0.9–0.95 (mostly placement is exact) |
| `tight_cut_zone` | Cut density > threshold over window | 0.85–0.95 (clear signal) |

Vocal cues are the weakest auto-finder — distinguishing a sigh from a
breath from a moan needs speech models that aren't currently bundled.
**v0.0.5 likely emits `vocal_cue` only with low confidence**;
v0.0.7+ adds bundled audio classifiers and confidence rises.

## Where the architecture insists on human review

Some decisions can't be automated even at 95% accuracy:

- **Chapter intent labels** — "is this section a build or an edge?" depends
  on artist intent, not measurable signal. Auto can *propose* (with
  weak confidence) but the artist *decides*.
- **Climax timing** — the algorithm can detect candidate peaks, but
  *which* peak is THE climax of the piece is a narrative decision.
- **Event types where multiple are plausible** — an audio + video peak
  might be a climax, an accent, or a vocal cue depending on what's
  there. Auto labels with most-likely + confidence.
- **Tease / pause markers** — entirely human-authored; no audio /
  video signal proposes them.

Per `feedback_forgegen_floor_and_ceiling.md`, the floor (auto-default)
must produce *useful* output without human input; the ceiling (vision-led
artist) keeps full control to override anything.

## Honest summary

> *Yes, we can auto-detect chapters and events from audio + video.
> The first cut won't be perfect, but it will be useful — proposals
> + confidence scores + human review is the design.*

The architecture isn't *"replace the artist"* — it's *"make the
artist's job 10× faster while keeping their artistic control complete."*

## Cross-references

- Analysis layers (the conceptual model): `analysis-layers.md`
- Analysis schema (the persistence format): `analysis-schema.md`
- Chapters vs events (granularity differences): `chapters-vs-events.md`
- Floor + Ceiling product positioning (private memory): `feedback_forgegen_floor_and_ceiling.md`
