"""Compare two long-form benchmark snapshots; surface pos_stats drift.

Usage:
    python architecture/benchmarks/compare.py <baseline.jsonl> <latest.jsonl>

Groups labels into improved / regressed / stable by `in_40_60_band_pct`
delta (the primary drift indicator). Also surfaces labels missing from
one snapshot or the other so partial sweeps don't silently skew
comparisons.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def load_snapshot(path: Path) -> dict[str, dict]:
    """Load a JSONL snapshot keyed by label. Last record wins on dup labels."""
    records: dict[str, dict] = {}
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            records[rec["label"]] = rec
    return records


def fmt_pos(rec: dict) -> str:
    p = rec.get("pos_stats") or {}
    if not p:
        return "(no pos_stats — error: %s)" % rec.get("error")
    iqr = p["p75"] - p["p25"]
    rng = p.get("p95", p["p75"]) - p.get("p5", p["p25"])
    return (
        f"p25={p['p25']:>3} p50={p['p50']:>3} p75={p['p75']:>3} "
        f"IQR={iqr:>3} range5-95={rng:>3} "
        f"in_40_60={p['in_40_60_band_pct']:>5.1f}%"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("baseline", type=Path)
    parser.add_argument("latest", type=Path)
    parser.add_argument(
        "--threshold", type=float, default=2.0,
        help="abs delta in in_40_60_band_pct to count as drift (default 2.0)",
    )
    args = parser.parse_args()

    base = load_snapshot(args.baseline)
    latest = load_snapshot(args.latest)

    base_only = sorted(set(base) - set(latest))
    latest_only = sorted(set(latest) - set(base))
    common = sorted(set(base) & set(latest))

    rows: list[tuple[str, float, float, dict, dict]] = []
    for label in common:
        b, l = base[label], latest[label]
        bp = b.get("pos_stats") or {}
        lp = l.get("pos_stats") or {}
        if not bp or not lp:
            continue
        d_in40 = lp.get("in_40_60_band_pct", 0) - bp.get("in_40_60_band_pct", 0)
        d_iqr = (lp["p75"] - lp["p25"]) - (bp["p75"] - bp["p25"])
        rows.append((label, d_in40, d_iqr, b, l))

    print(f"\n=== {args.baseline.name} -> {args.latest.name} ===\n")
    print(f"baseline: {len(base)} labels   latest: {len(latest)} labels   common: {len(common)}\n")
    print(
        "interpretation: in_40_60 alone is misleading — a low value can mean "
        "'curve uses the full range' (good) or 'curve sits at the floor' "
        "(bad). Read it together with IQR (p75-p25): healthy curves have "
        "wide IQR and p50 near 50 (for centered models). Track the SHAPE, "
        "not just the dead-zone density.\n"
    )

    if base_only:
        print(f"! in baseline only ({len(base_only)}): {', '.join(base_only)}")
    if latest_only:
        print(f"! in latest only   ({len(latest_only)}): {', '.join(latest_only)}")
    if base_only or latest_only:
        print()

    def dump(title: str, items: list[tuple[str, float, float, dict, dict]]) -> None:
        if not items:
            return
        print(f"--- {title} ({len(items)}) ---")
        for label, d_in40, d_iqr, b, l in sorted(items, key=lambda r: r[1]):
            print(
                f"  {label:<28} d_in_40_60={d_in40:+6.1f}%  "
                f"d_IQR={d_iqr:+5.0f}"
            )
            print(f"    baseline: {fmt_pos(b)}")
            print(f"    latest:   {fmt_pos(l)}")
        print()

    in40_down = [r for r in rows if r[1] < -args.threshold]
    in40_up = [r for r in rows if r[1] > args.threshold]
    in40_flat = [r for r in rows if -args.threshold <= r[1] <= args.threshold]

    dump("in_40_60 DECREASED (less mid-band density)", in40_down)
    dump("in_40_60 INCREASED (more mid-band density)", in40_up)
    dump(f"in_40_60 stable (|delta| <= {args.threshold}%)", in40_flat)

    return 0


if __name__ == "__main__":
    sys.exit(main())
