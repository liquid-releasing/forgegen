// Analysis tab — read-only viewer of videoflow's sidecar output.
// Reflects the 5 refinement decisions in
// ../../forgegen/ANALYSIS_TAB_REFINEMENT.md:
//   1. waveform → beat-strength density bars (no synthetic envelope)
//   2. chapter strip → contentType only, drop Style/Tone
//   3. KPI strip → pre-generation stats only, no PRE/POST comparisons
//   4. drop _MODE_FROM_TAG mapping → consume phrases[].mode directly
//   5. confidence → overlay (dim chapters + ⚠ marker + provenance footer),
//      not a standalone card. Standalone card lives in FFP later.

import { useState } from 'react';
import ChapterStrip from '../components/analysis/ChapterStrip.jsx';
import KpiStrip from '../components/analysis/KpiStrip.jsx';
import CategoryCards, { CATEGORIES } from '../components/analysis/CategoryCards.jsx';
import { ActiveCardCanvas } from '../components/analysis/cards.jsx';
import ChapterFocusRow from '../components/analysis/ChapterFocusRow.jsx';
import BottomCharts from '../components/analysis/BottomCharts.jsx';
import BeatStrengthBars from '../components/analysis/BeatStrengthBars.jsx';
import {
  chapterColor,
  chapterDurationMs,
  lastProvenance,
  totalDurationMs,
} from '../lib/analysis.js';

function ProvenanceFooter({ sidecar }) {
  const prov = lastProvenance(sidecar);
  if (!prov) return null;
  return (
    <div
      style={{
        paddingTop: 12,
        borderTop: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--muted)',
        fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
        textAlign: 'center',
      }}
    >
      Last analyzed by {prov.writer} {prov.version} · {prov.timestamp}
    </div>
  );
}

function MainTimeline({ sidecar, focusedIdx, onFocus }) {
  const total = totalDurationMs(sidecar);
  // Below this fraction of total, the ribbon segment is too narrow for a
  // legible label — drop the text but keep the colored block + tooltip.
  const NAME_VISIBILITY_THRESHOLD = 0.04;
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 6,
        overflow: 'hidden',
      }}
    >
      <div style={{ background: 'var(--bg)', padding: 4, borderRadius: 4 }}>
        <BeatStrengthBars
          beatMap={sidecar.energy?.beat_map}
          height={120}
          color="#5b6cff"
          showDownbeats
        />
      </div>
      {/* Chapter ribbon below bars — proportional to time, labels drop on narrow segments */}
      <div style={{ display: 'flex', height: 22, gap: 0, marginTop: 4, minWidth: 0 }}>
        {sidecar.chapters.map((c, i) => {
          const flex = chapterDurationMs(c) / total;
          const focused = i === focusedIdx;
          const showLabel = flex >= NAME_VISIBILITY_THRESHOLD;
          const label = c.name || `Chapter ${i + 1}`;
          return (
            <div
              key={i}
              onClick={() => onFocus(i)}
              title={label}
              style={{
                flex,
                minWidth: 0,
                background: focused
                  ? chapterColor(c)
                  : `color-mix(in srgb, ${chapterColor(c)} 65%, transparent)`,
                borderTop: focused ? '2px solid var(--fg)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.95)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {showLabel ? label : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Analysis({ sidecar, onContinue }) {
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [category, setCategory] = useState('structure');

  if (!sidecar) {
    return (
      <section className="tab-panel">
        <h2>Analysis</h2>
        <div style={{ color: 'var(--muted)', maxWidth: 540, lineHeight: 1.5 }}>
          No sidecar loaded yet. Switch to the{' '}
          <strong style={{ color: 'var(--fg)' }}>Project</strong> tab and click{' '}
          <em>Load test data</em>, then come back here.
        </div>
      </section>
    );
  }

  const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  return (
    <section className="tab-panel" style={{ padding: 0, border: 'none', background: 'transparent' }}>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* 1. Page promise */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: 6,
            padding: '12px 16px',
            fontSize: 13,
            color: 'var(--muted)',
            lineHeight: 1.55,
          }}
        >
          <span style={{ color: 'var(--fg)', fontWeight: 600 }}>Analysis</span>
          {' — '}
          Reads the structure of the audio and generates against that structure — so a
          long scene that opens ambient and ends music-driven feels like both, not like
          the average of them.
        </div>

        {/* 2. Chapter strip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Script overview · click a chapter to focus
          </div>
          <ChapterStrip sidecar={sidecar} focusedIdx={focusedIdx} onFocus={setFocusedIdx} />
        </div>

        {/* 3. Big timeline (beat-strength bars + chapter ribbon) */}
        <MainTimeline sidecar={sidecar} focusedIdx={focusedIdx} onFocus={setFocusedIdx} />

        {/* 4. KPI strip — pre-generation stats only */}
        <KpiStrip sidecar={sidecar} />

        {/* 5 + 6. Tabbed analysis panel — CategoryCards = tabs, ActiveCardCanvas = body.
            Wrapped with gap:0 so they visually merge into one panel rather than two. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <CategoryCards sidecar={sidecar} active={category} onChange={setCategory} />
          <ActiveCardCanvas
            sidecar={sidecar}
            categoryId={category}
            headline={cat.headline}
            desc={cat.desc}
            label={cat.label}
          />
        </div>

        {/* 7. Per-chapter focus row */}
        <ChapterFocusRow sidecar={sidecar} focusedIdx={focusedIdx} onFocus={setFocusedIdx} />

        {/* 8. Bottom charts (beat energy + beat map) */}
        <BottomCharts sidecar={sidecar} />

        {/* 9. Generate CTA */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Looks right?
          </span>
          <button
            onClick={onContinue}
            title="Open Generate tab to author per-chapter recipes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 22px',
              background: 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: 8,
              color: '#0c0d10',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Generate funscript →
          </button>
        </div>

        {/* Provenance footer (Confidence overlay item per decision #5) */}
        <ProvenanceFooter sidecar={sidecar} />
      </div>
    </section>
  );
}
