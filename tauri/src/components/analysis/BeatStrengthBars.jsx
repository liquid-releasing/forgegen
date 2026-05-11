// BeatStrengthBars — bar-density timeline replacement for the synthetic
// Audacity-style waveform from the original JSX (decision #1 in
// ANALYSIS_TAB_REFINEMENT.md). Each bar = one beat from
// energy.beat_map; height = strength.
//
// Optional `colorAt(i)` lets callers tint individual bars (e.g., by
// containing phrase mode in the bottom Beat-energy chart). When the
// caller passes more beats than MAX_BARS, we downsample by aggregating
// into fixed bins — keeps the visual shape, prevents container overflow
// on long files (an 8h track with 72k beats would otherwise force the
// flex container to 72k+ pixels via minWidth: 1).

import { useMemo } from 'react';
import { beatIndicesInRange } from '../../lib/analysis.js';

const MAX_BARS = 1500;

export default function BeatStrengthBars({
  beatMap,
  startMs = 0,
  endMs = null,
  height = 80,
  color = '#5b6cff',
  colorAt = null,
  showDownbeats = false,
  background = 'transparent',
}) {
  const samples = useMemo(() => {
    if (!beatMap?.times_ms?.length) return [];
    const end = endMs ?? Math.max(...beatMap.times_ms) + 1;
    const indices = beatIndicesInRange(beatMap, startMs, end);

    if (indices.length <= MAX_BARS) {
      return indices.map((i) => ({
        strength: beatMap.strengths?.[i] ?? 0,
        isDownbeat: !!beatMap.is_downbeat?.[i],
        origIdx: i,
      }));
    }

    // Downsample: aggregate into MAX_BARS bins (mean strength, OR for downbeat)
    const bins = new Array(MAX_BARS).fill(0).map(() => ({
      sum: 0,
      count: 0,
      downbeat: false,
      lastIdx: -1,
    }));
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      const bin = Math.min(MAX_BARS - 1, Math.floor((k / indices.length) * MAX_BARS));
      bins[bin].sum += beatMap.strengths?.[i] ?? 0;
      bins[bin].count += 1;
      if (beatMap.is_downbeat?.[i]) bins[bin].downbeat = true;
      bins[bin].lastIdx = i;
    }
    return bins.map((b) => ({
      strength: b.count > 0 ? b.sum / b.count : 0,
      isDownbeat: b.downbeat,
      origIdx: b.lastIdx,
    }));
  }, [beatMap, startMs, endMs]);

  if (samples.length === 0) {
    return (
      <div
        style={{
          height,
          background,
          border: '1px solid var(--border)',
          borderRadius: 4,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--muted)',
          fontSize: 11,
        }}
      >
        no beats in range
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        height,
        background,
        padding: '2px 0',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {samples.map((s, k) => {
        const barColor = colorAt ? colorAt(s.origIdx) : color;
        return (
          <div
            key={k}
            style={{
              flex: 1,
              minWidth: 1,
              height: `${Math.max(4, s.strength * 100)}%`,
              background: barColor,
              opacity: 0.85,
              borderTop: showDownbeats && s.isDownbeat
                ? '2px solid rgba(255,255,255,0.85)'
                : 'none',
              borderRadius: 1,
            }}
          />
        );
      })}
    </div>
  );
}
