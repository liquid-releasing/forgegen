// KpiStrip — pre-generation stats only (decision #3). NO PRE/POST
// comparisons; those belong on Device/Export tabs once the funscript
// has been generated and device-profiled.

import {
  avgBpmWeighted,
  avgConfidence,
  bpmRange,
  downbeatCount,
  totalBeats,
} from '../../lib/analysis.js';

function Kpi({ label, value, sub }) {
  return (
    <div
      style={{
        flex: 1,
        padding: '14px 18px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
          color: 'var(--fg)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

export default function KpiStrip({ sidecar }) {
  const chapters = sidecar?.chapters?.length ?? 0;
  const phrases = sidecar?.phrases?.length ?? 0;
  const beats = totalBeats(sidecar);
  const downbeats = downbeatCount(sidecar);
  const avgBpm = avgBpmWeighted(sidecar);
  const range = bpmRange(sidecar);
  const conf = avgConfidence(sidecar);

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Kpi label="Chapters" value={String(chapters)} />
      <Kpi label="Phrases" value={String(phrases)} sub={`${(phrases / Math.max(1, chapters)).toFixed(1)}/ch`} />
      <Kpi label="Total beats" value={beats.toLocaleString()} />
      <Kpi label="Downbeats" value={downbeats.toLocaleString()} sub="every 4th beat (4/4)" />
      <Kpi label="Avg BPM" value={avgBpm != null ? String(avgBpm) : '—'} sub="weighted by chapter duration" />
      <Kpi
        label="BPM range"
        value={range ? `${range.min}–${range.max}` : '—'}
        sub="across chapters"
      />
      <Kpi
        label="Avg confidence"
        value={conf != null ? `${Math.round(conf * 100)}%` : '—'}
        sub={`across ${chapters} ch`}
      />
    </div>
  );
}
