// BeatStrengthBars — bar-density timeline replacement for the synthetic
// Audacity-style waveform from the original JSX (decision #1 in
// ANALYSIS_TAB_REFINEMENT.md). Each bar = one beat from
// energy.beat_map; height = strength.
//
// Optional `colorAt(i)` lets callers tint individual bars (e.g., by
// containing phrase mode in the bottom Beat-energy chart).

import { useMemo } from 'react';
import { beatIndicesInRange } from '../../lib/analysis.js';

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
  const indices = useMemo(() => {
    if (!beatMap?.times_ms?.length) return [];
    const end = endMs ?? Math.max(...beatMap.times_ms) + 1;
    return beatIndicesInRange(beatMap, startMs, end);
  }, [beatMap, startMs, endMs]);

  if (indices.length === 0) {
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
      }}
    >
      {indices.map((i) => {
        const strength = beatMap.strengths?.[i] ?? 0;
        const isDownbeat = beatMap.is_downbeat?.[i];
        const barColor = colorAt ? colorAt(i) : color;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 1,
              height: `${Math.max(4, strength * 100)}%`,
              background: barColor,
              opacity: 0.85,
              borderTop: showDownbeats && isDownbeat
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
