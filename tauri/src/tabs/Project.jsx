import { useMemo } from 'react';
import { fmtTime, totalDurationMs, totalBeats, downbeatCount, lastProvenance } from '../lib/analysis.js';

const VIDEO_EXTS = new Set(['mp4', 'mkv', 'mov', 'webm', 'avi', 'wmv', 'm4v']);

function basename(path) {
  if (!path) return '';
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(i + 1) : path;
}

function dirname(path) {
  if (!path) return '';
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(0, i) : '';
}

function stem(path) {
  return basename(path).replace(/\.[^.]+$/, '');
}

function kindFor(path) {
  const ext = String(path || '').split('.').pop()?.toLowerCase();
  return VIDEO_EXTS.has(ext) ? 'video' : 'audio';
}

function timeAgo(unixSec) {
  if (!unixSec) return '';
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - unixSec));
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(unixSec * 1000).toLocaleDateString();
}

function RailButton({ children, primary, ...props }) {
  return (
    <button
      {...props}
      style={{
        width: '100%',
        padding: '9px 11px',
        borderRadius: 8,
        border: `1px solid ${primary ? 'var(--accent)' : 'var(--border)'}`,
        background: primary ? 'var(--accent)' : 'var(--surface-2)',
        color: primary ? '#fff' : 'var(--text)',
        fontWeight: 750,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.5 : 1,
        textAlign: 'left',
      }}
    >
      {children}
    </button>
  );
}

function RecentRail({ recents, activePath, busy, onPickMedia, onOpenMedia, onRemoveRecent }) {
  return (
    <aside className="fg-project-rail">
      <div className="fg-rail-section">
        <div className="fg-rail-label">Start a project</div>
        <RailButton primary onClick={onPickMedia} disabled={!!busy}>Open media file...</RailButton>
      </div>
      <div className="fg-rail-section" style={{ minHeight: 0, flex: 1 }}>
        <div className="fg-rail-label">Session recents</div>
        <div className="fg-rail-list">
          {recents.length === 0 && (
            <div className="fg-rail-empty">Opened media projects appear here for quick switching.</div>
          )}
          {recents.map((item) => {
            const active = item.path === activePath;
            return (
              <div key={item.path} className={`fg-rail-row ${active ? 'active' : ''}`}>
                <button
                  onClick={() => onOpenMedia(item.path, { switchTo: 'project' })}
                  disabled={!!busy || !item.exists}
                  title={item.path}
                >
                  <span>{basename(item.path)}</span>
                  <small>{item.exists ? `${kindFor(item.path)} · ${timeAgo(item.added_at)}` : 'missing'}</small>
                </button>
                <button
                  className="fg-rail-remove"
                  onClick={() => onRemoveRecent(item.path)}
                  disabled={!!busy}
                  title="Remove recent"
                >
                  x
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function EmptyProject({ onPickMedia }) {
  return (
    <div className="fg-project-empty">
      <h2>Project</h2>
      <p>Open a raw audio or video file from Library. ForgeGen will attach analysis sidecars and generated funscripts to that media.</p>
      <button className="fg-button-primary" onClick={onPickMedia}>Open media file...</button>
    </div>
  );
}

function ProjectFiles({ mediaPath, sidecar }) {
  const base = stem(mediaPath);
  const folder = dirname(mediaPath);
  const rows = [
    { label: 'Source media', value: basename(mediaPath), status: 'present' },
    { label: 'Chapter sidecar', value: `${base}.chapters.json`, status: sidecar ? 'present' : 'missing' },
    { label: 'Generated funscript', value: `${base}.funscript`, status: 'output' },
    { label: 'Forge folder', value: `.${base}.forge`, status: 'derived' },
  ];
  return (
    <div className="fg-panel">
      <div className="fg-panel-title">Files in this project</div>
      <div className="fg-file-list">
        {rows.map((row) => (
          <div key={row.label} className="fg-file-row">
            <div>
              <strong>{row.label}</strong>
              <span>{row.value}</span>
            </div>
            <em data-status={row.status}>{row.status}</em>
          </div>
        ))}
      </div>
      <div className="fg-folder-line">{folder || 'local folder'}</div>
    </div>
  );
}

function AnalysisSummary({ sidecar }) {
  if (!sidecar) {
    return (
      <div className="fg-panel">
        <div className="fg-panel-title">Analysis</div>
        <p className="fg-muted">No chapter sidecar is loaded yet. Continue to Analysis to run videoflow auto-chapter.</p>
      </div>
    );
  }
  const prov = lastProvenance(sidecar);
  return (
    <div className="fg-panel">
      <div className="fg-panel-title">Analysis sidecar</div>
      <div className="fg-kpi-grid">
        <div><strong>{sidecar.chapters?.length || 0}</strong><span>chapters</span></div>
        <div><strong>{sidecar.phrases?.length || 0}</strong><span>phrases</span></div>
        <div><strong>{totalBeats(sidecar)}</strong><span>beats</span></div>
        <div><strong>{downbeatCount(sidecar)}</strong><span>downbeats</span></div>
        <div><strong>{fmtTime(totalDurationMs(sidecar))}</strong><span>duration</span></div>
      </div>
      {prov && <p className="fg-muted">Last analyzed by {prov.writer} {prov.version}</p>}
    </div>
  );
}

export default function Project({
  mediaPath,
  openedProject,
  recents,
  sidecar,
  busy,
  onOpenMedia,
  onPickMedia,
  onRemoveRecent,
  onSwitchToAnalysis,
  onForceAnalysis,
}) {
  const project = useMemo(() => {
    if (!mediaPath) return null;
    return {
      title: openedProject?.title || stem(mediaPath),
      filename: basename(mediaPath),
      kind: kindFor(mediaPath),
      path: mediaPath,
    };
  }, [mediaPath, openedProject]);

  return (
    <section className="fg-project-shell">
      <RecentRail
        recents={recents}
        activePath={mediaPath}
        busy={busy}
        onPickMedia={onPickMedia}
        onOpenMedia={onOpenMedia}
        onRemoveRecent={onRemoveRecent}
      />
      <main className="fg-project-main">
        {!project ? (
          <EmptyProject onPickMedia={onPickMedia} />
        ) : (
          <>
            <header className="fg-page-header">
              <div>
                <div className="fg-eyebrow">Project</div>
                <h2>{project.title}</h2>
                <p>{project.kind} media · <code>{project.filename}</code></p>
              </div>
              <div className="fg-header-actions">
                <button className="fg-button-secondary" onClick={onPickMedia} disabled={!!busy}>Add or replace...</button>
                <button className="fg-button-primary" onClick={onSwitchToAnalysis} disabled={!!busy}>
                  {sidecar ? 'View Analysis' : 'Run Analysis'}
                </button>
              </div>
            </header>

            {busy && (
              <div className="fg-progress-banner">
                <span />
                <div>
                  <strong>{busy.message || 'Working...'}</strong>
                  {busy.detail && <code>{busy.detail}</code>}
                </div>
              </div>
            )}

            <div className="fg-project-layout">
              <div className="fg-project-primary">
                <div className="fg-panel fg-media-panel">
                  <div className="fg-panel-title">Source media</div>
                  <div className="fg-media-card">
                    <div className="fg-media-glyph">{project.kind === 'video' ? 'VIDEO' : 'AUDIO'}</div>
                    <div>
                      <h3>{project.filename}</h3>
                      <p>{project.path}</p>
                    </div>
                  </div>
                </div>
                <ProjectFiles mediaPath={mediaPath} sidecar={sidecar} />
              </div>
              <aside className="fg-project-inspector">
                <AnalysisSummary sidecar={sidecar} />
                <div className="fg-panel">
                  <div className="fg-panel-title">Next step</div>
                  <p className="fg-muted">
                    {sidecar
                      ? 'Analysis is ready. Sources remains in the pipeline for the later vision/comparison pass.'
                      : 'Run Analysis to create the chapter sidecar before selecting sources and recipes.'}
                  </p>
                  <div className="fg-stack">
                    <button className="fg-button-primary" onClick={onSwitchToAnalysis} disabled={!!busy}>
                      {sidecar ? 'Open Analysis' : 'Run Analysis'}
                    </button>
                    {sidecar && (
                      <button className="fg-button-secondary" onClick={onForceAnalysis} disabled={!!busy}>
                        Re-analyze
                      </button>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </section>
  );
}
