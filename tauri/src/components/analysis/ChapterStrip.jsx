// ChapterStrip — top-of-page chapter ribbon. Per refinement decision #2:
// drop Style/Tone labels, show contentType only. Per decision #5:
// dim low-confidence chapters as the Confidence overlay (in lieu of a
// standalone Confidence card in forgegen).

import {
  chapterColor,
  chapterDurationMs,
  contentTypeLabel,
  totalDurationMs,
  LOW_CONFIDENCE_THRESHOLD,
} from '../../lib/analysis.js';

export default function ChapterStrip({ sidecar, focusedIdx, onFocus }) {
  const total = totalDurationMs(sidecar);
  if (!total) return null;

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'stretch', flex: 1, minWidth: 0 }}>
      {sidecar.chapters.map((c, i) => {
        const dur = chapterDurationMs(c);
        const flex = dur / total;
        const focused = i === focusedIdx;
        const color = chapterColor(c);
        const lowConf = c.confidence < LOW_CONFIDENCE_THRESHOLD;
        // Confidence overlay (decision #5): dim chapters by confidence
        const opacity = 0.55 + 0.45 * Math.min(1, Math.max(0, c.confidence));
        return (
          <button
            key={i}
            onClick={() => onFocus(i)}
            title={
              `${c.name || 'chapter'}\n` +
              `${contentTypeLabel(c.content_type)} · confidence ${(c.confidence * 100).toFixed(0)}%` +
              (lowConf ? '\n⚠ low confidence — would benefit from FFP review' : '')
            }
            style={{
              flex,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 4,
              padding: '12px 14px',
              background: focused
                ? color
                : `color-mix(in srgb, ${color} 50%, var(--bg-elevated))`,
              opacity: focused ? 1 : opacity,
              border: `1.5px solid ${focused ? 'var(--fg)' : 'transparent'}`,
              borderRadius: 6,
              color: focused ? '#0c0d10' : 'rgba(255,255,255,0.92)',
              fontFamily: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
              minWidth: 0,
              overflow: 'hidden',
              transition: 'opacity 120ms, background 120ms',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {c.name || `Chapter ${i + 1}`}
              {lowConf && (
                <span
                  aria-label="low confidence"
                  style={{ fontSize: 11, opacity: 0.95 }}
                >
                  ⚠
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                opacity: 0.85,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              {contentTypeLabel(c.content_type)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
