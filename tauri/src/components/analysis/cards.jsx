// The 4 active-card view components (Structure / Phrases / Energy / Beats).
// Confidence is no longer its own card — see ChapterStrip + ChapterFocusRow
// for the overlay treatment per decision #5.

import {
  PHRASE_MODES,
  CONTENT_TYPES,
  contentTypeColor,
  contentTypeLabel,
  modeColor,
  modeLabel,
  chapterColor,
  chapterDurationMs,
  totalDurationMs,
  totalBeats,
  downbeatCount,
} from '../../lib/analysis.js';
import BeatStrengthBars from './BeatStrengthBars.jsx';

export function StructureView({ sidecar }) {
  const total = totalDurationMs(sidecar);
  const typeCounts = {};
  sidecar.chapters.forEach((c) => {
    const dur = chapterDurationMs(c);
    typeCounts[c.content_type] = (typeCounts[c.content_type] || 0) + dur;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BeatStrengthBars
        beatMap={sidecar.energy?.beat_map}
        height={80}
        color="#5b6cff"
        background="var(--bg)"
      />
      {/* Content-type ribbon */}
      <div
        style={{
          display: 'flex',
          height: 26,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        {sidecar.chapters.map((c, i) => {
          const flex = chapterDurationMs(c) / total;
          return (
            <div
              key={i}
              style={{
                flex,
                background: contentTypeColor(c.content_type),
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                fontSize: 10.5,
                fontWeight: 700,
                color: 'rgba(0,0,0,0.85)',
                borderRight: '1px solid rgba(0,0,0,0.2)',
              }}
            >
              {contentTypeLabel(c.content_type)}
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 18,
          fontSize: 12,
          color: 'var(--muted)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {Object.entries(typeCounts).map(([k, v]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: contentTypeColor(k),
              }}
            />
            <span style={{ fontWeight: 700, color: 'var(--fg)' }}>{contentTypeLabel(k)}</span>
            <span style={{ fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace' }}>
              {Math.round((v / total) * 100)}%
            </span>
          </span>
        ))}
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
            color: 'var(--muted)',
          }}
        >
          avg duration {Math.round(total / sidecar.chapters.length / 1000)}s
        </span>
      </div>
    </div>
  );
}

export function PhrasesView({ sidecar }) {
  const total = totalDurationMs(sidecar);
  const phrases = sidecar.phrases || [];
  const modeCounts = {};
  phrases.forEach((p) => {
    modeCounts[p.mode] = (modeCounts[p.mode] || 0) + 1;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BeatStrengthBars
        beatMap={sidecar.energy?.beat_map}
        height={60}
        color="#5b6cff"
        background="var(--bg)"
      />
      {/* Phrase mode ribbon */}
      <div style={{ display: 'flex', height: 22, gap: 1 }}>
        {phrases.map((p, i) => {
          const flex = (p.end_ms - p.at_ms) / total;
          return (
            <div
              key={i}
              title={`${modeLabel(p.mode)} · ch ${p.chapter_idx + 1}`}
              style={{
                flex,
                background: modeColor(p.mode),
                borderRadius: 1.5,
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 14,
          fontSize: 12,
          color: 'var(--muted)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {Object.entries(PHRASE_MODES).map(([id, m]) => {
          const count = modeCounts[id] || 0;
          const pct = Math.round((count / Math.max(1, phrases.length)) * 100);
          return (
            <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: m.color }} />
              <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{m.label}</span>
              <span style={{ fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace' }}>
                {pct}%
              </span>
            </span>
          );
        })}
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
            color: 'var(--muted)',
          }}
        >
          {phrases.length} phrases · {(phrases.length / Math.max(1, sidecar.chapters.length)).toFixed(1)} per chapter
        </span>
      </div>
    </div>
  );
}

export function EnergyView({ sidecar }) {
  const pcts = sidecar.energy?.percentiles || {};
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BeatStrengthBars
        beatMap={sidecar.energy?.beat_map}
        height={110}
        color="#3ed598"
        background="var(--bg)"
      />
      <div
        style={{
          display: 'flex',
          gap: 18,
          fontSize: 12,
          color: 'var(--muted)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {['p5', 'p25', 'p50', 'p75', 'p95'].map((k) => (
          <span key={k}>
            <span style={{ fontWeight: 700, color: 'var(--fg)' }}>{k}</span>
            <span
              style={{
                marginLeft: 6,
                fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
              }}
            >
              {pcts[k] != null ? pcts[k].toFixed(2) : '—'}
            </span>
          </span>
        ))}
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
            color: 'var(--muted)',
          }}
        >
          file-wide percentiles · per-chapter percentiles in detail row
        </span>
      </div>
    </div>
  );
}

export function BeatsView({ sidecar }) {
  const total = totalDurationMs(sidecar);
  const perChapter = sidecar.energy?.per_chapter || {};
  const chapters = sidecar.chapters || [];
  // Heat strip: 5-second buckets weighted by mean strength × beat count
  const N = 96;
  const beatMap = sidecar.energy?.beat_map;
  const cells = new Array(N).fill(0);
  if (beatMap?.times_ms?.length) {
    for (let i = 0; i < beatMap.times_ms.length; i++) {
      const idx = Math.min(N - 1, Math.floor((beatMap.times_ms[i] / total) * N));
      cells[idx] += beatMap.strengths[i] || 0;
    }
    const max = Math.max(0.001, ...cells);
    for (let i = 0; i < N; i++) cells[i] /= max;
  }
  const heatColor = (v) => {
    if (v < 0.2) return '#1a2138';
    if (v < 0.4) return '#3a4d7c';
    if (v < 0.6) return '#5a7eb8';
    if (v < 0.8) return '#e8a35c';
    return '#ff5470';
  };

  const maxBpm = Math.max(1, ...Object.values(perChapter).map((v) => v.bpm || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          height: 28,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        {cells.map((v, i) => (
          <div key={i} style={{ flex: 1, background: heatColor(v) }} />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          height: 100,
        }}
      >
        {chapters.map((c, i) => {
          const flex = chapterDurationMs(c) / total;
          const bpm = perChapter[i]?.bpm;
          return (
            <div
              key={i}
              style={{
                flex,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
                  color: 'var(--fg)',
                }}
              >
                {bpm != null ? bpm : '—'}
              </span>
              <div
                style={{
                  width: '78%',
                  height: bpm != null ? `${(bpm / maxBpm) * 100}%` : '4%',
                  background: chapterColor(c),
                  borderRadius: 2,
                  opacity: bpm != null ? 1 : 0.3,
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>ch {i + 1}</span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 18,
          fontSize: 12,
          color: 'var(--muted)',
        }}
      >
        <span>
          <span style={{ fontWeight: 700, color: 'var(--fg)' }}>Total beats</span>
          <span
            style={{
              marginLeft: 6,
              fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
            }}
          >
            {totalBeats(sidecar).toLocaleString()}
          </span>
        </span>
        <span>
          <span style={{ fontWeight: 700, color: 'var(--fg)' }}>Downbeats</span>
          <span
            style={{
              marginLeft: 6,
              fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
            }}
          >
            {downbeatCount(sidecar).toLocaleString()}
          </span>
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
          heat: density × strength · 5s bins
        </span>
      </div>
    </div>
  );
}

export function ActiveCardCanvas({ sidecar, categoryId, headline, desc, label }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        // Top edge defined by the active CategoryCard tab; flatten our top corners
        // so we read as one tabbed panel together
        borderRadius: '0 0 10px 10px',
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          Analysis · {label}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--fg)',
            marginBottom: 8,
          }}
        >
          {headline}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--muted)',
            lineHeight: 1.55,
            maxWidth: 760,
          }}
        >
          {desc}
        </div>
      </div>
      {categoryId === 'structure' && <StructureView sidecar={sidecar} />}
      {categoryId === 'phrases' && <PhrasesView sidecar={sidecar} />}
      {categoryId === 'energy' && <EnergyView sidecar={sidecar} />}
      {categoryId === 'beats' && <BeatsView sidecar={sidecar} />}
    </div>
  );
}
