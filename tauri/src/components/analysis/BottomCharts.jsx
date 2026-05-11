// BottomCharts — Beat energy chart (bars colored by phrase mode) + Beat
// map heat strip. Always visible below the per-chapter focus row.

import { useMemo } from 'react';
import {
  modeColor,
  phraseIndexAt,
  totalDurationMs,
} from '../../lib/analysis.js';
import BeatStrengthBars from './BeatStrengthBars.jsx';

function BeatEnergyChart({ sidecar }) {
  const beatMap = sidecar.energy?.beat_map;
  const phrases = sidecar.phrases || [];

  // For each beat, find containing phrase → color by mode
  const colorAt = useMemo(() => {
    if (!beatMap?.times_ms?.length || !phrases.length) return null;
    return (idx) => {
      const t = beatMap.times_ms[idx];
      const pIdx = phraseIndexAt(phrases, t);
      if (pIdx < 0) return '#64748b';
      return modeColor(phrases[pIdx].mode);
    };
  }, [beatMap, phrases]);

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
          Beat energy — coloured by phrase mode
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          strength ∈ [0, 1] · time → right
        </span>
      </div>
      <div
        style={{
          height: 120,
          background: 'var(--bg)',
          padding: 4,
          border: '1px solid var(--border)',
          borderRadius: 4,
        }}
      >
        <BeatStrengthBars
          beatMap={beatMap}
          height={112}
          color="#64748b"
          colorAt={colorAt}
          showDownbeats
        />
      </div>
    </div>
  );
}

function BeatMap({ sidecar }) {
  const total = totalDurationMs(sidecar);
  const beatMap = sidecar.energy?.beat_map;
  const N = 96;
  const cells = useMemo(() => {
    const out = new Array(N).fill(0);
    if (!beatMap?.times_ms?.length || !total) return out;
    for (let i = 0; i < beatMap.times_ms.length; i++) {
      const idx = Math.min(N - 1, Math.floor((beatMap.times_ms[i] / total) * N));
      out[idx] += beatMap.strengths[i] || 0;
    }
    const max = Math.max(0.001, ...out);
    return out.map((v) => v / max);
  }, [beatMap, total]);

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>Beat map</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          density × strength · {N} buckets across full duration
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${N}, 1fr)`,
          gap: 1.5,
          height: 110,
          background: 'var(--bg)',
          padding: 4,
          borderRadius: 4,
          alignItems: 'end',
        }}
      >
        {cells.map((v, i) => {
          const hue = 360 - (i / N) * 300;
          return (
            <div
              key={i}
              style={{
                height: `${20 + v * 80}%`,
                background: `linear-gradient(to top, hsl(${hue}, 75%, 45%) 0%, hsl(${(hue + 30) % 360}, 80%, 60%) 100%)`,
                borderRadius: 1,
                boxShadow: `0 0 4px hsla(${hue}, 75%, 55%, ${v * 0.4})`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function BottomCharts({ sidecar }) {
  return (
    <>
      <BeatEnergyChart sidecar={sidecar} />
      <BeatMap sidecar={sidecar} />
    </>
  );
}
