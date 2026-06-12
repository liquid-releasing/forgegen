import {
  chapterDurationMs,
  contentTypeColor,
  contentTypeLabel,
  fmtTime,
} from '../../lib/analysis.js';
import { exceedsHeadroom } from '../../lib/targets.js';

export const STYLE_OPTIONS = [
  { value: 'percussive', label: 'Percussive - drums lead' },
  { value: 'full', label: 'Full mix - vocals + melody' },
];

export const DENSITY_OPTIONS = [
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '4', label: '4x' },
  { value: '8', label: '8x' },
];

export const SHAPE_OPTIONS = [
  { value: 'flat', label: 'Flat' },
  { value: 'rise', label: 'Rise' },
  { value: 'fall', label: 'Fall' },
  { value: 'auto', label: 'Auto' },
];

export const DEFAULT_RECIPE = {
  style: 'percussive',
  density: '1',
  shape: 'flat',
  emphasize_beats: false,
};

const cellStyle = {
  padding: '10px',
  borderBottom: '1px solid var(--border)',
  fontSize: 12,
  verticalAlign: 'top',
};

const headStyle = {
  ...cellStyle,
  fontSize: 10,
  fontWeight: 800,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: 1,
  textAlign: 'left',
  background: 'var(--bg)',
};

function ChapterCell({ chapter, idx }) {
  const dur = chapterDurationMs(chapter);
  const ct = chapter.content_type;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ color: 'var(--fg)', fontWeight: 700 }}>
        {chapter.name || `Chapter ${idx + 1}`}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: contentTypeColor(ct) }} />
        <span style={{ color: 'var(--muted)' }}>{contentTypeLabel(ct)}</span>
        <span style={{ color: 'var(--muted)' }}>·</span>
        <span style={{ color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' }}>{fmtTime(dur)}</span>
      </div>
    </div>
  );
}

const DENSITY_COUNTS = { 1: 5, 2: 9, 4: 17, 8: 33 };

function proposedScript(density, shape) {
  const count = DENSITY_COUNTS[density] || DENSITY_COUNTS['1'];
  const actions = [];
  for (let i = 0; i < count; i += 1) {
    const frac = i / Math.max(1, count - 1);
    const low = shape === 'rise'
      ? 0 + frac * 12
      : shape === 'fall'
        ? 28 - frac * 18
        : shape === 'auto'
          ? 8 + Math.max(0, Math.sin(frac * Math.PI * 2)) * 18
          : 8;
    const high = shape === 'rise'
      ? 44 + frac * 34
      : shape === 'fall'
        ? 82 - frac * 32
        : shape === 'auto'
          ? 48 + Math.max(0, Math.cos(frac * Math.PI * 2)) * 26
          : 58;
    actions.push({
      at: Math.round(frac * 4000),
      pos: Math.round(Math.max(0, Math.min(100, i % 2 === 0 ? low : high))),
    });
  }
  return actions;
}

function RecipePreview({
  density,
  shape,
  muted = false,
  color = 'var(--accent)',
  height = 40,
  axes = false,
}) {
  const actions = proposedScript(density, shape);
  const maxAt = actions.at(-1)?.at || 4000;
  const pts = actions.map((a) => `${((a.at / maxAt) * 100).toFixed(1)},${(100 - a.pos).toFixed(1)}`);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{
      width: '100%',
      height,
      display: 'block',
      opacity: muted ? 0.38 : 1,
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 5,
    }}>
      {axes && (
        <>
          <line x1="0" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.18)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.18)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.12)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </>
      )}
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function OptionCards({ options, value, onChange, columns = 2, warningFor }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 6 }}>
      {options.map((o) => {
        const active = value === o.value;
        const warning = warningFor?.(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.label}
            style={{
              padding: '7px 8px',
              minHeight: 34,
              borderRadius: 5,
              border: `1px solid ${warning ? 'var(--warning)' : active ? 'var(--accent)' : 'var(--border)'}`,
              background: active ? 'var(--accent-glow-soft)' : 'var(--bg)',
              color: active ? 'var(--fg)' : 'var(--muted)',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: active ? 800 : 650,
              cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function VisualRecipeButtons({
  kind,
  options,
  value,
  onChange,
  density,
  shape,
  columns = 4,
  warningFor,
}) {
  const previewUrlFor = (optionValue) => {
    if (kind === 'density') return `/strip_preview/density_${optionValue}.png`;
    if (kind === 'shape') return `/strip_preview/tone_${optionValue}.png`;
    return null;
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 6 }}>
      {options.map((o) => {
        const active = value === o.value;
        const warning = warningFor?.(o.value);
        const previewDensity = kind === 'density' ? o.value : (density || '1');
        const previewShape = kind === 'shape' ? o.value : (shape || 'flat');
        const previewUrl = previewUrlFor(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={`${o.label} ${kind}`}
            style={{
              padding: 6,
              minHeight: 70,
              borderRadius: 5,
              border: `1px solid ${warning ? 'var(--warning)' : active ? 'var(--accent)' : 'var(--border)'}`,
              background: active ? 'var(--accent-glow-soft)' : 'var(--bg)',
              color: active ? 'var(--fg)' : 'var(--muted)',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: active ? 800 : 650,
              cursor: 'pointer',
              display: 'grid',
              gap: 5,
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                style={{
                  width: '100%',
                  height: 34,
                  objectFit: 'cover',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  opacity: active ? 1 : 0.78,
                  display: 'block',
                }}
              />
            ) : (
              <RecipePreview
                density={previewDensity}
                shape={previewShape}
                color={warning ? 'var(--warning)' : active ? 'var(--accent)' : 'rgba(230,232,238,0.72)'}
                height={34}
              />
            )}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SourceTrackMessage({ source }) {
  const label = source === 'video' ? 'Video CV' : 'Imported';
  const color = source === 'video' ? 'var(--source-video, #4dabf7)' : 'var(--source-imported, #c084fc)';
  return (
    <div style={{
      minHeight: 86,
      border: `1px solid ${color}`,
      borderRadius: 6,
      padding: 10,
      background: 'var(--bg)',
      color: 'var(--muted)',
      lineHeight: 1.4,
    }}>
      <strong style={{ color }}>{label}</strong>
      <div style={{ marginTop: 4 }}>
        Audio recipe controls are skipped for this chapter; generation stitches the selected source track here.
      </div>
    </div>
  );
}

export default function PerChapterForm({
  chapters,
  perChapter,
  recipes,
  onChange,
  target,
  sourceSelections = [],
}) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 38 }} />
          <col style={{ width: '21%' }} />
          <col style={{ width: 62 }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '19%' }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th style={headStyle}>#</th>
            <th style={headStyle}>Chapter</th>
            <th style={{ ...headStyle, textAlign: 'right' }}>BPM</th>
            <th style={headStyle}>Audio mix</th>
            <th style={headStyle}>Density</th>
            <th style={headStyle}>Shape</th>
            <th style={headStyle}>Preview</th>
          </tr>
        </thead>
        <tbody>
          {chapters.map((c, i) => {
            const bpm = perChapter?.[i]?.bpm;
            const r = recipes[i] || DEFAULT_RECIPE;
            const selectedSource = sourceSelections[i] || 'audio';
            const activeAudio = selectedSource === 'audio';
            return (
              <tr key={i} style={{ opacity: activeAudio ? 1 : 0.72 }}>
                <td style={{ ...cellStyle, color: 'var(--muted)', fontFamily: 'ui-monospace, monospace', textAlign: 'center' }}>
                  {i + 1}
                </td>
                <td style={cellStyle}>
                  <ChapterCell chapter={c} idx={i} />
                </td>
                <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'ui-monospace, monospace', color: bpm != null ? 'var(--fg)' : 'var(--muted)' }}>
                  {bpm != null ? bpm : '-'}
                </td>
                <td style={cellStyle}>
                  {activeAudio ? (
                    <OptionCards
                      options={STYLE_OPTIONS}
                      value={r.style}
                      onChange={(style) => onChange(i, { ...r, style })}
                      columns={1}
                    />
                  ) : (
                    <SourceTrackMessage source={selectedSource} />
                  )}
                </td>
                <td style={cellStyle}>
                  {activeAudio ? (
                    <VisualRecipeButtons
                      kind="density"
                      options={DENSITY_OPTIONS}
                      value={r.density}
                      onChange={(density) => onChange(i, { ...r, density })}
                      density={r.density}
                      shape={r.shape}
                      columns={4}
                      warningFor={(density) => exceedsHeadroom(target, density)}
                    />
                  ) : (
                    <RecipePreview density="2" shape="auto" muted color={selectedSource === 'video' ? 'var(--source-video, #4dabf7)' : 'var(--source-imported, #c084fc)'} />
                  )}
                </td>
                <td style={cellStyle}>
                  {activeAudio ? (
                    <VisualRecipeButtons
                      kind="shape"
                      options={SHAPE_OPTIONS}
                      value={r.shape}
                      onChange={(shape) => onChange(i, { ...r, shape })}
                      density={r.density}
                      shape={r.shape}
                      columns={4}
                    />
                  ) : (
                    <div style={{ color: 'var(--muted)', fontSize: 11, lineHeight: 1.4 }}>
                      Source-selected chapters preview the source track instead of audio recipe shape.
                    </div>
                  )}
                </td>
                <td style={cellStyle}>
                  <RecipePreview
                    density={r.density}
                    shape={r.shape}
                    muted={!activeAudio}
                    color={activeAudio ? 'var(--accent)' : selectedSource === 'video' ? 'var(--source-video, #4dabf7)' : 'var(--source-imported, #c084fc)'}
                    height={58}
                    axes
                  />
                  {activeAudio && (
                    <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginTop: 7, color: 'var(--muted)', fontSize: 11 }}>
                      <input
                        type="checkbox"
                        checked={!!r.emphasize_beats}
                        onChange={(e) => onChange(i, { ...r, emphasize_beats: e.target.checked })}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                      emphasize downbeats
                    </label>
                  )}
                  {activeAudio && exceedsHeadroom(target, r.density) && (
                    <div style={{ marginTop: 6, color: 'var(--warning)', fontSize: 11 }}>
                      Exceeds {target.label} headroom.
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
