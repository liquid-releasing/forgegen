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
// v0.3: left rail of recent projects (FF-style). One-click reload of any
// recent file goes through the same handlePick flow — sidecar reuse first,
// auto-chapter if missing. Each successful load (reuse or fresh) appends
// the path to <appDataDir>/recents.json.
//
// Per ARCHITECTURE_ADDENDUM_2026_05.md "outputs grow, editors don't":
// no chapter editor here — that's an FFP concern.

import { useCallback, useEffect, useRef, useState } from 'react';
import { autoChapter, cancelAutoChapter, isCancelled, isTauri, pickAudioFile, readSidecar } from '../api/videoflow.js';
import { addRecent, getRecents, removeRecent } from '../api/recents.js';
import { fmtTime, totalDurationMs } from '../lib/analysis.js';
import Stepper from '../components/common/Stepper.jsx';
import ProjectRail from '../components/project/ProjectRail.jsx';

/** Format an elapsed-second count for the busy-state label. */
function fmtElapsed(s) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${String(r).padStart(2, '0')}s`;
}

// Pipeline stages for videoflow auto-chapter, in order. Each carries a
// `match` regex against the stage label streamed from videoflow stderr.
// Sub-stage messages (e.g. "Computing silence map…", "Classifying chapter
// 3/9…") still surface as `detail` text below the stepper.
const AUTO_CHAPTER_STAGES = [
  { id: 'extract', label: 'Extract', match: /Extracting audio/i },
  { id: 'load', label: 'Load', match: /Loading audio/i },
  { id: 'detect', label: 'Detect', match: /silence|recurrence|Snapping|Classifying chapter\s/i },
  { id: 'beats', label: 'Beats', match: /Analysing beats/i },
  { id: 'classify', label: 'Phrases', match: /Classifying phrases/i },
  { id: 'sidecar', label: 'Sidecar', match: /Writing sidecar/i },
];

/** Map the latest progress label to a stage id. Returns null if the
 *  label doesn't match any known stage (caller can keep the previous). */
function stageIdForLabel(label) {
  if (!label) return null;
  for (const s of AUTO_CHAPTER_STAGES) {
    if (s.match.test(label)) return s.id;
  }
  return null;
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
  const [stageId, setStageId] = useState(null);
  const [recents, setRecents] = useState([]);
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

  // Load recents on mount.
  useEffect(() => {
    getRecents().then(setRecents).catch(() => setRecents([]));
  }, []);

  // Shared load flow: takes a picked path (from picker OR a recent click) and
  // runs sidecar reuse → fall back to auto-chapter. On success, prepend to
  // recents and refresh the list so the rail shows the freshly-opened file
  // at top. `force: true` skips the sidecar-reuse step and re-runs analysis
  // even when a cached sidecar exists — bound to the "Re-analyze" CTA for
  // when the user wants to throw away cached data (after a cancel, or when
  // they suspect the cache is stale).
  const loadPath = useCallback(async (picked, { force = false } = {}) => {
    setError(null);
    setReusedSidecar(false);
    setStage(null);
    setStageId(null);
    setPath(picked);
    // Clear the previous file's sidecar from App state so the "Open Analysis"
    // CTA + Analysis tab don't keep pointing at the old run while we work
    // on this one. The CTA reappears once the new sidecar lands.
    onSidecarLoaded(null);
    onMediaPathChanged?.(picked);
    try {
      if (!force) {
        setPhase(PHASES.CHECKING);
        const existing = await readSidecar(picked);
        if (existing) {
          setReusedSidecar(true);
          onSidecarLoaded(existing);
          setPhase(PHASES.LOADED);
          await addRecent(picked);
          const updated = await getRecents();
          setRecents(updated);
          return;
        }
      }
      setPhase(PHASES.ANALYZING);
      const fresh = await autoChapter(picked, (label) => {
        setStage(label);
        const next = stageIdForLabel(label);
        if (next) setStageId(next);
      });
      onSidecarLoaded(fresh);
      setPhase(PHASES.LOADED);
      await addRecent(picked);
      const updated = await getRecents();
      setRecents(updated);
    } catch (err) {
      // User cancel: silently return to IDLE — no error block, no half-state.
      // The path stays set so the rail still highlights what was attempted,
      // but the right pane reverts to the picker / empty state.
      if (isCancelled(err)) {
        setStage(null);
        setStageId(null);
        setPhase(PHASES.IDLE);
        return;
      }
      setError(String(err));
      setPhase(PHASES.ERROR);
    }
  }, [onMediaPathChanged, onSidecarLoaded]);

  async function handleReanalyze() {
    if (!path) return;
    await loadPath(path, { force: true });
  }

  async function handleCancel() {
    try {
      await cancelAutoChapter();
    } catch { /* swallow — UI will catch up via the rejected loadPath */ }
  }

  async function handlePick() {
    setPhase(PHASES.PICKING);
    try {
      const picked = await pickAudioFile();
      if (!picked) {
        setPhase(sidecar ? PHASES.LOADED : PHASES.IDLE);
        return;
      }
      await loadPath(picked);
    } catch (err) {
      setError(String(err));
      setPhase(PHASES.ERROR);
    }
  }

  async function handleRecentClick(recentPath) {
    await loadPath(recentPath);
  }

  async function handleRecentRemove(recentPath) {
    await removeRecent(recentPath);
    const updated = await getRecents();
    setRecents(updated);
  }

  const busy = phase === PHASES.PICKING || phase === PHASES.CHECKING || phase === PHASES.ANALYZING;
  const filename = path
    ? (path.split(/[\\/]/).pop() || path)
    : null;
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
    <section
      className="tab-panel"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 0,
        padding: 0,
        minHeight: 0,
        height: '100%',
      }}
    >
      <ProjectRail
        recents={recents}
        activePath={path}
        onPick={handlePick}
        onRecentClick={handleRecentClick}
        onRecentRemove={handleRecentRemove}
        busy={busy}
      />

      <div style={{
        flex: 1,
        minWidth: 0,
        overflow: 'auto',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <h2 style={{
          margin: 0,
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <span>Project</span>
          {filename && (
            <span style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--muted)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}>
              {filename}
            </span>
          )}
        </h2>

        <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.5, maxWidth: 760 }}>
          Pick an audio or video file to analyse. forgegen reuses the existing
          <code> {'<stem>.chapters.json'} </code> sidecar if it exists,
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
        </div>

        {busy && (
          <div
            style={{
              padding: 14,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {filename && (
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--fg, #e5e7eb)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                wordBreak: 'break-all',
              }}>
                {filename}
              </div>
            )}
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
            {phase === PHASES.ANALYZING && (
              <Stepper
                stages={AUTO_CHAPTER_STAGES}
                currentStageId={stageId}
                detail={stage}
              />
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

        {/* Bottom-right CTA. Role swaps with busy state:
              - busy → Cancel (kills the python child via cancel_run)
              - sidecar loaded + idle → Open Analysis →
              - otherwise empty (idle, no sidecar yet)
            Mirrors the FF ProjectTab's "Continue to …" placement so the user's
            eye lands in the same spot for the forward action regardless of
            phase. */}
        <div style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
        }}>
          {busy && phase !== PHASES.PICKING && (
            <button
              onClick={handleCancel}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                color: 'var(--warning, #ffb547)',
                border: '1px solid var(--warning, #ffb547)',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            >
              Cancel
            </button>
          )}
          {sidecar && !busy && (
            <>
              <button
                onClick={handleReanalyze}
                title="Discard the cached sidecar and run videoflow auto-chapter again"
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                }}
              >
                ↻ Re-analyze
              </button>
              <button
                onClick={onSwitchToAnalysis}
                style={{
                  padding: '10px 16px',
                  background: 'var(--accent)',
                  color: '#0c0d10',
                  border: '1px solid var(--accent)',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                }}
              >
                View Analysis →
              </button>
            </>
          )}
        </div>
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
