# Track B 41-file sweep — results

**Date:** 2026-05-04
**Snapshot:** `2026-05-04_track_b_full_sweep_v2.jsonl`
**Branch:** `feat/auto-chapter`

Empirical results from running Track B (chapter-aware analyze_beats +
classify_modes) across 41 test files spanning 5 minutes to 8 hours of
content. Pairs each result against hand-authored gold-standard
reference funscripts where available.

---

## Summary

- **Floor problem fixed:** every label has p50≈50 (vs pre-Track-A
  baseline p50≈11). Curves are centered, no longer hugging the floor.
- **Three clusters by IQR:**
  - **Alive (IQR ≥ 27):** 10 labels — pmvhaven-style PMV consistently
    lands here.
  - **Edge (IQR 17–26):** 17 labels — composed-CH, hypnotic+dialogue,
    starless/kangoku.
  - **Dead (IQR ≤ 16):** 14 labels — pure dialogue, ambient, hentai
    foley-heavy, long-uniform content.
- **Cookbook implication:** the failure modes are content-type
  specific, not algorithm-uniform. v1 needs a content-type classifier
  + per-recipe mode selection, not a single global amplitude knob.

---

## All 41 results, sorted by IQR descending

| Label | IQR | p25 / p50 / p75 | band 40–60% | Elapsed | Cluster | Content type |
|---|---:|---:|---:|---:|---|---|
| victoria_5min | 46 | 27 / 50 / 73 | 29.8 % | 16 s | alive | pmvhaven PMV (slice) |
| victoria_45min | 44 | 28 / 50 / 72 | 23.6 % | 111 s | alive | pmvhaven PMV (slice) |
| sweet_cerulean_full | 36 | 32 / 50 / 68 | 29.3 % | 551 s | alive | hypnotic (Supermassive 2025) |
| victoria_full | 36 | 32 / 50 / 68 | 17.6 % | 360 s | alive | pmvhaven PMV (full 93 min) |
| mhbhj01_full | 34 | 33 / 50 / 67 | 14.8 % | 162 s | alive | beat-driven JAV |
| milky_katie_full | 34 | 33 / 50 / 67 | 37.1 % | 155 s | alive | beat-driven (user: "all beat") |
| rod_pmv_full | 32 | 34 / 50 / 66 | 25.0 % | 217 s | alive | pmvhaven PMV (RoD reference) |
| victoria_20min | 32 | 34 / 50 / 66 | 36.5 % | 50 s | alive | pmvhaven PMV (slice) |
| sinful_full | 30 | 35 / 50 / 65 | 34.5 % | 137 s | alive | beat-driven Western (gold std) |
| ch_tranquilizer_full | 28 | 36 / 50 / 64 | 36.1 % | 408 s | edge → alive | DPL beat-driven CH (177 min) |
| dark_progression_full | 26 | 37 / 50 / 63 | 37.0 % | 305 s | edge | mixed |
| euphoria2_full | 26 | 37 / 50 / 63 | 43.8 % | 156 s | edge | DPL hypnotic + dialogue (gold std) |
| magik_pt2_full | 24 | 38 / 50 / 62 | 42.7 % | 68 s | edge | DPL composed-CH (gold std) |
| ph_dl_full | 24 | 38 / 50 / 62 | 48.0 % | 161 s | edge | composed-CH (gold std) |
| choco_full | 22 | 39 / 50 / 61 | 48.6 % | 200 s | edge | mixed |
| dropout_full | 22 | 39 / 50 / 61 | 48.0 % | 54 s | edge | mixed |
| ipzz125_5min | 22 | 39 / 50 / 61 | 49.7 % | 15 s | edge | JAV ambient (slice) |
| starless_full | 22 | 39 / 50 / 61 | 49.8 % | 183 s | edge | classic hentai |
| ipz586_90min | 20 | 40 / 50 / 60 | 51.0 % | 329 s | edge | JAV ambient (slice) |
| ipzz125_45min | 20 | 40 / 50 / 60 | 57.0 % | 118 s | edge | JAV ambient (slice) |
| kangoku_full | 20 | 40 / 50 / 60 | 52.6 % | 243 s | edge | JAV |
| magik_pt1_full | 20 | 40 / 50 / 60 | 54.3 % | 174 s | edge | DPL composed-CH (gold std) |
| prison_full | 20 | 40 / 50 / 60 | 52.6 % | 235 s | edge | mixed |
| ipz586_45min | 18 | 41 / 50 / 59 | 57.6 % | 105 s | edge | JAV ambient (slice) |
| ipzz125_full | 18 | 41 / 50 / 59 | 64.7 % | 489 s | edge | JAV ambient (full 123 min) |
| numberonefan_full | 18 | 41 / 50 / 59 | 59.2 % | 370 s | edge | edger CH compilation (Angel Anjelica, 160 min) |
| blueberry_full | 16 | 42 / 50 / 58 | 70.7 % | 310 s | dead | DPL hypnotic intent-driven (gold std) |
| ddt470_full | 16 | 42 / 50 / 58 | 67.6 % | 342 s | dead | JAV |
| ipz586_5min | 16 | 42 / 50 / 58 | 63.0 % | 15 s | dead | JAV ambient (slice) |
| ipzz125_20min | 16 | 42 / 50 / 58 | 67.4 % | 53 s | dead | JAV ambient (slice) |
| pigeon_20min | 16 | 42 / 50 / 58 | 67.7 % | 77 s | dead | hentai (slice) |
| pigeon_5min | 16 | 42 / 50 / 58 | 66.9 % | 23 s | dead | hentai (slice) |
| zer0_game_full | 16 | 42 / 50 / 58 | 62.6 % | 197 s | dead | gold-std (likely intent-driven) |
| ddt483_full | 14 | 43 / 50 / 57 | 74.0 % | 420 s | dead | JAV (167 min) |
| gtj170_full | 14 | 43 / 50 / 57 | 69.4 % | 1352 s | dead | 8 h compilation stress |
| ipz586_20min | 14 | 43 / 50 / 57 | 64.6 % | 53 s | dead | JAV ambient (slice) |
| ipz586_full | 14 | 43 / 50 / 57 | 69.9 % | 1272 s | dead | JAV ambient (full 5 h 35 min) |
| pigeon_full | 14 | 43 / 50 / 57 | 69.5 % | 217 s | dead | hentai full (58 min) |
| prisoner_full | 14 | 43 / 50 / 57 | 69.0 % | 160 s | dead | Western live-action |
| ajames4_full | 2 | 49 / 50 / 51 | 86.9 % | 57 s | dead | mixed (1st half action / 2nd half talk — pre-edit before shipping) |
| astarr_full | 2 | 49 / 50 / 51 | 93.8 % | 156 s | dead | mostly action, dialogue-heavy stretches |

---

## Gold-standard reference funscripts

Hand-authored reference funscripts (1D position track) from the same
sources, with their `pos_stats` for direct comparison.

| Reference | Author | Form | Actions | p25 / p50 / p75 | IQR | band % | Range 5-95 |
|---|---|---|---:|---:|---:|---:|---:|
| RoD EE 2025 | (multiple, restim-stereostim) | pmvhaven PMV | 22,686 | 0 / 30 / 100 | **100** | 0.2 % | 100 |
| Sinful XXX-perience | unknown | gold-standard Western | 16,021 | 0 / 53 / 100 | **100** | 13 % | 100 |
| Euphoria1 | DPL ("oldie / pioneer days") | hypnotic intent-driven | 7,466 | 0 / 50 / 100 | **100** | 0.1 % | 100 |
| Euphoria2 | DPL | hypnotic + dialogue | 10,281 | 0 / 70 / 100 | **100** | 14 % | 100 |
| Euphoria3 alpha | DPL (stereostim only) | hypnotic stim modulation | 79,216 | 24 / 50 / 75 | 51 | 30 % | 100 |
| Euphoria3 beta | DPL (stereostim only) | hypnotic stim modulation | 79,084 | 22 / 50 / 77 | 55 | 31 % | 99 |
| Magik #3 Pt 1 | DPL | composed-CH | 17,863 | 13 / 45 / 77 | 64 | 14.6 % | 100 |
| Magik #3 Pt 2 | DPL | composed-CH | 11,760 | 0 / 47 / 100 | **100** | 4.3 % | 100 |
| ZerO Game (1D) | unknown (hand-authored) | unknown | 11,826 | 21 / 57 / 91 | 70 | 15.3 % | 100 |
| ph dl 01 captions | unknown | composed-CH | 24,605 | 29 / 46 / 77 | 48 | 31.2 % | 100 |

**Observation:** even within hand-authored gold-standard funscripts, IQR
varies from 48 → 100. Some references are bimodal-extreme (RoD,
Sinful, Euphoria 1/2, Magik Pt 2); others are wide-but-not-extreme
(Magik Pt 1 = 64, ZerO Game = 70, ph dl = 48). The "gold standard
shape" is a spectrum, not a single profile.

---

## Forgegen vs human reference (where direct comparisons exist)

| Label | forgegen IQR | human IQR | gap | forgegen / human |
|---|---:|---:|---:|---:|
| rod_pmv_full | 32 | 100 | 68 | 32 % |
| sinful_full | 30 | 100 | 70 | 30 % |
| euphoria2_full | 26 | 100 | 74 | 26 % |
| magik_pt2_full | 24 | 100 | 76 | 24 % |
| magik_pt1_full | 20 | 64 | 44 | 31 % |
| ph_dl_full | 24 | 48 | 24 | **50 %** |
| zer0_game_full | 16 | 70 | 54 | 23 % |

ph_dl is the closest — forgegen produces 50 % of the human reference's
IQR. The others run 22-32 % of the human reference. Not yet matching
gold-standard, but consistently producing centered alive output where
the baseline produced flat near-floor output.

---

## Content category mapping (cookbook draft)

| Cluster | IQR range | Content categories | v1 verdict |
|---|---:|---|---|
| **Alive** | ≥ 30 | pmvhaven PMV, beat-driven Western, beat-driven JAV | v1 ships |
| **Edge** | 17–28 | composed-CH (Magik series, ph_dl), hypnotic + dialogue, classic hentai (starless), some JAV | v1 ships at "alive enough" — recipe targets exist |
| **Dead** | ≤ 16 | pure dialogue/ambient, hentai foley-heavy (pigeon), DPL intent-driven hypnotic (blueberry, ZerO Game?), long-uniform | v1 design work needed: content-type classifier + slow_persistent mode |

### Why each cluster lands where it does

**Alive cluster** — pmvhaven-style PMV has clear musical beat that
forgegen's chapter-aware classification picks up consistently. Modes
land in `steady` / `edging` / `fast` with varied amplitudes.

**Edge cluster** — composed-CH (Magik, ph dl) has author intent layered
on top of audio; forgegen audio analysis can't fully capture intent
but produces moderate amplitude. Hypnotic + dialogue (Euphoria) sits
here because some musical structure exists but dialogue dominates
parts of the file.

**Dead cluster** — pure dialogue / ambient / foley-heavy content has
no rhythmic structure for forgegen to lock onto. Chapters classify
into `break` / `tease` (low-amplitude modes), and per-chunk
normalization on uniformly-low-energy content produces a flat curve
near 50.

---

## Gaps to close for v1

1. **Content-type classifier** — detect dialogue-heavy / ambient /
   hypnotic from audio features (MFCC + spectral centroid +
   zero-crossing + harmonicity).
2. **`slow_persistent` mode** — for dialogue/ambient/uniform content,
   emit slow steady oscillation (~50–60 % amplitude, 5-10 s period)
   instead of near-zero `break`. Goal: lift IQR from 2-16 to 20+.
3. **Per-recipe mode selection** — `classify_modes()` consults
   detected content type when picking modes, so the same audio
   analysis routes to different output shapes.
4. **Re-sweep validation** — once recipes land, re-run this 41-file
   suite and confirm dialogue/ambient cluster lifts into edge zone
   (IQR ≥ 20).

---

## Caveats

- "Gold standard" is not a single shape — the human references span
  IQR 48 → 100. Different authors / different artistic choices
  produce different outputs even on the same file.
- forgegen is **audio-only** — no video signal. Hand authors had
  both. Audio-only fundamentally cannot match composer-intent on
  hypnotic content (Euphoria, Blueberry, possibly ZerO Game) where
  beats follow author vision rather than the audio waveform.
- ajames4 and astarr include long stretches the user would hand-edit
  out before shipping; their full-file IQR=2 is partly an artifact of
  measuring across pre-edit content.
