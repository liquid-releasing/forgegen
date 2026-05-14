// DensityHistogram — rolling actions/sec chart over the funscript timeline.
//
// Samples N points across the duration; each sample counts how many actions
// fall in a small window centered on it, expressed as actions/sec. Renders
// as a filled SVG polyline. Chapter boundaries overlay as faint verticals
// so the user can see density transitions per chapter.

import { useMemo } from 'react';
import { chapterColor, fmtTime } from '../../lib/analysis.js';

const N_SAMPLES = 240;  // ~one sample every 2-4s on typical tracks
const WIDTH = 800;
const HEIGHT = 140;
const PAD_L = 36;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 22;

function rollingDensity(actions, durationMs, n) {
  if (!actions?.length || !durationMs) return new Array(n).fill(0);
  const windowMs = (2 * durationMs) / n;
  // Two-pointer sweep — O(n + actions).
  const samples = new Array(n).fill(0);
  let lo = 0;
  let hi = 0;
  for (let i = 0; i < n; i++) {
    const center = ((i + 0.5) / n) * durationMs;
    const start = center - windowMs / 2;
    const end = center + windowMs / 2;
    while (lo < actions.length && actions[lo].at < start) lo++;
    while (hi < actions.length && actions[hi].at < end) hi++;
    const count = hi - lo;
    samples[i] = count / (windowMs / 1000);
  }
  return samples;
}

export default function DensityHistogram({ funscript, sidecar }) {
  const actions = funscript?.actions || [];
  const durationMs =
    funscript?.metadata?.generated_from?.source?.duration_ms ||
    (actions.length ? actions[actions.length - 1].at : 0);

  const samples = useMemo(
    () => rollingDensity(actions, durationMs, N_SAMPLES),
    [actions, durationMs],
  );
  const maxDensity = useMemo(
    () => Math.max(0.5, ...samples),
    [samples],
  );
  const meanDensity =
    samples.length > 0
      ? samples.reduce((acc, v) => acc + v, 0) / samples.length
      : 0;

  // Map sample → polygon area below the line (closed at the bottom).
  const chartW = WIDTH - PAD_L - PAD_R;
  const chartH = HEIGHT - PAD_T - PAD_B;
  const xAt = (i) => PAD_L + ((i + 0.5) / N_SAMPLES) * chartW;
  const yAt = (v) => PAD_T + chartH - (v / maxDensity) * chartH;
  const points = samples.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
  const areaPoints = [
    `${PAD_L},${PAD_T + chartH}`,
    points,
    `${PAD_L + chartW},${PAD_T + chartH}`,
  ].join(' ');

  // Chapter boundaries (skip the first chapter's at_ms=0 — it's the axis).
  const chapters = sidecar?.chapters || [];
  const dividers = chapters
    .map((c, idx) => ({ ...c, idx }))
    .filter((c) => c.at_ms > 0 && c.at_ms < durationMs);

  // Y-axis tick labels (3 ticks: 0, mean, max).
  const yLabel = (v) => `${v.toFixed(1)}`;

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
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
          Action density — rolling actions/sec
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {actions.length.toLocaleString()} actions · mean {meanDensity.toFixed(2)}/s · peak {maxDensity.toFixed(2)}/s
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: HEIGHT,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          display: 'block',
        }}
      >
        {/* Chapter dividers (under the data line). */}
        {dividers.map((c) => {
          const x = PAD_L + (c.at_ms / durationMs) * chartW;
          return (
            <line
              key={c.idx}
              x1={x}
              y1={PAD_T}
              x2={x}
              y2={PAD_T + chartH}
              stroke={chapterColor(c)}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.55"
            />
          );
        })}

        {/* Mean line. */}
        <line
          x1={PAD_L}
          y1={yAt(meanDensity)}
          x2={PAD_L + chartW}
          y2={yAt(meanDensity)}
          stroke="var(--muted)"
          strokeWidth="1"
          strokeDasharray="2 4"
          opacity="0.5"
        />

        {/* Density area + line. */}
        <polygon points={areaPoints} fill="var(--accent)" opacity="0.18" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Y-axis tick labels. */}
        <text x={PAD_L - 6} y={yAt(0) + 4} fill="var(--muted)" fontSize="9" textAnchor="end">
          0
        </text>
        <text x={PAD_L - 6} y={yAt(meanDensity) + 4} fill="var(--muted)" fontSize="9" textAnchor="end">
          {yLabel(meanDensity)}
        </text>
        <text x={PAD_L - 6} y={yAt(maxDensity) + 4} fill="var(--muted)" fontSize="9" textAnchor="end">
          {yLabel(maxDensity)}
        </text>

        {/* X-axis time labels (start / mid / end). */}
        <text x={PAD_L} y={HEIGHT - 6} fill="var(--muted)" fontSize="9" textAnchor="start">
          {fmtTime(0)}
        </text>
        <text x={PAD_L + chartW / 2} y={HEIGHT - 6} fill="var(--muted)" fontSize="9" textAnchor="middle">
          {fmtTime(durationMs / 2)}
        </text>
        <text x={PAD_L + chartW} y={HEIGHT - 6} fill="var(--muted)" fontSize="9" textAnchor="end">
          {fmtTime(durationMs)}
        </text>
      </svg>
    </div>
  );
}
