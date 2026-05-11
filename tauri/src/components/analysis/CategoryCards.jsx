// CategoryCards — 4-card selector for Analysis (decision #5: Confidence
// is overlay, not its own card in forgegen).

import { totalBeats, downbeatCount, avgBpmWeighted, bpmRange } from '../../lib/analysis.js';

const CATEGORIES = [
  {
    id: 'structure',
    label: 'Structure',
    icon: '▰',
    headline: 'How is the file divided?',
    desc:
      "Long-form material has natural breaks — silence, scene shifts, mood changes. videoflow detects these and snaps each chapter boundary to the nearest pause.",
    statFn: (sidecar) => `${sidecar.chapters?.length ?? 0} chapters`,
  },
  {
    id: 'phrases',
    label: 'Phrases',
    icon: '♬',
    headline: 'What happens within each section?',
    desc:
      "Inside each chapter we identify musical phrases (~16-beat units) and label each with one of six modes — tease, steady, edging, break, fast, slow. Modes are computed relative to the chapter's own context.",
    statFn: (sidecar) => `${sidecar.phrases?.length ?? 0} phrases`,
  },
  {
    id: 'energy',
    label: 'Energy',
    icon: '∿',
    headline: 'How does the audio breathe?',
    desc:
      "Per-beat energy bars plus the file-wide and per-chapter percentile distribution. Surfaces amplitude dynamics — how loud the loud parts are and how quiet the quiet parts are.",
    statFn: (sidecar) => `${totalBeats(sidecar)} beats sampled`,
  },
  {
    id: 'beats',
    label: 'Beats',
    icon: '▎',
    headline: 'What is the rhythmic foundation?',
    desc:
      "Beats binned to ~5s windows give a density signal complementary to energy. BPM is computed per chapter, not as one global average. Downbeats marked.",
    statFn: (sidecar) => {
      const r = bpmRange(sidecar);
      const avg = avgBpmWeighted(sidecar);
      const db = downbeatCount(sidecar);
      if (!r) return `${db} downbeats`;
      return `${r.min}–${r.max} BPM · ${db} downbeats`;
    },
  },
];

export { CATEGORIES };

export default function CategoryCards({ sidecar, active, onChange }) {
  const last = CATEGORIES.length - 1;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
      {CATEGORIES.map((c, idx) => {
        const isActive = c.id === active;
        const isFirst = idx === 0;
        const isLast = idx === last;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
              padding: '12px 14px',
              // bg matches canvas on active so the tab "merges" into the panel below
              background: isActive ? 'var(--bg-elevated)' : 'var(--bg)',
              // top accent on active; matched-height transparent border keeps inactive
              // tabs at the same vertical position
              borderTop: `2.5px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              // sides — only first tab has a left border; right border on every tab
              // produces single-line dividers between tabs
              borderLeft: isFirst ? '1px solid var(--border)' : 'none',
              borderRight: '1px solid var(--border)',
              // inactive tabs share the canvas top-border line; active has no bottom
              // border AND extends down 1px (marginBottom) to break that line
              borderBottom: isActive ? 'none' : '1px solid var(--border)',
              borderTopLeftRadius: isFirst ? 8 : 0,
              borderTopRightRadius: isLast ? 8 : 0,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              marginBottom: isActive ? -1 : 0,
              position: 'relative',
              zIndex: isActive ? 2 : 1,
              cursor: 'pointer',
              textAlign: 'left',
              color: 'var(--fg)',
              fontFamily: 'inherit',
              transition: 'background 120ms, border-color 120ms',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 14,
                  color: isActive ? 'var(--accent)' : 'var(--muted)',
                  width: 16,
                  display: 'inline-block',
                }}
              >
                {c.icon}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{c.label}</span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
              }}
            >
              {c.statFn(sidecar)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
