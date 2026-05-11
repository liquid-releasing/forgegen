// Project tab — file picker + bridge entry point.
//
// v0.2: native file picker via Tauri dialog plugin. Sequence:
//   1. User clicks "Choose audio/video file…"
//   2. Tauri dialog opens (or browser-mode mock returns a fake path)
//   3. Check for existing <stem>.chapters.json sidecar
//   4. If exists → load it directly (no re-analysis)
//   5. If missing → run videoflow auto-chapter (writes sidecar + returns it)
//   6. Sidecar lifted to App state → Analysis tab unlocked
//
// Per ARCHITECTURE_ADDENDUM_2026_05.md "outputs grow, editors don't":
// no chapter editor here — that's an FFP concern.
//
// v0.3 (TODO): recents list, device selection (FFP-only gates Stim/Multiaxis).

import { useEffect, useRef, useState } from 'react';
import { autoChapter, isTauri, pickAudioFile, readSidecar } from '../api/videoflow.js';
import { fmtTime, totalDurationMs } from '../lib/analysis.js';

/** Format an elapsed-second count for the busy-state label. */
function fmtElapsed(s) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${String(r).padStart(2, '0')}s`;
}

const PHASES = {
  IDLE: 'idle',
  PICKING: 'picking',
  CHECKING: 'checking',
  ANALYZING: 'analyzing',
  LOADED: 'loaded',
  ERROR: 'error',
};

export default function Project({ sidecar, onSidecarLoaded, onMediaPathChanged, onSwitchToAnalysis }) {
  const [phase, setPhase] = useState(sidecar ? PHASES.LOADED : PHASES.IDLE);
  const [path, setPath] = useState(null);
  const [error, setError] = useState(null);
  const [reusedSidecar, setReusedSidecar] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [stage, setStage] = useState(null);
  const intervalRef = useRef(null);

  // Tick an elapsed-time counter while we're in CHECKING/ANALYZING phases
  // so the user has feedback during multi-minute runs on long files.
  useEffect(() => {
    const isWorking = phase === PHASES.CHECKING || phase === PHASES.ANALYZING;
    if (isWorking) {
      const startedAt = Date.now();
      setElapsedSec(0);
      intervalRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase]);

  async function handlePick() {
    setError(null);
    setReusedSidecar(false);
    setStage(null);
    setPhase(PHASES.PICKING);
    try {
      const picked = await pickAudioFile();
      if (!picked) {
        setPhase(sidecar ? PHASES.LOADED : PHASES.IDLE);
        return;
      }
      setPath(picked);
      onMediaPathChanged?.(picked);

      // Step 1: try to load an existing sidecar — avoids re-analysing
      setPhase(PHASES.CHECKING);
      const existing = await readSidecar(picked);
      if (existing) {
        setReusedSidecar(true);
        onSidecarLoaded(existing);
        setPhase(PHASES.LOADED);
        return;
      }

      // Step 2: no sidecar yet → run auto-chapter, streaming per-stage
      // labels from videoflow stderr into the busy panel
      setPhase(PHASES.ANALYZING);
      const fresh = await autoChapter(picked, (label) => setStage(label));
      onSidecarLoaded(fresh);
      setPhase(PHASES.LOADED);
    } catch (err) {
      setError(String(err));
      setPhase(PHASES.ERROR);
    }
  }

  const busy = phase === PHASES.PICKING || phase === PHASES.CHECKING || phase === PHASES.ANALYZING;
  const baseLabel = {
    picking: 'Choose a file…',
    checking: 'Checking for existing sidecar…',
    analyzing:
      elapsedSec < 60
        ? 'Running videoflow auto-chapter… short tracks finish in 5–60s'
        : elapsedSec < 600
        ? 'Running videoflow auto-chapter… long tracks (1–10 min for full albums)'
        : 'Running videoflow auto-chapter… very long file (multi-hour can take 10+ min)',
  }[phase];
  const busyLabel = baseLabel
    ? phase === PHASES.PICKING
      ? baseLabel
      : `${baseLabel} · ${fmtElapsed(elapsedSec)}`
    : '';

  return (
    <section className="tab-panel">
      <h2>Project</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760 }}>
        <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
          v0.2 — pick an audio or video file to analyse. forgegen reuses the
          existing <code>{'<stem>.chapters.json'}</code> sidecar if it exists,
          otherwise runs <code>videoflow auto-chapter</code> to generate one.
          {!isTauri() && ' Browser mode returns mock data on any pick.'}
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handlePick}
            disabled={busy}
            style={{
              padding: '10px 18px',
              background: busy ? 'var(--bg)' : 'var(--accent)',
              color: busy ? 'var(--muted)' : '#0c0d10',
              border: '1px solid var(--accent)',
              borderRadius: 6,
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
            }}
          >
            {sidecar ? 'Choose another file…' : 'Choose audio/video file…'}
          </button>

          {sidecar && (
            <button
              onClick={onSwitchToAnalysis}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            >
              Open Analysis →
            </button>
          )}
        </div>

        {busy && (
          <div
            style={{
              padding: 12,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  animation: 'pulse 1.2s ease-in-out infinite',
                }}
              />
              {busyLabel}
            </div>
            {stage && phase === PHASES.ANALYZING && (
              <div
                style={{
                  paddingLeft: 16,
                  fontSize: 11,
                  color: 'var(--accent)',
                  fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
                }}
              >
                ▸ {stage}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error-block">
            <strong>Bridge error:</strong>{' '}
            <code style={{ fontSize: 11 }}>{error}</code>
            {!isTauri() && (
              <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 12 }}>
                Browser-only mode — file paths aren't real, so any error is
                the mock layer rather than the actual bridge.
              </p>
            )}
            {isTauri() && (
              <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 12 }}>
                Possible causes: videoflow not installed in <code>forgegen/.venv</code>,
                file path inaccessible, audio codec unsupported by librosa, or
                analysis genuinely failed. Check the terminal where you ran{' '}
                <code>npm run tauri:dev</code> for stderr output.
              </p>
            )}
          </div>
        )}

        {sidecar && !busy && (
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
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {reusedSidecar ? 'Loaded existing sidecar' : 'Sidecar generated'}
              {reusedSidecar && (
                <span
                  style={{
                    fontSize: 9,
                    padding: '1px 6px',
                    borderRadius: 3,
                    background: 'rgba(62, 213, 152, 0.15)',
                    color: 'var(--success)',
                    border: '1px solid rgba(62, 213, 152, 0.4)',
                  }}
                >
                  cached
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg)', display: 'grid', gap: 4 }}>
              {path && (
                <div style={{ wordBreak: 'break-all' }}>
                  <span style={{ color: 'var(--muted)' }}>file:</span>{' '}
                  <code style={{ fontSize: 11 }}>{path}</code>
                </div>
              )}
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
              <div>
                <span style={{ color: 'var(--muted)' }}>duration:</span>{' '}
                {fmtTime(totalDurationMs(sidecar))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
