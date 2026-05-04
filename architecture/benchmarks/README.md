# Long-form benchmark snapshots

Algorithm-change drift tracking for the audio→funscript pipeline. Each
JSONL file is a frozen snapshot of [`testcases/long_form_benchmark/`](../../testcases/long_form_benchmark/) output,
captured when an algorithmic decision is made (revert, ship, milestone).

## What lives here

`<date>_<label>.jsonl` — one record per benchmark run, schema:

```json
{"label": "victoria_5min", "media": "victoria_5min.mp4",
 "media_size_bytes": 207613583, "elapsed_seconds": 16.68,
 "stage_seconds": {"analyze_beats": 16.68, ...},
 "peak_rss_mb": 259.2, "num_beats": 623, "num_curve_points": 623,
 "error": null,
 "pos_stats": {"min": 10, "max": 85, "p5": 10, "p25": 10, "p50": 18,
               "p75": 57, "p95": 66, "in_40_60_band_pct": 28.7}}
```

The `pos_stats.in_40_60_band_pct` field is the primary drift indicator:
percentage of curve points inside the dead-zone 40–60 band. Higher = flatter
output. The pre-Track-A baseline shows Victoria at 28.7% (music; should be
lower) and ipzz125 at much higher values (ambient; the original complaint).

## Capturing a new snapshot

After an algorithm change is committed, re-run the harness and copy:

```bash
# from the repo root, with the venv active:
python testcases/long_form_benchmark/run_sweep.py
cp testcases/long_form_benchmark/results/results.jsonl \
   architecture/benchmarks/$(date +%Y-%m-%d)_<label>.jsonl
```

`<label>` should describe the algorithmic change ("track_b_initial",
"chapter_aware_v1", etc.). The harness `run_benchmark.py` is intentionally
kept in lockstep with `panels/generate.py` — when the app's `beats_to_curve`
call signature changes, the harness changes too, so snapshots compare
apples-to-apples.

## Comparing snapshots

```bash
python architecture/benchmarks/compare.py \
  architecture/benchmarks/2026-05-04_baseline_forgegen_v0.1.0-alpha.jsonl \
  architecture/benchmarks/<latest>.jsonl
```

Output groups labels into improved / regressed / stable based on
`in_40_60_band_pct` deltas. Reduction = win for music-driven content;
*increase* = the same flat-output bug we're fixing.

## Current snapshots

| Snapshot | Defaults | Notes |
|---|---|---|
| `2026-05-04_baseline_forgegen_v0.1.0-alpha.jsonl` | `low=10, high=90, energy_normalize=True, density=2` | The pre-Track-A baseline. 25 runs across music/ambient/hentai/hypnotic/cock-hero. The reference for any future drift comparison. |
| `2026-05-04_track_a_partial.jsonl` | `low=0, high=100, energy_normalize="log", density=2` | Abandoned Track A run. Music win (Victoria 28.7%→0.8%), ambient regression (ipzz125 84%→96%). Kept as evidence the partial-win path was rejected per the "no shortcuts" guidance. See [`videoflow/docs/architecture/audio-structure-primitive.md`](https://github.com/liquid-releasing/videoflow/blob/main/docs/architecture/audio-structure-primitive.md) for the chosen direction. |

## Why this lives in `architecture/`, not `testcases/`

`testcases/` is gitignored — it holds the harness scratch space and the
multi-GB `test_media/` files we sweep over. None of that belongs in version
control. *Results*, however, are small (KB), portable (basenames only), and
the only thing that lets future algorithm changes show their work against
prior baselines. They live next to architectural decisions because that's
the audience: each snapshot is the empirical receipt that pairs with a
design decision.
