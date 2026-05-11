// Per-chapter focus row — three columns:
//   left: chapter list rail (with confidence ⚠ overlay per decision #5)
//   middle: phrase detail (beat-strength bars + phrase boxes overlaid)
//   right: stats card

import {
  chapterColor,
  chapterDurationMs,
  contentTypeLabel,
  fmtTime,
  modeColor,
  modeLabel,
  phrasesIn,
  LOW_CONFIDENCE_THRESHOLD,
} from '../../lib/analysis.js';
import BeatStrengthBars from './BeatStrengthBars.jsx';

function ChapterListRail({ sidecar, focusedIdx, onFocus }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 2,
        }}
      >
        Chapters · {sidecar.chapters.length}
      </div>
      {sidecar.chapters.map((c, i) => {
        const focused = i === focusedIdx;
        const lowConf = c.confidence < LOW_CONFIDENCE_THRESHOLD;
        return (
          <button
            key={i}
            onClick={() => onFocus(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: focused ? 'var(--bg)' : 'var(--bg-elevated)',
              border: `1px solid ${focused ? chapterColor(c) : 'var(--border)'}`,
              borderLeft: `4px solid ${chapterColor(c)}`,
              borderRadius: 6,
              color: 'var(--fg)',
              fontFamily: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
              minWidth: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {c.name || `Chapter ${i + 1}`}
                {lowConf && (
                  <span
                    title={`low confidence (${(c.confidence * 100).toFixed(0)}%) — consider opening in FFP for review`}
                    style={{ color: 'var(--error)', fontSize: 11 }}
                  >
                    ⚠
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
                  marginTop: 2,
                }}
              >
                {fmtTime(c.at_ms)}–{fmtTime(c.end_ms)} · {phrasesIn(sidecar, i).length} phrases
              </div>
            </div>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 10.5,
                fontWeight: 700,
                background: `color-mix(in srgb, ${chapterColor(c)} 25%, var(--bg))`,
                color: chapterColor(c),
                border: `1px solid ${chapterColor(c)}`,
                textTransform: 'capitalize',
              }}
            >
              {contentTypeLabel(c.content_type)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChapterPhraseDetail({ sidecar, chapterIdx }) {
  const c = sidecar.chapters[chapterIdx];
  const phs = phrasesIn(sidecar, chapterIdx);
  const dur = chapterDurationMs(c);

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: 2,
            background: chapterColor(c),
          }}
        />
        <span style={{ fontWeight: 700, color: 'var(--fg)' }}>{c.name || `Chapter ${chapterIdx + 1}`}</span>
        <span
          style={{
            color: 'var(--muted)',
            fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
            fontSize: 11,
          }}
        >
          {fmtTime(c.at_ms)}–{fmtTime(c.end_ms)} · {phs.length} phrases
        </span>
      </div>

      {/* Beat-strength bars filtered to this chapter, with phrase boxes overlaid */}
      <div
        style={{
          position: 'relative',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
        }}
      >
        <BeatStrengthBars
          beatMap={sidecar.energy?.beat_map}
          startMs={c.at_ms}
          endMs={c.end_ms}
          height={120}
          color="#5b6cff"
          showDownbeats
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', padding: '6px 0' }}>
          {phs.map((p, i) => {
            const flex = (p.end_ms - p.at_ms) / dur;
            const c2 = modeColor(p.mode);
            return (
              <div
                key={i}
                title={`P${i + 1} · ${modeLabel(p.mode)}`}
                style={{
                  flex,
                  margin: '0 2px',
                  border: `1.5px solid ${c2}`,
                  borderRadius: 4,
                  position: 'relative',
                  background: `color-mix(in srgb, ${c2} 10%, transparent)`,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: -1,
                    left: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
                    color: c2,
                    background: 'var(--bg-elevated)',
                    padding: '0 4px',
                    borderRadius: 2,
                  }}
                >
                  P{i + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phrase mode strip */}
      <div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          Phrases
        </div>
        <div style={{ display: 'flex', height: 18, gap: 1 }}>
          {phs.map((p, i) => (
            <div
              key={i}
              title={`P${i + 1} · ${modeLabel(p.mode)}`}
              style={{
                flex: (p.end_ms - p.at_ms) / dur,
                background: modeColor(p.mode),
                borderRadius: 1.5,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, color }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 10,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: color || 'var(--fg)',
          textTransform: label === 'Content type' || label === 'Dominant mode' ? 'capitalize' : 'none',
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ChapterStatsCard({ sidecar, chapterIdx }) {
  const c = sidecar.chapters[chapterIdx];
  const phs = phrasesIn(sidecar, chapterIdx);
  const perCh = sidecar.energy?.per_chapter?.[chapterIdx];
  const dominantMode = (() => {
    const counts = {};
    phs.forEach((p) => (counts[p.mode] = (counts[p.mode] || 0) + 1));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || '—';
  })();

  // Beat-strength sparkline for this chapter
  const beatMap = sidecar.energy?.beat_map;
  const beatStrengths = [];
  if (beatMap?.times_ms?.length) {
    for (let i = 0; i < beatMap.times_ms.length; i++) {
      if (beatMap.times_ms[i] >= c.at_ms && beatMap.times_ms[i] < c.end_ms) {
        beatStrengths.push(beatMap.strengths[i] || 0);
      }
    }
  }
  const max = Math.max(0.001, ...beatStrengths);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Stat label="Phrases" value={String(phs.length)} />
      <Stat label="BPM" value={perCh?.bpm != null ? String(perCh.bpm) : '—'} />
      <Stat
        label="Content type"
        value={contentTypeLabel(c.content_type)}
        sub={c.content_type === 'music' ? 'strong beat' : 'low rhythmic content'}
      />
      <Stat label="Dominant mode" value={modeLabel(dominantMode)} color={modeColor(dominantMode)} />
      <Stat
        label="Confidence"
        value={`${Math.round(c.confidence * 100)}%`}
        sub={c.evidence}
      />
      {beatStrengths.length > 0 && (
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: 10,
          }}
        >
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
            Beat strength sparkline
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 36 }}>
            {beatStrengths.map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${(v / max) * 100}%`,
                  background: chapterColor(c),
                  borderRadius: 1,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChapterFocusRow({ sidecar, focusedIdx, onFocus }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 240px', gap: 12 }}>
      <ChapterListRail sidecar={sidecar} focusedIdx={focusedIdx} onFocus={onFocus} />
      <ChapterPhraseDetail sidecar={sidecar} chapterIdx={focusedIdx} />
      <ChapterStatsCard sidecar={sidecar} chapterIdx={focusedIdx} />
    </div>
  );
}
