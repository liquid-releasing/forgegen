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
    return (
        f"p25={p['p25']:>3} p50={p['p50']:>3} p75={p['p75']:>3} "
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

    improved: list[tuple[str, float, dict, dict]] = []
    regressed: list[tuple[str, float, dict, dict]] = []
    stable: list[tuple[str, float, dict, dict]] = []

    for label in common:
        b, l = base[label], latest[label]
        bp = (b.get("pos_stats") or {}).get("in_40_60_band_pct")
        lp = (l.get("pos_stats") or {}).get("in_40_60_band_pct")
        if bp is None or lp is None:
            continue
        delta = lp - bp
        bucket = improved if delta < -args.threshold else regressed if delta > args.threshold else stable
        bucket.append((label, delta, b, l))

    print(f"\n=== {args.baseline.name} -> {args.latest.name} ===\n")
    print(f"baseline: {len(base)} labels   latest: {len(latest)} labels   common: {len(common)}\n")

    if base_only:
        print(f"! in baseline only ({len(base_only)}): {', '.join(base_only)}")
    if latest_only:
        print(f"! in latest only   ({len(latest_only)}): {', '.join(latest_only)}")
    if base_only or latest_only:
        print()

    def dump(title: str, rows: list[tuple[str, float, dict, dict]]) -> None:
        if not rows:
            return
        print(f"--- {title} ({len(rows)}) ---")
        for label, delta, b, l in sorted(rows, key=lambda r: r[1]):
            print(f"  {label:<28} delta in_40_60 = {delta:+6.1f}%")
            print(f"    baseline: {fmt_pos(b)}")
            print(f"    latest:   {fmt_pos(l)}")
        print()

    dump("IMPROVED (less mid-band cluster)", improved)
    dump("REGRESSED (more mid-band cluster)", regressed)
    dump(f"stable (|delta| <= {args.threshold}%)", stable)

    return 0


if __name__ == "__main__":
    sys.exit(main())
