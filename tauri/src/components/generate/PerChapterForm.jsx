// PerChapterForm — one editable row per chapter.
//
// Columns: # · Chapter (name + content_type + duration) · BPM · Style ·
//          Density · Shape · Emphasize beats
//
// Style/Density/Shape/Emphasize map directly to videoflow `generate-funscript`
// flags via the bridge (see ../../api/videoflow.js → generateFunscript).
//
// v0.1 limitation: videoflow's CLI doesn't yet accept a per-chapter recipe
// bundle, so the Generate button only sends row 1's settings to the backend.
// Per-chapter recipe authoring is captured here so the UI is ready when
// videoflow grows the per-chapter knob (tracked in REFACTOR_TO_TAURI_REACT.md
// v0.2 milestone).

import {
  chapterDurationMs,
  contentTypeColor,
  contentTypeLabel,
  fmtTime,
} from '../../lib/analysis.js';

export const STYLE_OPTIONS = [
  { value: 'percussive', label: 'Percussive — drums lead' },
  { value: 'full', label: 'Full mix — vocals + melody' },
];

export const DENSITY_OPTIONS = [
  { value: 'half', label: '½ — one action per 2 beats' },
  { value: '1', label: '1 — one per beat' },
  { value: '2', label: '2 — two per beat' },
  { value: '4', label: '4 — four per beat' },
  { value: '8', label: '8 — eight per beat (climactic)' },
];

export const SHAPE_OPTIONS = [
  { value: 'flat', label: 'Flat — center 50' },
  { value: 'rise', label: 'Rise — 30→70 over chapter' },
  { value: 'fall', label: 'Fall — 70→30 over chapter' },
  { value: 'auto', label: 'Auto — per-phrase energy slope' },
];

export const DEFAULT_RECIPE = {
  style: 'percussive',
  density: 'half',
  shape: 'flat',
  emphasize_beats: false,
};

const cellStyle = {
  padding: '8px 10px',
  borderBottom: '1px solid var(--border)',
  fontSize: 12,
  verticalAlign: 'middle',
};

const headStyle = {
  ...cellStyle,
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: 1,
  textAlign: 'left',
  background: 'var(--bg)',
  borderBottom: '1px solid var(--border)',
};

const selectStyle = {
  width: '100%',
  padding: '5px 8px',
  background: 'var(--bg)',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  fontFamily: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
};

function ChapterCell({ chapter, idx }) {
  const dur = chapterDurationMs(chapter);
  const ct = chapter.content_type;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ color: 'var(--fg)', fontWeight: 600 }}>
        {chapter.name || `Chapter ${idx + 1}`}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11 }}>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: 2,
            background: contentTypeColor(ct),
          }}
        />
        <span style={{ color: 'var(--muted)' }}>{contentTypeLabel(ct)}</span>
        <span style={{ color: 'var(--muted)' }}>·</span>
        <span style={{ color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' }}>
          {fmtTime(dur)}
        </span>
      </div>
    </div>
  );
}

export default function PerChapterForm({
  chapters,
  perChapter,
  recipes,
  onChange,
}) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}
      >
        <colgroup>
          <col style={{ width: 36 }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: 60 }} />
          <col />
          <col />
          <col />
          <col style={{ width: 90 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={headStyle}>#</th>
            <th style={headStyle}>Chapter</th>
            <th style={{ ...headStyle, textAlign: 'right' }}>BPM</th>
            <th style={headStyle}>Style</th>
            <th style={headStyle}>Density</th>
            <th style={headStyle}>Shape</th>
            <th style={{ ...headStyle, textAlign: 'center' }}>Emphasize</th>
          </tr>
        </thead>
        <tbody>
          {chapters.map((c, i) => {
            const bpm = perChapter?.[i]?.bpm;
            const r = recipes[i] || DEFAULT_RECIPE;
            return (
              <tr key={i}>
                <td
                  style={{
                    ...cellStyle,
                    color: 'var(--muted)',
                    fontFamily: 'ui-monospace, monospace',
                    textAlign: 'center',
                  }}
                >
                  {i + 1}
                </td>
                <td style={cellStyle}>
                  <ChapterCell chapter={c} idx={i} />
                </td>
                <td
                  style={{
                    ...cellStyle,
                    textAlign: 'right',
                    fontFamily: 'ui-monospace, monospace',
                    color: bpm != null ? 'var(--fg)' : 'var(--muted)',
                  }}
                >
                  {bpm != null ? bpm : '—'}
                </td>
                <td style={cellStyle}>
                  <select
                    value={r.style}
                    onChange={(e) => onChange(i, { ...r, style: e.target.value })}
                    style={selectStyle}
                  >
                    {STYLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={cellStyle}>
                  <select
                    value={r.density}
                    onChange={(e) => onChange(i, { ...r, density: e.target.value })}
                    style={selectStyle}
                  >
                    {DENSITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={cellStyle}>
                  <select
                    value={r.shape}
                    onChange={(e) => onChange(i, { ...r, shape: e.target.value })}
                    style={selectStyle}
                  >
                    {SHAPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    title="Boost downbeats (CLI hookup pending — v0.2)"
                  >
                    <input
                      type="checkbox"
                      checked={!!r.emphasize_beats}
                      onChange={(e) =>
                        onChange(i, { ...r, emphasize_beats: e.target.checked })
                      }
                      style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                    />
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
