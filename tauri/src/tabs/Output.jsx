// Output tab v0.1 — funscript inspector.
//
// Reads the funscript file written by the most recent Generate run and
// shows: a summary card (path/actions/BPM/duration/provenance), an
// action-density chart over time, a per-chapter breakdown table joined
// with the sidecar for chapter names, and Open-in-Explorer / Save-as
// actions on the file.
//
// Gating: enabled only when App has a `lastFunscript` from Generate. Tab
// stripe disables otherwise — see App.jsx.
//
// Out of scope for v0.1 (per project_forgegen_next_steps_after_2026_05_11.md):
//   - multi-format export (bhaptics, multi-axis) — eventual, not v0.1
//   - editing the funscript — that's FunscriptForge

import { useEffect, useMemo, useState } from 'react';
import DensityHistogram from '../components/output/DensityHistogram.jsx';
import PerChapterBreakdown from '../components/output/PerChapterBreakdown.jsx';
import {
  isTauri,
  listFunscriptVersions,
  pickSaveAsPath,
  readFunscript,
  revealInExplorer,
  saveFunscriptCopy,
} from '../api/videoflow.js';
import { fmtTime } from '../lib/analysis.js';
import { SOURCES, sourceMixText } from '../lib/sourceEngine.js';

const labelStyle = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

function StatRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 12, lineHeight: 1.6 }}>
      <span style={{ color: 'var(--muted)', minWidth: 90 }}>{label}</span>
      <span
        style={{
          color: 'var(--fg)',
          fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryCard({ funscript, result, selectedVersion }) {
  const gen = funscript?.metadata?.generated_from || {};
  const source = gen.source || {};
  const sourceSelections = Array.isArray(gen.source_selections) ? gen.source_selections : [];
  const seams = Array.isArray(gen.seams) ? gen.seams : [];
  const actionCount = funscript?.actions?.length || 0;
  const durMs =
    source.duration_ms ||
    result?.duration_ms ||
    (funscript?.actions?.length ? funscript.actions[funscript.actions.length - 1].at : 0);
  const viewingBackup = selectedVersion && selectedVersion.is_current === false;
  // Border colour distinguishes a fresh result from a historical backup
  // browse so the user always knows whether they're looking at the latest.
  const borderColor = viewingBackup ? 'var(--warning, #ff8c42)' : 'var(--success)';
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: borderColor,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {viewingBackup
          ? `Viewing backup — ${selectedVersion.label}`
          : 'Funscript ready to inspect'}
        {result?.mocked && (
          <span
            style={{
              fontSize: 9,
              padding: '1px 6px',
              borderRadius: 3,
              background: 'rgba(138, 147, 166, 0.15)',
              color: 'var(--muted)',
              border: '1px solid rgba(138, 147, 166, 0.3)',
            }}
          >
            mocked
          </span>
        )}
      </div>
      <StatRow
        label="path"
        value={selectedVersion?.path || result?.output || ''}
        mono
      />
      <StatRow
        label="actions"
        value={`${actionCount.toLocaleString()}${
          result?.bpm && !viewingBackup ? ` · ${result.bpm} BPM` : ''
        } · ${fmtTime(durMs)}`}
      />
      {gen.tool && (
        <StatRow
          label="generator"
          value={`${gen.tool}${gen.tool_version ? ` ${gen.tool_version}` : ''}`}
        />
      )}
      {source.partial_md5 && (
        <StatRow label="source md5" value={source.partial_md5} mono />
      )}
      {sourceSelections.length > 0 && (
        <StatRow
          label="source mix"
          value={`${sourceMixText(sourceSelections)} · ${seams.length} seam${seams.length === 1 ? '' : 's'}`}
        />
      )}
    </div>
  );
}

function SourcePlan({ funscript, sidecar }) {
  const gen = funscript?.metadata?.generated_from || {};
  const selections = Array.isArray(gen.source_selections) ? gen.source_selections : [];
  if (!selections.length) return null;
  const chapters = sidecar?.chapters || [];
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 130px', padding: '8px 10px', background: 'var(--bg)', color: 'var(--muted)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
        <span>#</span>
        <span>Chapter</span>
        <span>Source</span>
      </div>
      {selections.map((src, idx) => {
        const chapter = chapters[idx];
        const meta = SOURCES[src] || SOURCES.audio;
        return (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 130px', padding: '9px 10px', borderTop: '1px solid var(--border)', alignItems: 'center', fontSize: 12 }}>
            <span style={{ color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' }}>{idx + 1}</span>
            <span>{chapter?.name || `Chapter ${idx + 1}`}</span>
            <span style={{ color: meta.color, fontWeight: 800 }}>{meta.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActionRow({ funscriptPath, onSavedAs, onError }) {
  const tauri = isTauri();

  async function handleReveal() {
    try {
      await revealInExplorer(funscriptPath);
    } catch (err) {
      onError(`Reveal failed: ${err}`);
    }
  }

  async function handleSaveAs() {
    try {
      const dst = await pickSaveAsPath(funscriptPath);
      if (!dst) return;
      await saveFunscriptCopy(funscriptPath, dst);
      onSavedAs(dst);
    } catch (err) {
      onError(`Save-as failed: ${err}`);
    }
  }

  const buttonStyle = (primary) => ({
    padding: '8px 14px',
    background: primary ? 'var(--accent)' : 'transparent',
    color: primary ? '#0c0d10' : 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 4,
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  });

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        onClick={handleReveal}
        style={buttonStyle(false)}
        disabled={!tauri}
        title={tauri ? 'Open file manager with this file selected' : 'Available in Tauri runtime only'}
      >
        Open in Explorer
      </button>
      <button
        onClick={handleSaveAs}
        style={buttonStyle(true)}
        disabled={!tauri}
        title={tauri ? 'Copy this funscript to a new file (the original stays put — backups handle versioning)' : 'Available in Tauri runtime only'}
      >
        Save a copy…
      </button>
      {!tauri && (
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          Browser mode — Open/Save-as are Tauri-only.
        </span>
      )}
    </div>
  );
}

function LoadingHint() {
  return (
    <div style={{ color: 'var(--muted)', fontSize: 13, padding: '6px 0' }}>
      Reading funscript…
    </div>
  );
}

function ErrorBlock({ error, backupCount = 0 }) {
  return (
    <div className="error-block">
      <strong>Could not read funscript:</strong>{' '}
      <code style={{ fontSize: 11 }}>{error}</code>
      <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 12 }}>
        {backupCount > 0
          ? `The file may have been moved or deleted. ${backupCount} backup${
              backupCount === 1 ? '' : 's'
            } available — pick one from the Version dropdown above.`
          : 'The file may have been moved or deleted since Generate finished. Try regenerating from the Generate tab.'}
      </p>
    </div>
  );
}

function NoFunscriptHint() {
  return (
    <section className="tab-panel">
      <h2>Output</h2>
      <div style={{ color: 'var(--muted)', maxWidth: 540, lineHeight: 1.5 }}>
        Generate a funscript first — the{' '}
        <strong style={{ color: 'var(--fg)' }}>Output</strong> tab inspects
        what <strong style={{ color: 'var(--fg)' }}>Generate</strong> just
        produced.
      </div>
    </section>
  );
}

function VersionSwitcher({ versions, selectedPath, onSelect }) {
  if (!versions || versions.length <= 1) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={labelStyle}>Version</div>
      <select
        value={selectedPath || ''}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          padding: '6px 10px',
          background: 'var(--bg)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          fontFamily: 'inherit',
          fontSize: 12,
          cursor: 'pointer',
          maxWidth: 480,
        }}
        title="Switch between the current funscript and prior backups left behind by earlier Generate runs"
      >
        {versions.map((v) => (
          <option key={v.path} value={v.path}>
            {v.is_current ? `current — ${v.label}` : v.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Output({ sidecar, lastFunscript }) {
  const [funscript, setFunscript] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedAs, setSavedAs] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);

  const canonicalPath = lastFunscript?.output || null;
  // The path we'll actually read: a user-picked version overrides the
  // canonical from the latest Generate. Falls back to canonical on first
  // render before versions resolve, so the read kicks off immediately.
  const readPath = selectedPath || canonicalPath;

  // Refresh the version list whenever the canonical changes (i.e., a new
  // Generate completed). This catches the `.bak` files left behind by the
  // previous run so the user can browse history without leaving the tab.
  useEffect(() => {
    if (!canonicalPath) {
      setVersions([]);
      setSelectedPath(null);
      return;
    }
    let cancelled = false;
    listFunscriptVersions(canonicalPath)
      .then((list) => {
        if (cancelled) return;
        setVersions(list || []);
        // Default to the canonical if it exists; otherwise fall back to the
        // newest backup so the user sees *something* instead of an error.
        const hasCurrent = (list || []).some(
          (v) => v.is_current && v.path === canonicalPath,
        );
        if (hasCurrent) {
          setSelectedPath(canonicalPath);
        } else if (list && list.length > 0) {
          setSelectedPath(list[0].path);
        } else {
          setSelectedPath(canonicalPath);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVersions([]);
          setSelectedPath(canonicalPath);
        }
      });
    return () => { cancelled = true; };
  }, [canonicalPath]);

  // Re-read whenever the selected version (or canonical, on first render)
  // changes. Browser mode resolves immediately from the mock; Tauri mode
  // hits the file.
  useEffect(() => {
    if (!readPath) {
      setFunscript(null);
      return;
    }
    let cancelled = false;
    setError(null);
    setLoading(true);
    setSavedAs(null);
    setActionError(null);
    readFunscript(readPath)
      .then((data) => {
        if (!cancelled) setFunscript(data);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [readPath]);

  const selectedVersion = useMemo(
    () => versions.find((v) => v.path === selectedPath) || null,
    [versions, selectedPath],
  );

  if (!lastFunscript) return <NoFunscriptHint />;

  return (
    <section className="tab-panel" style={{ padding: 0, border: 'none', background: 'transparent' }}>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* 1. Page promise */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: 6,
            padding: '12px 16px',
            fontSize: 13,
            color: 'var(--muted)',
            lineHeight: 1.55,
          }}
        >
          <span style={{ color: 'var(--fg)', fontWeight: 600 }}>Output</span>
          {' — '}
          inspect the funscript you just generated. The density chart shows
          how often the toy moves over time; the per-chapter table shows the
          recipe and source used for each chapter. Save the file elsewhere or
          open it in the file manager.
        </div>

        {/* 2. Version switcher (only shown if there's >1 version on disk) */}
        <VersionSwitcher
          versions={versions}
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
        />

        {/* 3. Summary card — reflects whichever version is selected */}
        <SummaryCard
          funscript={funscript}
          result={lastFunscript}
          selectedVersion={selectedVersion}
        />

        {/* 4. Loading / error states for the funscript read */}
        {loading && <LoadingHint />}
        {error && (
          <ErrorBlock
            error={error}
            backupCount={versions.filter((v) => !v.is_current).length}
          />
        )}

        {/* 4. Charts + table — only render once funscript is loaded */}
        {funscript && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={labelStyle}>Source plan</div>
              <SourcePlan funscript={funscript} sidecar={sidecar} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={labelStyle}>Density over time</div>
              <DensityHistogram funscript={funscript} sidecar={sidecar} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={labelStyle}>Per-chapter breakdown</div>
              <PerChapterBreakdown funscript={funscript} sidecar={sidecar} />
            </div>
          </>
        )}

        {/* 5. Action row — operates on the currently-selected version, not
            necessarily the canonical. Save-as / Reveal target whatever
            the user is inspecting. */}
        {readPath && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={labelStyle}>Actions</div>
            <ActionRow
              funscriptPath={readPath}
              onSavedAs={(dst) => setSavedAs(dst)}
              onError={(msg) => setActionError(msg)}
            />
            {savedAs && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--success)',
                  paddingLeft: 2,
                  wordBreak: 'break-all',
                }}
              >
                Copied to <code style={{ fontSize: 11 }}>{savedAs}</code>
              </div>
            )}
            {actionError && (
              <div className="error-block">
                <code style={{ fontSize: 11 }}>{actionError}</code>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
