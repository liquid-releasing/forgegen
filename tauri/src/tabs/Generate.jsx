// Generate tab v0.1 — author per-chapter Style/Density/Shape recipes,
// then synthesize a funscript via the videoflow CLI bridge.
//
// Decisions (per `forgegen/REFACTOR_TO_TAURI_REACT.md` v0.1 milestone +
// 2026-05-11 session):
//   - Per-chapter authoring grid (one row per chapter)
//   - Style → `--source` (full | percussive)
//   - Density → `--stroke-density`
//   - Shape → `--tone` (flat | rise | fall | auto)
//   - Emphasize beats → wire-only for v0.1 (CLI flag pending)
//
// v0.1 limitation: videoflow CLI doesn't yet accept per-chapter recipes,
// so the Generate button sends row 1's settings for the whole track.
// The form captures the per-chapter intent so v0.2 just unlocks the
// backend without touching this UI.

import { useMemo, useState } from 'react';
import ChapterStrip from '../components/analysis/ChapterStrip.jsx';
import PerChapterForm, {
  DEFAULT_RECIPE,
  DENSITY_OPTIONS,
  SHAPE_OPTIONS,
  STYLE_OPTIONS,
} from '../components/generate/PerChapterForm.jsx';
import Stepper from '../components/common/Stepper.jsx';
import { generateFunscript, isTauri } from '../api/videoflow.js';
import { fmtTime } from '../lib/analysis.js';
import { TARGETS, getTarget } from '../lib/targets.js';

const DEFAULT_TARGET_ID = 'keon';

// Pipeline stages for videoflow generate-funscript. Maps stderr labels
// from videoflow.audio.analyze_beats + videoflow.generate.generate_from_beats
// into a 5-step stepper. The three synthesis steps (curve/classify/shape)
// fold into one "Synth" step because they're all fast and feel like one
// unit to the user.
const GENERATE_STAGES = [
  { id: 'extract', label: 'Extract', match: /Extracting audio/i },
  { id: 'load', label: 'Load', match: /Loading audio/i },
  { id: 'beats', label: 'Beats', match: /Separating percussive|Tracking beats|HPSS/i },
  { id: 'synth', label: 'Synth', match: /Generating motion curve|Classifying phrase modes|Shaping curve/i },
  { id: 'write', label: 'Write', match: /Writing funscript/i },
];

function stageIdForGenerateLabel(label) {
  if (!label) return null;
  for (const s of GENERATE_STAGES) {
    if (s.match.test(label)) return s.id;
  }
  return null;
}

const PHASES = {
  IDLE: 'idle',
  GENERATING: 'generating',
  DONE: 'done',
  ERROR: 'error',
};

function NoSidecarHint() {
  return (
    <section className="tab-panel">
      <h2>Generate</h2>
      <div style={{ color: 'var(--muted)', maxWidth: 540, lineHeight: 1.5 }}>
        Pick an audio/video file from the{' '}
        <strong style={{ color: 'var(--fg)' }}>Project</strong> tab first —
        Generate needs the analysed sidecar to know about chapters and beats.
      </div>
    </section>
  );
}

function NoMediaPathHint() {
  return (
    <section className="tab-panel">
      <h2>Generate</h2>
      <div style={{ color: 'var(--muted)', maxWidth: 540, lineHeight: 1.5 }}>
        Sidecar is loaded but no source file path is set. Re-pick the file
        from the <strong style={{ color: 'var(--fg)' }}>Project</strong> tab
        so Generate knows where to read the audio from.
      </div>
    </section>
  );
}

function BulkApply({ value, onChange, onApplyAll, targetId, onTargetChange }) {
  const target = getTarget(targetId);
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'flex-end',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 180 }}>
        <label style={labelStyle}>Target device</label>
        <select
          value={targetId}
          onChange={(e) => onTargetChange(e.target.value)}
          style={selectStyle}
          title={target.summary}
        >
          {TARGETS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
        <label style={labelStyle}>Style</label>
        <select
          value={value.style}
          onChange={(e) => onChange({ ...value, style: e.target.value })}
          style={selectStyle}
        >
          {STYLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
        <label style={labelStyle}>Density</label>
        <select
          value={value.density}
          onChange={(e) => onChange({ ...value, density: e.target.value })}
          style={selectStyle}
        >
          {DENSITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
        <label style={labelStyle}>Shape</label>
        <select
          value={value.shape}
          onChange={(e) => onChange({ ...value, shape: e.target.value })}
          style={selectStyle}
        >
          {SHAPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={labelStyle}>Emphasize beats</label>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--fg)',
          }}
        >
          <input
            type="checkbox"
            checked={!!value.emphasize_beats}
            onChange={(e) =>
              onChange({ ...value, emphasize_beats: e.target.checked })
            }
            style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
          />
          downbeats
        </label>
      </div>
      <button
        onClick={onApplyAll}
        title="Copy these settings into every chapter row below"
        style={{
          padding: '8px 14px',
          background: 'transparent',
          color: 'var(--accent)',
          border: '1px solid var(--accent)',
          borderRadius: 4,
          fontFamily: 'inherit',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          height: 32,
        }}
      >
        Apply to all chapters
      </button>
    </div>
  );
}

const labelStyle = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const selectStyle = {
  padding: '6px 10px',
  background: 'var(--bg)',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  fontFamily: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
};

function v01Caveat({ count }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'rgba(255, 181, 71, 0.08)',
        border: '1px solid rgba(255, 181, 71, 0.3)',
        borderRadius: 6,
        fontSize: 12,
        color: 'var(--fg)',
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: 'var(--warning)' }}>v0.1:</strong>{' '}
      videoflow's CLI doesn't yet accept per-chapter recipes, so generation
      uses chapter 1's row for the full {count}-chapter track. Per-chapter
      synthesis lands in v0.2 (CLI extension + recipe bundle).
    </div>
  );
}

function ResultPanel({ result, mediaPath }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--success)',
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--success)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        Funscript generated
        {result.mocked && (
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
      <div style={{ fontSize: 12, color: 'var(--fg)', display: 'grid', gap: 4 }}>
        <div style={{ wordBreak: 'break-all' }}>
          <span style={{ color: 'var(--muted)' }}>output:</span>{' '}
          <code style={{ fontSize: 11 }}>{result.output}</code>
        </div>
        <div>
          <span style={{ color: 'var(--muted)' }}>actions:</span>{' '}
          {(result.actions ?? result.beats ?? 0).toLocaleString()}
          {' · '}
          <span style={{ color: 'var(--muted)' }}>BPM:</span>{' '}
          {result.bpm ?? '—'}
          {' · '}
          <span style={{ color: 'var(--muted)' }}>duration:</span>{' '}
          {fmtTime(result.duration_ms ?? 0)}
        </div>
        {mediaPath && (
          <div style={{ wordBreak: 'break-all', marginTop: 4 }}>
            <span style={{ color: 'var(--muted)' }}>source:</span>{' '}
            <code style={{ fontSize: 11 }}>{mediaPath}</code>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Generate({ sidecar, mediaPath }) {
  const initialTarget = getTarget(DEFAULT_TARGET_ID);
  const initialRecipe = {
    ...DEFAULT_RECIPE,
    density: initialTarget.recommendedDensity || DEFAULT_RECIPE.density,
  };

  const [targetId, setTargetId] = useState(DEFAULT_TARGET_ID);
  const [bulk, setBulk] = useState(initialRecipe);
  const [recipes, setRecipes] = useState(() =>
    (sidecar?.chapters || []).map(() => ({ ...initialRecipe }))
  );
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState(null);
  const [stageId, setStageId] = useState(null);

  const sendOptions = useMemo(() => {
    const r = recipes[0] || DEFAULT_RECIPE;
    return {
      source: r.style,
      density: r.density,
      tone: r.shape,
      emphasize_beats: !!r.emphasize_beats,
    };
  }, [recipes]);

  if (!sidecar) return <NoSidecarHint />;
  if (!mediaPath) return <NoMediaPathHint />;

  const perChapter = sidecar?.energy?.per_chapter;
  const target = getTarget(targetId);

  function handleTargetChange(nextId) {
    setTargetId(nextId);
    const next = getTarget(nextId);
    if (next.recommendedDensity) {
      setBulk((b) => ({ ...b, density: next.recommendedDensity }));
    }
  }

  function updateRecipe(idx, next) {
    setRecipes((prev) => prev.map((r, i) => (i === idx ? next : r)));
  }

  function applyBulkToAll() {
    setRecipes(sidecar.chapters.map(() => ({ ...bulk })));
  }

  async function handleGenerate() {
    setError(null);
    setResult(null);
    setStage(null);
    setStageId(null);
    setPhase(PHASES.GENERATING);
    try {
      const out = await generateFunscript(mediaPath, sendOptions, (label) => {
        setStage(label);
        const next = stageIdForGenerateLabel(label);
        if (next) setStageId(next);
      });
      setResult(out);
      setPhase(PHASES.DONE);
    } catch (err) {
      setError(String(err));
      setPhase(PHASES.ERROR);
    }
  }

  const busy = phase === PHASES.GENERATING;

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
          <span style={{ color: 'var(--fg)', fontWeight: 600 }}>Generate</span>
          {' — '}
          author the script per chapter, then synthesise. Style picks the
          source mix, Density picks how often the toy moves, Shape picks the
          long-arc gesture, and Emphasize boosts downbeats.
        </div>

        {/* 2. Chapter ribbon (read-only context — re-uses Analysis's strip) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={labelStyle}>Script overview</div>
          <ChapterStrip sidecar={sidecar} focusedIdx={-1} onFocus={() => {}} />
        </div>

        {/* 3. Bulk-apply controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={labelStyle}>Track defaults</div>
          <BulkApply
            value={bulk}
            onChange={setBulk}
            onApplyAll={applyBulkToAll}
            targetId={targetId}
            onTargetChange={handleTargetChange}
          />
          <div style={{ fontSize: 11, color: 'var(--muted)', paddingLeft: 4 }}>
            <strong style={{ color: 'var(--fg)' }}>{target.label}:</strong>{' '}
            {target.summary}
            {target.maxSafeDensity && (
              <>
                {' · '}
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                  max safe density: {target.maxSafeDensity}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 4. Per-chapter authoring grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={labelStyle}>Per-chapter recipes</div>
          <PerChapterForm
            chapters={sidecar.chapters}
            perChapter={perChapter}
            recipes={recipes}
            onChange={updateRecipe}
            target={target}
          />
        </div>

        {/* 5. v0.1 caveat */}
        {v01Caveat({ count: sidecar.chapters.length })}

        {/* 6. Generate CTA + status */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {!isTauri() && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Browser mode — generation will return mock data.
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={busy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 22px',
              background: busy ? 'var(--bg)' : 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: 8,
              color: busy ? 'var(--muted)' : '#0c0d10',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {busy ? 'Generating…' : 'Generate funscript →'}
          </button>
        </div>

        {/* 7. Status / error / result */}
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
              Running videoflow generate-funscript…
            </div>
            <Stepper
              stages={GENERATE_STAGES}
              currentStageId={stageId}
              detail={stage}
            />
          </div>
        )}

        {error && (
          <div className="error-block">
            <strong>Bridge error:</strong>{' '}
            <code style={{ fontSize: 11 }}>{error}</code>
            {isTauri() && (
              <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 12 }}>
                Possible causes: videoflow not installed in{' '}
                <code>forgegen/.venv</code>, source file inaccessible, or
                generation genuinely failed. Check the terminal stderr.
              </p>
            )}
          </div>
        )}

        {result && phase === PHASES.DONE && (
          <ResultPanel result={result} mediaPath={mediaPath} />
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
