# What makes a great funscript

**Status:** living architectural reference. Captures the *dimensions*
of funscript quality so the team has shared vocabulary, the benchmark
harness measures the right things, and the algorithm targets the right
goals.

---

## Why this doc exists

Funscript quality has many dimensions. Some are easy to measure
(distribution stats), some are known but not yet bench-measured
(velocity, stroke amplitude, action density), some are structural and
hard to quantify (build/release, rhythmic alignment), and some are
inherently experiential (authorial intent, narrative voice).

This doc enumerates them so we know:

- Which dimensions our benchmark currently captures.
- Which dimensions we've identified but haven't yet measured.
- Which dimensions are inherently hard to score, and why.

It's the companion to
[`chapter-composition.md`](chapter-composition.md) (which targets the
gold-standard reference table) and the
[`benchmarks/2026-05-04_track_b_results.md`](benchmarks/2026-05-04_track_b_results.md)
sweep results.

---

## Dimension 1 — Distribution shape (currently measured)

How positions are distributed over the file. Captured by:

| Stat | What it tells you | Track B norm | Gold std norm |
|---|---|---|---|
| `p50` | Curve's median (centered model) | 50 (good) | 30–70 |
| `IQR` (`p75-p25`) | How wide the curve breathes | 14–34 | 48–100 |
| `band 40-60%` | Time spent in the mid-zone | 14–94 % | 0.1–31 % |
| `range 5-95` | How far the curve reaches at the wings | 30–60 | 100 |

**Why distribution matters:** baseline test for "alive vs flat." A
narrow IQR with high band % is the dead-line failure mode. Wide IQR
with low band % is gold-standard bimodal.

**Why it's not enough:** distribution averages over the file. A
script with `IQR=80` could be reached by:
- Constant strokes between 10 and 90 (no narrative arc)
- One quiet act + one extreme act (strong narrative arc)
- Random oscillation (no structure)

All three give similar distribution stats but feel completely
different to the user.

---

## Dimension 2 — Velocity & stroke amplitude (known, not yet benched)

How fast and how big each stroke is. Captured by
[`chapter-composition.md`](chapter-composition.md)'s gold-standard
table:

| Track | Avg stroke | Avg velocity | p90 velocity | Actions/s |
|---|---|---|---|---|
| Magik #3 Pt 1 | 59.5 | 244 | 404 | 4.1 |
| Magik #3 Pt 2 | 85.7 | 250 | 334 | 2.9 |
| RoD EE 2025 | 98.5 | 664 | 943 | 4.2 |

**Avg stroke** = average position delta between consecutive actions.
Higher = each stroke covers more ground.

**Avg velocity** (units/second) = the rate of position change.
RoD's 664 vs Magik's 244 shows the form supports
*much* faster motion than even a hand-authored CH delivers.

**p90 velocity** = peak motion intensity. RoD's 943 = brief moments
that *really* go. Captures whether the script has bursts of intensity
or stays at a steady speed.

**Actions per second** = density. 4.2 vs 2.9 isn't just more strokes —
it's whether the script feels packed or breathy.

**Why this matters and isn't currently captured:** distribution stats
say nothing about *how the curve gets between p25 and p75*. A curve
could move slowly across 0–100 (looks alive but feels boring) or burst
rapidly within 30–70 (narrower IQR but feels lively). Velocity stats
disambiguate.

**Action item:** extend the benchmark harness to compute these. Likely
requires a tiny `funscript_stats.py` helper that reads the actions
list and computes per-stroke deltas, per-action timings, and rate
percentiles.

---

## Dimension 3 — Structural shape (largely unmeasured)

How the curve evolves over the file. Captured by:

- **Build / climax / release** — does intensity rise across the file?
  Plateau? Multiple peaks? The narrative arc.
- **Per-chapter dynamics** — quiet sections vs intense sections.
  forgegen's chapter-aware classification *implicitly* encodes this
  via mode assignment, but we haven't measured the resulting curve's
  inter-chapter contrast.
- **Anti-repetition** — does the same pattern loop, or does each
  stretch carry its own variation?

**Why this matters:** the user's earlier insight — *"alive enough for
the content type"* — depends on the curve having appropriate structure
*for the content*. A flat IQR=80 across an entire 90-minute file
without varying intensity is *technically* alive but *structurally*
wrong. The reverse — IQR=20 globally because most of the file is
quiet, with brief IQR=100 climax sections — is structurally correct
even though the aggregate stat is low.

**Hard to measure objectively:**

- Build is a curve-of-curves problem; standard stats over the whole
  file lose it.
- Dynamics could be approximated as `IQR(rolling 5-min window).std()`
  — i.e., does the local IQR vary over time? Wide variation = dynamic
  script; constant = monotone.
- Anti-repetition could be approximated by autocorrelation of stroke
  pattern — repeating loops show as autocorrelation peaks at the loop
  period.

**Action item:** worth investigating *rolling-window* stats (per
5-minute slice) and an `IQR.std()` or `range.std()` summary as a
"dynamics index" — single number that captures whether the script
varies over time.

---

## Dimension 4 — Rhythmic alignment (unmeasured)

Does the script hit on the beat? On the *right* beat (downbeat vs
upbeat)? Lock to phrase boundaries?

CH is the form that exists *because* rhythmic alignment carries the
experience. A script that hits 5ms off the beat across every stroke
feels noticeably worse than one that locks tight. Even alive-cluster
forgegen output may feel underwhelming if the strokes don't *land*
with the music.

**Why this matters:** beat-driven content (the alive cluster:
pmvhaven PMV, RoD, Magik) is *defined* by the audio-funscript
synchronization. The forgegen pipeline already detects beats and ties
strokes to them; what we haven't measured is *how tightly*.

**Hard to measure precisely:**

- Need the audio's true beat timestamps (we already compute them in
  `analyze_beats()`).
- Compare each funscript action's timestamp to the nearest detected
  beat: median offset, p95 offset.
- Tighter offset = better rhythmic alignment.

**Action item:** add `rhythmic_offset_ms_p50` and
`rhythmic_offset_ms_p95` to the benchmark output. Free measurement
since `analyze_beats()` already produces the beat list.

---

## Dimension 5 — Coherence with content (audio-only can't capture)

Does the script's intensity match what's happening on screen?

This is the **fundamental limit of audio-only**: forgegen sees
soundtrack, not action. A creator hand-authoring a script *watches*
the video and times bursts to visual climaxes — sometimes
counter-rhythmically to the audio. forgegen literally cannot do this.

**This is why:**

- DPL's hypnotic content (Euphoria, Blueberry) — beats follow author
  intent layered on visuals + music narrative, not the audio waveform.
- Composed-CH (Magik) — author chose stroke timing partly for visual
  alignment, audio is one input.
- Mixed action+talk (ajames, astarr) — humans skip the talking parts
  visually; audio analysis gives the talking parts amplitude they
  shouldn't have.

**Architectural answer (already decided):** FunscriptForge handles the
intent / coherence layer via phrase swap. forgegen produces a
soundtrack-coherent baseline; the human author drops in
visually-coherent phrases where it matters. Don't try to engineer this
into forgegen.

**v2 with video-signal complement:** scene-cut detection + motion
analysis could partially close the gap. Probably never fully — that
requires understanding what the visual content *means*, not just where
it cuts.

---

## Dimension 6 — Authorial intent / narrative voice (experiential)

The hardest. *"All to the soundtrack. Mesmerizing once you get used
to it."* The user's description of DPL's hypnotic style — there's no
metric that captures this.

DPL's body of work has a *voice*. Other authors have other voices.
What makes a script *feel* like DPL's vs feel like edger's vs feel
like a generic auto-output isn't reducible to numbers.

**This is why:**

- The cookbook + recipe approach is the right framing — different
  recipes capture different *styles*, even if they all hit the same
  technical numbers.
- Pro tier's curated phrase library matters — "DPL phrases" vs
  "edger phrases" deliver different experiences from the same
  numerical inputs.
- Honest scope ("audio-only forgegen produces a baseline; intent/
  voice come from the author via FunscriptForge") is the honest
  story, not an apology.

**No action item — by design.** Authorial voice is a human-in-the-
loop responsibility. Architecture handles it via FunscriptForge.

---

## Implications

### For the benchmark harness

Currently captures Dimension 1 (distribution). Should add:

- Dimension 2 (velocity / stroke / actions-per-second) — straight-
  forward extension of the funscript pos_stats analysis. **Highest
  value addition.**
- Dimension 3 (rolling-window dynamics) — IQR-over-time summary.
  Captures whether variation is structured.
- Dimension 4 (rhythmic alignment) — already-free using `analyze_beats`
  output.
- Dimensions 5, 6 — not benchmark-able. Captured by user dogfood and
  reference-funscript comparison.

### For the algorithm

- The cookbook + recipe framework targets Dimension 1 + Dimension 2
  (per-content-type recipes pick mode amplitudes + densities).
- Dimension 3 needs explicit per-chapter contrast — chapter-aware
  classification gets us part of the way; per-chapter dynamics tuning
  is the next lever.
- Dimension 4 alignment is already happening via beat-locked stroke
  generation; question is how tight, not whether.
- Dimensions 5, 6 are FunscriptForge's job, not forgegen's.

### For product positioning

- "Good" (PMV table-stakes) requires Dimensions 1–4 strong on music-
  driven content.
- "Great" (the moat) requires honest scope on Dimensions 5–6:
  "forgegen gives you the baseline; FunscriptForge gives you voice."
- The cookbook itself is a Dimension-6 artifact — it documents the
  *style* each recipe targets, not just the numbers.

---

## Open questions

1. **Are velocity stats the right next benchmark addition, or rhythmic
   alignment?** Both are cheap. Rhythmic alignment may surface more
   actionable findings since it's diagnostic of forgegen's beat-lock
   tightness.
2. **Does a "dynamics index" (IQR-over-time variance) correlate with
   user perception of "alive vs boring"?** Worth piloting on the
   alive-cluster results — does Sinful's IQR-over-time look different
   than mhbhj01's? Enough to be a useful metric?
3. **Can we measure "anti-repetition" cheaply?** Autocorrelation of
   the curve at typical loop periods (4-bar, 8-bar, etc.) — would
   detect mechanical-feeling output even when distribution stats look
   alive.
4. **What's the relationship between Dimension 1 (distribution) and
   Dimension 4 (rhythmic alignment)?** Hypothesis: Track B's edge-zone
   composed-CH results (Magik IQR=20-24) may have *better* rhythmic
   alignment than the alive cluster — beat-locked but lower amplitude.
   If true, "fixing" Magik isn't about widening IQR globally; it's
   about hitting harder on the locked beats.

