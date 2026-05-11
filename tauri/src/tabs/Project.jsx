// Project tab — file-loading and bridge entry point.
//
// v0.1: hardcoded "Load test data" button calls autoChapter() to
// populate the shared sidecar state. In browser-only mode the mock
// returns a realistic 4-chapter / 30-phrase / 600-beat sidecar; in
// Tauri mode it tries to call videoflow auto-chapter on the path
// (which currently won't work without a real audio file).
//
// v0.2 (TODO): real file picker via Tauri dialog API; recents list;
// device selection (gates Stim/Multi-axis tabs in FFP — not in forgegen).

import { useState } from 'react';
import { autoChapter, isTauri } from '../api/videoflow.js';
import { fmtTime, totalDurationMs } from '../lib/analysis.js';

const TEST_PATH = 'browser-mock://demo-track.mp3';

export default function Project({ sidecar, onSidecarLoaded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLoad() {
    setLoading(true);
    setError(null);
    try {
      const result = await autoChapter(TEST_PATH);
      onSidecarLoaded(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="tab-panel">
      <h2>Project</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
        <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
          v0.1 — load a test sidecar to drive the Analysis tab. In browser
          mode this returns realistic mock data; in Tauri mode it'll try
          to call <code>videoflow auto-chapter</code> on a real path
          (file-picker integration is on the v0.2 list).
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleLoad}
            disabled={loading}
            style={{
              padding: '10px 18px',
              background: loading ? 'var(--bg)' : 'var(--accent)',
              color: loading ? 'var(--muted)' : '#0c0d10',
              border: '1px solid var(--accent)',
              borderRadius: 6,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
            }}
          >
            {loading ? 'Loading…' : sidecar ? 'Reload test data' : 'Load test data'}
          </button>

          {sidecar && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--success)',
                fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
              }}
            >
              ✓ {sidecar.chapters.length} chapters · {sidecar.phrases.length} phrases ·{' '}
              {sidecar.energy?.beat_map?.times_ms?.length || 0} beats ·{' '}
              {fmtTime(totalDurationMs(sidecar))} total
            </span>
          )}
        </div>

        {error && (
          <div className="error-block">
            <strong>autoChapter error:</strong>{' '}
            <code style={{ fontSize: 11 }}>{error}</code>
            {isTauri() && (
              <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 12 }}>
                Real Tauri call to <code>videoflow auto-chapter</code> failed —
                this likely needs a real media file path. Once the file picker
                lands (v0.2), this will use a real path. For now, browser-mode
                via <code>npm run dev</code> uses the mock and works.
              </p>
            )}
          </div>
        )}

        {sidecar && (
          <div
            style={{
              marginTop: 8,
              padding: 12,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Loaded sidecar
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg)', display: 'grid', gap: 4 }}>
              <div>
                <span style={{ color: 'var(--muted)' }}>schema:</span>{' '}
                <code>{sidecar.schema} v{sidecar.version}</code>
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>chapters:</span> {sidecar.chapters.length}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>phrases:</span> {sidecar.phrases.length}
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>beats:</span>{' '}
                {sidecar.energy?.beat_map?.times_ms?.length || 0} ·{' '}
                <span style={{ color: 'var(--muted)' }}>downbeats:</span>{' '}
                {sidecar.energy?.beat_map?.is_downbeat?.filter(Boolean).length || 0}
              </div>
              <div style={{ marginTop: 6, color: 'var(--muted)' }}>
                → switch to the <strong style={{ color: 'var(--fg)' }}>Analysis</strong> tab to
                see it rendered
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
