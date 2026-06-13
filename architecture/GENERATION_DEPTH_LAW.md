# The depth law — why great scripts are bimodal, and how the engine reaches it

> **Status:** core finding + engine decision note (2026-06-12). This is the
> single most load-bearing result for generation correctness. Lead with it
> when someone asks "why did our output look like a centered bell?" or
> "where does stroke amplitude come from?"
>
> Companion to [`funscript-quality-characteristics.md`](funscript-quality-characteristics.md)
> (Dimension 1 — distribution shape names the *target*; this doc explains the
> *mechanism*) and [`VIDEO_VIA_EXTERNAL_GENERATOR.md`](VIDEO_VIA_EXTERNAL_GENERATOR.md)
> (the video source whose CV output independently confirmed the law).

---

## The one-sentence law

> **Map any signal to stroke depth and you get a centered bell with empty
> rails. Make depth a fixed full-depth backbone and let the signal drive
> only *timing* and *density*, and you get the bimodal, rail-to-rail shape
> of a great hand-made script.**

It is not a tuning problem. It is the *wrong variable*. Stop mapping
signal → amplitude.

---

## How we know — the measurement

The oracle is a **decile range-use histogram**: bucket every `pos` value into
ten bins (0–9, 10–19, … 90–99) and read the shape.

- **Rails** = bins 0 + 9 (strokes that reach 0 / 100).
- **Mid** = bins 2–7 (strokes that sit in the middle).
- **Bell** (mid-piled, empty rails) = bad. **Bimodal** (rails-loaded, hollow
  centre) = good.

Measured on *A Sinful XXX-perience* (a reference scene we have the
hand-authored gold for) and on a benchmark slice:

| Track | rate | shape | rails | mid |
|---|---|---|---|---|
| **Gold** (hand-authored) | 4.7/s | **bimodal** | **68** | 20 |
| Our old engine (audio energy → depth) | 5.5/s | centered bell | **0** | 93 |
| PythonDancer (hand-tuned) | ~4/s | centered, skewed high | 3 | 83 |
| Funscript-Flow (raw CV, optical flow → depth) | 25/s | nearly uniform | 25 | 53 |

The gold lives in a place **no signal-proportional method reaches**: full
rail-to-rail reach (68 % at the rails) at a *restrained* rate (sparser than
even our audio output). Reach **and** restraint.

---

## The proof — confirmed across two independent modalities

We proved the law twice, with two unrelated signal sources. That is why we
trust it as a law rather than a heuristic.

**1. Audio (the bench).** Sweeping amplitude models on a real beat-map
(`testcases/amp_model_experiment.py`): every model that scaled amplitude by
energy produced a bell. A **fixed-depth + energy-gate** model produced a clean
bimodal split. Energy belongs on *density*, not depth.

**2. Video (Funscript-Flow).** We ran the CV generator headless on the same
footage as the gold. Its raw output (optical-flow magnitude → depth) is
*uniform*, not bimodal — the same failure as audio, from a completely
different signal. Then we kept FF-Flow's **reversal timing** and snapped each
stroke to **full depth**: the distribution jumped to **rails 99**, a clean
bimodal — identical in kind to the gold.

So: two signals, one law. Depth ∝ signal → mush. Fixed depth + signal →
timing → the gold shape. This is also exactly the `compose(timing, intensity)`
spine — the timing producer is interchangeable (audio beats *or* video
reversals), depth is a fixed backbone either way.

> A bonus that fell out of reading FF-Flow's source: it forces its rails with
> a **rolling local min/max normalisation** (stretch each window to 0–100).
> That is a reusable trick for any signal whose absolute scale is unreliable.

---

## How the engine implements it

`videoflow/src/videoflow/generate.py`, `beats_to_curve(..., depth_model="fixed")`
(the default as of this change):

1. **Fixed full-depth backbone.** Each surviving beat emits a self-contained
   stroke around the centre (default 50): `pos = center ± 50·depth`. At
   `depth = 1.0` that is rail-to-rail (0 / 100).
2. **Energy gates density, not depth.** Beats whose normalised energy falls
   below `gate` (default 0.10) are dropped. Quiet passages thin out; loud
   passages stay busy. Energy never touches amplitude.
3. **Modes add partial-depth *texture*.** `_MODE_DEPTH` gives most modes full
   depth (`steady`/`fast`/`edging`/`slow` ≈ 1.0) and only the deliberately
   soft modes a partial (`tease` 0.72, `break` 0.55). This recreates the gold's
   ~20–25 % middle without collapsing the whole distribution.
4. **`shape_curve` is skipped** under the fixed model — its mode compression
   scales *toward the centre*, which is the bell trap. Shaping is folded into
   the curve.

The legacy `depth_model="energy"` is preserved bit-for-bit for back-compat.

### Result and the remaining gap

On the benchmark slice the rewire moves the shape from **bell (rails 0)** to
**bimodal (rails 20)**, and with full depth on every stroke it reaches the
ideal **rails 100** — the engine is sound. The gap from 20 to the gold's 68 is
**entirely** in `classify_modes` (`videoflow/stanzas.py`): it currently labels
~85 % of a normal track as `break`/`tease`, so 85 % of strokes get shallow
depth. A real track is not 85 % near-still. **Fixing the mode classifier so
full-depth modes dominate is the next lever**, and it is where the remaining
rails come from.

---

## Why this reframes the project

- **Depth is solved and modality-agnostic.** Whatever supplies timing — audio
  beats today, video motion next — depth is the same fixed backbone. No
  rewrite for video; it is a socket.
- **Video earns its place as a *timing* source, not an amplitude source.** Its
  raw amplitude is as wrong as audio's; its value is knowing *when* the motion
  reverses (see [`VIDEO_VIA_EXTERNAL_GENERATOR.md`](VIDEO_VIA_EXTERNAL_GENERATOR.md)).
- **The expressive knobs change.** Because depth is fixed and always in-range,
  the user never fights amplitude/clipping (PythonDancer's whole knob-wrangling
  workflow disappears). The real knobs become **density** (how busy) and
  **arc/tone** (the moving centre). See the user doc,
  [`docs/how-the-generator-works.md`](../docs/how-the-generator-works.md).

---

## Cross-references

- [`funscript-quality-characteristics.md`](funscript-quality-characteristics.md) — Dimension 1 names the bimodal target; this doc is the mechanism behind it.
- [`VIDEO_VIA_EXTERNAL_GENERATOR.md`](VIDEO_VIA_EXTERNAL_GENERATOR.md) — Funscript-Flow as the video timing source that independently confirmed the law.
- `testcases/amp_model_experiment.py` — the audio bench that first proved fixed-depth + gate.
- `testcases/funscript_flow_trial/` — the FF-Flow run + the timing-and-snap experiment (throwaway, gitignored).
- `videoflow/src/videoflow/generate.py` — `beats_to_curve(depth_model=…)`, `_MODE_DEPTH`.
