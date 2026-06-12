import { useMemo, useState } from 'react';
import {
  SOURCES,
  buildMockVideoCandidate,
  buildSourceConfidence,
  normalizeChapters,
  sourceMix,
  sourceMixText,
  suggestSources,
} from '../lib/sourceEngine.js';
import { fmtTime } from '../lib/analysis.js';

function SourceBadge({ id }) {
  const meta = SOURCES[id] || SOURCES.audio;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 8px',
      borderRadius: 999,
      border: `1px solid ${meta.color}`,
      color: meta.color,
      fontSize: 11,
      fontWeight: 700,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: meta.color }} />
      {meta.label}
    </span>
  );
}

function MiniCurve({ actions, chapter, color, faded }) {
  const slice = (actions || []).filter((a) => a.at >= chapter.at_ms && a.at < chapter.end_ms);
  if (!slice.length) {
    return (
      <div style={{
        height: 52,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--muted)',
        fontSize: 11,
        border: '1px dashed var(--border)',
        borderRadius: 4,
      }}>
        no track
      </div>
    );
  }
  const points = slice.slice(0, 90).map((a) => {
    const x = ((a.at - chapter.at_ms) / Math.max(1, chapter.duration_ms)) * 100;
    const y = 100 - Math.max(0, Math.min(100, a.pos));
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{
      width: '100%',
      height: 52,
      display: 'block',
      opacity: faded ? 0.45 : 1,
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 4,
    }}>
      <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Confidence({ value, color }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--bg)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span style={{ width: 34, textAlign: 'right', fontSize: 11, color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' }}>
        {pct}%
      </span>
    </div>
  );
}

function CandidatePanel({ id, chapter, actions, conf, selected, suggested, disabled, onSelect }) {
  const meta = SOURCES[id];
  const why = id === 'video' ? conf.videoWhy : id === 'audio' ? conf.audioWhy : 'User-provided track.';
  const score = id === 'video' ? conf.video : id === 'audio' ? conf.audio : 1;
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      style={{
        flex: 1,
        minWidth: 180,
        textAlign: 'left',
        background: selected ? 'color-mix(in srgb, var(--bg-elevated) 74%, var(--accent))' : 'var(--bg-elevated)',
        color: 'var(--fg)',
        border: `1px solid ${selected ? meta.color : 'var(--border)'}`,
        borderRadius: 8,
        padding: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.48 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: 2, background: meta.color }} />
        <strong style={{ fontSize: 12 }}>{meta.label}</strong>
        {suggested && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 9,
            fontWeight: 800,
            color: '#0c0d10',
            background: 'var(--warning)',
            padding: '2px 6px',
            borderRadius: 3,
          }}>
            SUGGESTED
          </span>
        )}
        {selected && <span style={{ color: meta.color, fontWeight: 800 }}>✓</span>}
      </div>
      <MiniCurve actions={actions} chapter={chapter} color={meta.color} faded={!selected && !suggested} />
      <div style={{ marginTop: 8 }}>
        <Confidence value={score} color={meta.color} />
      </div>
      <p style={{ margin: '7px 0 0', minHeight: 32, fontSize: 11, lineHeight: 1.35, color: 'var(--muted)' }}>
        {disabled ? 'Run or import this source before selecting it.' : why}
      </p>
    </button>
  );
}

function Ribbon({ chapters, sources }) {
  const total = chapters.reduce((sum, c) => sum + c.duration_ms, 0) || 1;
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', height: 46 }}>
        {chapters.map((c, i) => {
          const src = sources[i] || 'audio';
          const changed = i > 0 && sources[i - 1] !== src;
          return (
            <div key={c.id} title={`${c.name} · ${SOURCES[src].label}`} style={{
              position: 'relative',
              flex: c.duration_ms / total,
              minWidth: 8,
              background: `color-mix(in srgb, ${SOURCES[src].color} 72%, var(--bg))`,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
            }}>
              {changed && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderLeft: '2px dashed var(--warning)' }} />}
              {SOURCES[src].short}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompareCard({ chapter, idx, candidates, conf, source, suggested, videoAnalyzed, imported, focused, onFocus, onSelect }) {
  return (
    <div onClick={() => onFocus(idx)} style={{
      background: 'var(--bg-elevated)',
      border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 8,
      padding: 12,
      boxShadow: focused ? '0 0 0 1px rgba(76,195,255,0.28)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--muted)', fontFamily: 'ui-monospace, monospace', fontWeight: 800 }}>
          {String(idx + 1).padStart(2, '0')}
        </span>
        <strong>{chapter.name}</strong>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{fmtTime(chapter.duration_ms)}</span>
        <span style={{ marginLeft: 'auto' }}><SourceBadge id={source} /></span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <CandidatePanel
          id="audio"
          chapter={chapter}
          actions={candidates.audio}
          conf={conf}
          selected={source === 'audio'}
          suggested={suggested === 'audio'}
          onSelect={() => onSelect(idx, 'audio')}
        />
        <CandidatePanel
          id="video"
          chapter={chapter}
          actions={candidates.video}
          conf={conf}
          selected={source === 'video'}
          suggested={suggested === 'video'}
          disabled={!videoAnalyzed}
          onSelect={() => onSelect(idx, 'video')}
        />
        <CandidatePanel
          id="imported"
          chapter={chapter}
          actions={candidates.imported}
          conf={conf}
          selected={source === 'imported'}
          suggested={false}
          disabled={!imported}
          onSelect={() => onSelect(idx, 'imported')}
        />
      </div>
    </div>
  );
}

function Inspector({ chapters, focusedIdx, sources, conf, onFocus, onSelect }) {
  const chapter = chapters[focusedIdx] || chapters[0];
  if (!chapter) return null;
  const src = sources[focusedIdx] || 'audio';
  return (
    <aside style={{
      width: 340,
      flexShrink: 0,
      background: 'var(--bg-elevated)',
      borderLeft: '1px solid var(--border)',
      padding: 16,
      overflow: 'auto',
    }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>
        Inspector · chapter {String(focusedIdx + 1).padStart(2, '0')}
      </div>
      <h3 style={{ margin: '8px 0 10px', fontSize: 18 }}>{chapter.name}</h3>
      <SourceBadge id={src} />
      <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
        {['audio', 'video'].map((id) => (
          <div key={id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, fontWeight: 700 }}>
              <span>{SOURCES[id].label}</span>
              <button onClick={() => onSelect(focusedIdx, id)} style={smallButtonStyle(src === id)}>
                Use
              </button>
            </div>
            <Confidence value={conf[focusedIdx]?.[id]} color={SOURCES[id].color} />
            <p style={{ color: 'var(--muted)', fontSize: 11, lineHeight: 1.4 }}>
              {id === 'audio' ? conf[focusedIdx]?.audioWhy : conf[focusedIdx]?.videoWhy}
            </p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18 }}>
        <div style={sectionLabel}>Jump to chapter</div>
        <div style={{ display: 'grid', gap: 5, marginTop: 8 }}>
          {chapters.map((c, i) => (
            <button key={c.id} onClick={() => onFocus(i)} style={{
              ...smallButtonStyle(i === focusedIdx),
              justifyContent: 'flex-start',
              color: i === focusedIdx ? '#0c0d10' : 'var(--fg)',
            }}>
              <span style={{ color: SOURCES[sources[i] || 'audio'].color }}>■</span>
              {String(i + 1).padStart(2, '0')} · {c.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

const sectionLabel = {
  fontSize: 10,
  fontWeight: 800,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

function smallButtonStyle(active) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 8px',
    borderRadius: 4,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--bg)',
    color: active ? '#0c0d10' : 'var(--muted)',
    fontFamily: 'inherit',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  };
}

export default function Sources({
  sidecar,
  sourceSelections,
  onSourceSelectionsChange,
  videoAnalyzed,
  onVideoAnalyzedChange,
  videoCandidate,
  onVideoCandidateChange,
  onContinue,
}) {
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const chapters = useMemo(() => normalizeChapters(sidecar), [sidecar]);
  const conf = useMemo(() => buildSourceConfidence(chapters, sidecar), [chapters, sidecar]);
  const suggested = useMemo(() => suggestSources(conf, videoAnalyzed), [conf, videoAnalyzed]);
  const audioCandidate = useMemo(() => buildMockVideoCandidate(chapters, conf).map((a, i) => ({
    ...a,
    pos: i % 2 === 0 ? Math.min(96, Math.max(4, a.pos + 7)) : Math.min(96, Math.max(4, a.pos - 7)),
  })), [chapters, conf]);
  const sources = sourceSelections?.length === chapters.length
    ? sourceSelections
    : chapters.map(() => 'audio');
  const candidates = {
    audio: audioCandidate,
    video: videoCandidate,
    imported: null,
  };

  if (!sidecar) {
    return (
      <section className="tab-panel">
        <h2>Sources</h2>
        <div style={{ color: 'var(--muted)' }}>Run Analysis before choosing generation sources.</div>
      </section>
    );
  }

  function updateSource(idx, src) {
    if (src === 'video' && !videoAnalyzed) return;
    if (src === 'imported') return;
    onSourceSelectionsChange?.(sources.map((s, i) => (i === idx ? src : s)));
  }

  async function analyzeVideo() {
    setAnalyzing(true);
    setProgress(0);
    for (let i = 1; i <= 10; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 90));
      setProgress(i / 10);
    }
    const candidate = buildMockVideoCandidate(chapters, conf);
    onVideoCandidateChange?.(candidate);
    onVideoAnalyzedChange?.(true);
    onSourceSelectionsChange?.(suggestSources(conf, true));
    setAnalyzing(false);
  }

  const mix = sourceMix(sources);
  const seamCount = sources.filter((s, i) => i > 0 && s !== sources[i - 1]).length;

  return (
    <section className="tab-panel" style={{ padding: 0, border: 'none', background: 'transparent' }}>
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <main style={{ flex: 1, minWidth: 0, padding: 22, overflow: 'auto' }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: 6,
            padding: '12px 16px',
            color: 'var(--muted)',
            lineHeight: 1.55,
            marginBottom: 16,
          }}>
            <strong style={{ color: 'var(--fg)' }}>Sources</strong>
            {' — '}
            choose the motion source per chapter. Audio chapters use ForgeGen recipes; video chapters use the video candidate and are stitched into the final output.
          </div>

          {!videoAnalyzed && (
            <div style={{
              background: 'color-mix(in srgb, var(--bg-elevated) 78%, var(--source-video, #4dabf7))',
              border: '1px solid var(--source-video, #4dabf7)',
              borderRadius: 8,
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 16,
            }}>
              <div style={{ flex: 1 }}>
                <strong>{analyzing ? 'Analyzing video motion…' : 'Only audio is available so far'}</strong>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                  This milestone uses a deterministic mock video track so source selection changes the generated funscript while the real CV provider is still pending.
                </div>
                {analyzing && (
                  <div style={{ height: 5, background: 'var(--bg)', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(progress * 100)}%`, height: '100%', background: 'var(--source-video, #4dabf7)' }} />
                  </div>
                )}
              </div>
              <button onClick={analyzeVideo} disabled={analyzing} style={smallButtonStyle(true)}>
                {analyzing ? 'Working…' : 'Analyze video motion'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={sectionLabel}>Source mix ribbon</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>
              {sourceMixText(sources)} · {seamCount} seam{seamCount === 1 ? '' : 's'}
            </div>
          </div>
          <Ribbon chapters={chapters} sources={sources} />

          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            margin: '14px 0',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 10,
          }}>
            <span style={sectionLabel}>Set all</span>
            <button style={smallButtonStyle(false)} onClick={() => onSourceSelectionsChange?.(suggested)}>Use suggested</button>
            <button style={smallButtonStyle(false)} onClick={() => onSourceSelectionsChange?.(chapters.map(() => 'audio'))}>All audio</button>
            <button style={smallButtonStyle(false)} disabled={!videoAnalyzed} onClick={() => onSourceSelectionsChange?.(chapters.map(() => 'video'))}>All video</button>
            <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>
              {mix.audio} audio · {mix.video} video · {mix.imported} imported
            </span>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {chapters.map((chapter, idx) => (
              <CompareCard
                key={chapter.id}
                chapter={chapter}
                idx={idx}
                candidates={candidates}
                conf={conf[idx]}
                source={sources[idx] || 'audio'}
                suggested={suggested[idx]}
                videoAnalyzed={videoAnalyzed}
                imported={null}
                focused={idx === focusedIdx}
                onFocus={setFocusedIdx}
                onSelect={updateSource}
              />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button onClick={onContinue} style={{
              padding: '12px 22px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: '#0c0d10',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
            }}>
              Lock sources and continue →
            </button>
          </div>
        </main>
        <Inspector
          chapters={chapters}
          focusedIdx={focusedIdx}
          sources={sources}
          conf={conf}
          onFocus={setFocusedIdx}
          onSelect={updateSource}
        />
      </div>
    </section>
  );
}

