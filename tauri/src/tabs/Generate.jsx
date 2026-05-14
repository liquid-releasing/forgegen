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

import { useEffect, useMemo, useRef, useState } from 'react';
import ChapterStrip from '../components/analysis/ChapterStrip.jsx';
import PerChapterForm, {
  DEFAULT_RECIPE,
  DENSITY_OPTIONS,
  SHAPE_OPTIONS,
  STYLE_OPTIONS,
} from '../components/generate/PerChapterForm.jsx';
import Stepper from '../components/common/Stepper.jsx';
import {
  cancelGenerateFunscript,
  generateFunscript,
  isCancelled,
  isTauri,
} from '../api/videoflow.js';
import { fmtTime } from '../lib/analysis.js';
import { TARGETS, getTarget } from '../lib/targets.js';

const DEFAULT_TARGET_ID = 'keon';

// Pipeline stages for videoflow generate-funscript. Maps stderr labels
// from videoflow.audio.analyze_beats + videoflow.generate.generate_from_beats
// into a 5-step stepper. The three synthesis steps (curve/classify/shape)
// fold into one "Synth" step because they're all fast and feel like one
// unit to the user.
//
// `Analyzing chapter N/M` belongs to Beats — videoflow.audio runs analyse
// per chapter when chapters are supplied (recipe-bundle path always does
// this), so on long files the Beats stage shows live chapter-index detail
// rather than looking frozen.
const GENERATE_STAGES = [
  { id: 'extract', label: 'Extract', match: /Extracting audio/i },
  { id: 'load', label: 'Load', match: /Loading audio/i },
  { id: 'beats', label: 'Beats', match: /Separating percussive|Tracking beats|HPSS|Analyzing chapter|Detecting beats|Computing phrases/i },
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

function PerChapterCaveat({ count }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        fontSize: 12,
        color: 'var(--muted)',
        lineHeight: 1.5,
      }}
    >
      Each of the {count} chapters synthesizes with its own Density / Shape
      via videoflow's <code>--recipe-bundle</code>. Source mix
      (percussive vs full) is shared across the whole run because the audio
      is loaded once at analyze time. The funscript metadata embeds the
      chapters + recipes used + a partial-MD5 of the source video so
      downstream tools can detect drift if you re-edit the source later.
    </div>
  );
}

// Recipes can vary per chapter, but `source` (audio mix) is global per run
// because audio is loaded once at analyse time. Summarise as
// "Style · density-or-mixed · shape-or-mixed" so the user sees what's
// actually about to run without having to scroll back to the grid.
function recipeSummaryLabel(recipes) {
  if (!recipes || recipes.length === 0) return null;
  const head = recipes[0];
  const allSame = (field) => recipes.every((r) => r[field] === head[field]);
  const styleLabel = STYLE_OPTIONS.find((o) => o.value === head.style)?.label.split(' — ')[0] || head.style;
  const densityLabel = allSame('density')
    ? DENSITY_OPTIONS.find((o) => o.value === head.density)?.label.split(' — ')[0] || head.density
    : 'mixed';
  const shapeLabel = allSame('shape')
    ? SHAPE_OPTIONS.find((o) => o.value === head.shape)?.label.split(' — ')[0] || head.shape
    : 'mixed';
  return `Style: ${styleLabel} · Density: ${densityLabel} · Shape: ${shapeLabel}`;
}

function ResultPanel({ result, mediaPath, recipeSummary }) {
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
        {recipeSummary && (
          <div style={{ color: 'var(--muted)' }}>{recipeSummary}</div>
        )}
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

export default function Generate({ sidecar, mediaPath, onFunscriptReady, onSwitchToOutput }) {
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
  // Set when the user clicks Cancel. The bridge call can take a beat to
  // tear down the videoflow subprocess; this flag puts the Cancel button
  // into a "Cancelling…" state so the click feels acknowledged even before
  // the promise settles.
  const [cancelling, setCancelling] = useState(false);
  // Ref on the busy/result block — when generation kicks off we
  // scrollIntoView so the progress bar is visible without manual scroll.
  // The author UI (chapter rows + bulk controls) easily exceeds one
  // screen on tracks with many chapters, so the progress block sits below
  // the fold by default.
  const progressRef = useRef(null);

  // Both single-recipe args (back-compat for callers without a chapter
  // grid) and the per-chapter recipe-bundle. The bridge takes the bundle
  // path when chapters + recipes are both present and lengths match;
  // otherwise it falls back to the single-recipe CLI flags. Sending both
  // costs nothing — videoflow ignores --source/--stroke-density/--tone
  // when --recipe-bundle is set.
  const sendOptions = useMemo(() => {
    const head = recipes[0] || DEFAULT_RECIPE;
    const chapterBounds = (sidecar?.chapters || []).map((c) => ({
      at_ms: c.at_ms,
      end_ms: c.end_ms ?? null,
    }));
    const recipeRows = recipes.map((r) => ({
      source: r.style,
      stroke_density: r.density,
      tone: r.shape,
      emphasize_beats: !!r.emphasize_beats,
    }));
    return {
      source: head.style,
      density: head.density,
      tone: head.shape,
      emphasize_beats: !!head.emphasize_beats,
      chapters: chapterBounds,
      recipes: recipeRows,
    };
  }, [recipes, sidecar]);

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
    setCancelling(false);
    setPhase(PHASES.GENERATING);
    try {
      const out = await generateFunscript(mediaPath, sendOptions, (label) => {
        setStage(label);
        const next = stageIdForGenerateLabel(label);
        if (next) setStageId(next);
      });
      setResult(out);
      setPhase(PHASES.DONE);
      // Lift the result up so the Output tab can inspect it. Without this
      // the Output tab gate stays disabled even after a successful run.
      if (typeof onFunscriptReady === 'function') {
        try { onFunscriptReady(out); } catch { /* never break the run */ }
      }
    } catch (err) {
      // User-initiated cancel returns to idle silently — not an error to
      // show in red. The bridge sentinel "cancelled" is wrapped by Tauri's
      // binding so we match with isCancelled (substring check).
      if (isCancelled(err)) {
        setPhase(PHASES.IDLE);
        setStage(null);
        setStageId(null);
      } else {
        setError(String(err));
        setPhase(PHASES.ERROR);
      }
    } finally {
      setCancelling(false);
    }
  }

  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);
    try {
      await cancelGenerateFunscript();
    } catch {
      // Cancel is best-effort — if the bridge is already winding down or
      // the cancel registry has no entry, the in-flight Generate promise
      // will resolve or reject on its own. No user-facing error needed.
    }
  }

  const busy = phase === PHASES.GENERATING;

  // Auto-scroll the progress block into view when generation kicks off.
  // The author UI (chapter rows + bulk controls) frequently exceeds one
  // screen of vertical space, so the progress block sits below the fold.
  // Scrolling on the busy → true edge gives the user immediate feedback
  // that the run started without making them hunt for the bar.
  useEffect(() => {
    if (busy && progressRef.current) {
      progressRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [busy]);

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
        {PerChapterCaveat({ count: sidecar.chapters.length })}

        {/* 6. Generate CTA — role-swaps by phase. Idle/Error → Generate.
            Busy → Cancel. Done → View Output (primary) + Regenerate (link). */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {!isTauri() && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Browser mode — generation will return mock data.
            </span>
          )}
          {phase === PHASES.DONE && (
            <button
              onClick={handleGenerate}
              style={{
                padding: '6px 0',
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontFamily: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              title="Run Generate again — current funscript is backed up first"
            >
              Regenerate
            </button>
          )}
          {busy ? (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 22px',
                background: 'transparent',
                border: '1px solid var(--warning, #ff8c42)',
                borderRadius: 8,
                color: 'var(--warning, #ff8c42)',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                cursor: cancelling ? 'wait' : 'pointer',
                opacity: cancelling ? 0.6 : 1,
              }}
              title="Stop the in-flight videoflow run and return to the editor"
            >
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          ) : phase === PHASES.DONE ? (
            <button
              onClick={() => onSwitchToOutput && onSwitchToOutput()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 22px',
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                color: '#0c0d10',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Open the Output tab to inspect, save, or reveal the funscript"
            >
              View Output ↗
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 22px',
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                color: '#0c0d10',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Generate funscript →
            </button>
          )}
        </div>

        {/* 7. Status / error / result */}
        {busy && (
          <div
            ref={progressRef}
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
            {recipeSummaryLabel(recipes) && (
              <div style={{ color: 'var(--fg)', fontSize: 12 }}>
                {recipeSummaryLabel(recipes)}
              </div>
            )}
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
          <ResultPanel
            result={result}
            mediaPath={mediaPath}
            recipeSummary={recipeSummaryLabel(recipes)}
          />
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
