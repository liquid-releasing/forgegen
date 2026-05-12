// ProjectRail — left-side recents list for the Project tab.
//
// Modeled on FunscriptForge's ProjectTab left rail (see
// forge-ui-design/iterations/02-haptics/downloads/jsx/tab-Project.jsx). Each
// row shows a media-kind icon, filename, and a metadata line
// (duration · chapter count · time-ago). Click a row to ask the parent to
// load that path through the same sidecar-reuse / auto-chapter flow as the
// file picker.
//
// Per-recent metadata is read lazily from each path's `<stem>.chapters.json`
// sidecar — small JSON files, parallel reads, sub-100ms total for 8 entries
// on a hot cache. Caches in component state so rerenders don't re-read.
//
// Missing files (path no longer exists on disk) render greyed-out with an X
// to remove from the list.

import { useEffect, useMemo, useState } from 'react';
import { readSidecar } from '../../api/videoflow.js';
import { fmtTime, totalDurationMs } from '../../lib/analysis.js';

const VIDEO_EXTS = new Set(['mp4', 'mkv', 'mov', 'webm', 'avi', 'wmv', 'm4v']);

function basename(path) {
  if (!path) return '';
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(i + 1) : path;
}

function mediaKind(path) {
  const ext = (path.split('.').pop() || '').toLowerCase();
  return VIDEO_EXTS.has(ext) ? 'video' : 'audio';
}

function timeAgo(unixSec) {
  if (!unixSec) return '';
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - unixSec));
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(unixSec * 1000).toLocaleDateString();
}

/** Tiny SVG icons inline so we don't pull in a font library for two glyphs. */
function MediaIcon({ kind, size = 18 }) {
  if (kind === 'video') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
           strokeLinejoin="round" aria-hidden="true">
        <path d="M22 8l-6 4 6 4V8z" />
        <rect x="2" y="6" width="14" height="12" rx="2" ry="2" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
         strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function PlusIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round"
         strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function XIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
         strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

export default function ProjectRail({
  recents,
  activePath,
  onPick,
  onRecentClick,
  onRecentRemove,
  busy,
}) {
  // Per-path metadata cache. `null` = sidecar missing/unanalysed; absent =
  // not yet loaded. Each entry: { chapters, durationMs }.
  const [meta, setMeta] = useState({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      recents.map(async (r) => {
        if (!r.exists || meta[r.path] !== undefined) return null;
        try {
          const sidecar = await readSidecar(r.path);
          if (cancelled) return null;
          if (!sidecar) return [r.path, null];
          return [r.path, {
            chapters: sidecar.chapters?.length ?? 0,
            durationMs: totalDurationMs(sidecar),
          }];
        } catch {
          return [r.path, null];
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const updates = {};
      for (const r of results) {
        if (r) updates[r[0]] = r[1];
      }
      if (Object.keys(updates).length > 0) {
        setMeta((prev) => ({ ...prev, ...updates }));
      }
    });
    return () => { cancelled = true; };
  }, [recents]);

  const sorted = useMemo(
    () => [...recents].sort((a, b) => (b.added_at || 0) - (a.added_at || 0)),
    [recents],
  );

  return (
    <aside style={{
      width: 320,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface, #1a1d27)',
      borderRight: '1px solid var(--border)',
      minHeight: 0,
    }}>
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid var(--border)',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        Recent projects
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {sorted.length === 0 && (
          <div style={{
            padding: '20px 16px',
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1.5,
          }}>
            No recent projects yet. Open a media file to get started.
          </div>
        )}

        {sorted.map((r) => {
          const isActive = r.path === activePath;
          const m = meta[r.path]; // undefined = loading, null = no sidecar, obj = loaded
          const name = basename(r.path);
          const kind = mediaKind(r.path);
          return (
            <div
              key={r.path}
              style={{
                display: 'flex',
                width: '100%',
                borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                borderBottom: '1px solid var(--border)',
                background: isActive ? 'var(--bg)' : 'transparent',
                opacity: r.exists ? 1 : 0.5,
              }}
            >
              <button
                onClick={() => onRecentClick(r.path)}
                disabled={busy || !r.exists}
                title={r.exists ? r.path : `${r.path}\n(file moved or deleted)`}
                style={{
                  flex: 1,
                  display: 'flex',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--fg, #e5e7eb)',
                  cursor: busy || !r.exists ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  minWidth: 0,
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 5,
                  flexShrink: 0,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--muted)',
                }}>
                  <MediaIcon kind={kind} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5,
                    fontWeight: isActive ? 700 : 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {name}
                  </div>
                  <div style={{
                    fontSize: 10.5,
                    color: 'var(--muted)',
                    marginTop: 2,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}>
                    {!r.exists
                      ? 'missing'
                      : m === undefined
                        ? '…'
                        : m === null
                          ? 'needs analysis'
                          : `${fmtTime(m.durationMs)} · ${m.chapters} ch`}
                    {' · '}{timeAgo(r.added_at)}
                  </div>
                </div>
              </button>
              <button
                onClick={() => onRecentRemove(r.path)}
                disabled={busy}
                title="Remove from recents"
                aria-label={`Remove ${name} from recents`}
                style={{
                  width: 28,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  padding: '0 4px',
                  display: 'grid',
                  placeItems: 'center',
                  opacity: 0.5,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
              >
                <XIcon />
              </button>
            </div>
          );
        })}

        <button
          onClick={onPick}
          disabled={busy}
          style={{
            display: 'flex',
            gap: 10,
            width: '100%',
            padding: '14px 16px',
            background: 'transparent',
            border: 'none',
            borderLeft: '3px solid transparent',
            color: 'var(--accent)',
            cursor: busy ? 'wait' : 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
            fontSize: 12.5,
            fontWeight: 600,
            alignItems: 'center',
          }}
        >
          <PlusIcon />
          <span>Open new file…</span>
        </button>
      </div>
    </aside>
  );
}
