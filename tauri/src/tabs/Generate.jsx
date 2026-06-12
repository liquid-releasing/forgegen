import { useEffect, useMemo, useRef, useState } from 'react';
import ChapterStrip from '../components/analysis/ChapterStrip.jsx';
import Stepper from '../components/common/Stepper.jsx';
import {
  cancelGenerateFunscript,
  generateFunscript,
  isCancelled,
  isTauri,
} from '../api/videoflow.js';
import { fmtTime } from '../lib/analysis.js';
import {
  DEFAULT_RECIPE,
  DENSITY_OPTIONS,
  SHAPE_OPTIONS,
  STYLE_OPTIONS,
} from '../components/generate/PerChapterForm.jsx';

const GENERATE_STAGES = [
  { id: 'extract', label: 'Extract', match: /Extracting audio/i },
  { id: 'load', label: 'Load', match: /Loading audio/i },
  { id: 'beats', label: 'Beats', match: /Separating percussive|Tracking beats|HPSS|Analyzing chapter|Detecting beats|Computing phrases/i },
  { id: 'synth', label: 'Synth', match: /Generating motion curve|Classifying phrase modes|Shaping curve/i },
  { id: 'write', label: 'Write', match: /Writing funscript/i },
];

const PHASES = {
  IDLE: 'idle',
  GENERATING: 'generating',
  DONE: 'done',
  ERROR: 'error',
};

const labelStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

function stageIdForGenerateLabel(label) {
  if (!label) return null;
  for (const stage of GENERATE_STAGES) {
    if (stage.match.test(label)) return stage.id;
  }
  return null;
}

function NoSidecarHint() {
  return (
    <section className="tab-panel">
      <h2>Generate</h2>
      <div style={{ color: 'var(--muted)', maxWidth: 540, lineHeight: 1.5 }}>
        Pick an audio/video file from the Project tab and run Analysis first.
      </div>
    </section>
  );
}

function NoMediaPathHint() {
  return (
    <section className="tab-panel">
      <h2>Generate</h2>
      <div style={{ color: 'var(--muted)', maxWidth: 540, lineHeight: 1.5 }}>
        Sidecar is loaded but no source file path is set. Re-pick the file from Project.
      </div>
    </section>
  );
}

function RecipesIncompleteHint() {
  return (
    <section className="tab-panel">
      <h2>Generate</h2>
      <div style={{ color: 'var(--muted)', maxWidth: 560, lineHeight: 1.5 }}>
        Complete and accept every chapter recipe before generating.
      </div>
    </section>
  );
}

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value;
}

function recipeSummaryLabel(recipes) {
  if (!recipes || recipes.length === 0) return null;
  const head = recipes[0];
  const allSame = (field) => recipes.every((recipe) => recipe[field] === head[field]);
  const styleLabel = allSame('style')
    ? optionLabel(STYLE_OPTIONS, head.style)
    : 'mixed';
  const densityLabel = allSame('density')
    ? optionLabel(DENSITY_OPTIONS, head.density)
    : 'mixed';
  const shapeLabel = allSame('shape')
    ? optionLabel(SHAPE_OPTIONS, head.shape)
    : 'mixed';
  return `Style: ${styleLabel} / Density: ${densityLabel} / Shape: ${shapeLabel}`;
}

function recipesAreComplete(recipes, chapterCount) {
  return Array.isArray(recipes)
    && recipes.length === chapterCount
    && recipes.every((recipe) => recipe?.style && recipe?.density && recipe?.shape);
}

function sourceSummaryFor(sourceSelections, chapters) {
  const initial = { counts: { audio: 0, video: 0, imported: 0 }, seams: 0 };
  if (!sourceSelections?.length) {
    initial.counts.audio = chapters.length;
    return initial;
  }
  return sourceSelections.reduce((acc, source, idx) => {
    const key = source || 'audio';
    acc.counts[key] = (acc.counts[key] || 0) + 1;
    if (idx > 0 && sourceSelections[idx - 1] !== key) acc.seams += 1;
    return acc;
  }, initial);
}

function AcceptedPlan({ chapters, recipes, sourceSelections }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={labelStyle}>Accepted recipe plan</div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 8,
      }}>
        {chapters.map((chapter, idx) => {
          const recipe = recipes[idx] || DEFAULT_RECIPE;
          const source = sourceSelections[idx] || 'audio';
          return (
            <div
              key={`${chapter.at_ms}-${idx}`}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 7,
                background: 'var(--bg-elevated)',
                padding: 10,
                minHeight: 92,
                display: 'grid',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>Chapter {idx + 1}</span>
                <span style={{ marginLeft: 'auto', color: source === 'audio' ? 'var(--source-audio)' : 'var(--muted)', fontSize: 11 }}>
                  {source}
                </span>
              </div>
              <div style={{ color: 'var(--fg)', fontWeight: 750, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {chapter.name || `Chapter ${idx + 1}`}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 11 }}>
                {source === 'audio'
                  ? `${recipe.style} / ${recipe.density}x / ${recipe.shape}${recipe.emphasize_beats ? ' / downbeats' : ''}`
                  : 'stitched source track'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultPanel({ result, mediaPath, recipeSummary }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--success)',
      borderRadius: 8,
      padding: 14,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 800,
        color: 'var(--success)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
      }}>
        Funscript generated
      </div>
      <div style={{ fontSize: 12, color: 'var(--fg)', display: 'grid', gap: 4 }}>
        <div style={{ wordBreak: 'break-all' }}>
          <span style={{ color: 'var(--muted)' }}>output:</span>{' '}
          <code style={{ fontSize: 11 }}>{result.output}</code>
        </div>
        <div>
          <span style={{ color: 'var(--muted)' }}>actions:</span>{' '}
          {(result.actions ?? result.beats ?? 0).toLocaleString()}
          {' / '}
          <span style={{ color: 'var(--muted)' }}>BPM:</span>{' '}
          {result.bpm ?? '-'}
          {' / '}
          <span style={{ color: 'var(--muted)' }}>duration:</span>{' '}
          {fmtTime(result.duration_ms ?? 0)}
        </div>
        {recipeSummary && <div style={{ color: 'var(--muted)' }}>{recipeSummary}</div>}
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

export default function Generate({
  sidecar,
  mediaPath,
  sourceSelections = [],
  videoCandidate = null,
  acceptedRecipes = [],
  onFunscriptReady,
  onSwitchToOutput,
}) {
  const recipes = useMemo(
    () => acceptedRecipes.map((recipe) => ({ ...DEFAULT_RECIPE, ...recipe })),
    [acceptedRecipes],
  );
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState(null);
  const [stageId, setStageId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const progressRef = useRef(null);

  const chapters = sidecar?.chapters || [];
  const complete = recipesAreComplete(recipes, chapters.length);
  const sourceSummary = sourceSummaryFor(sourceSelections, chapters);
  const recipeSummary = recipeSummaryLabel(recipes);

  const sendOptions = useMemo(() => {
    const head = recipes[0] || DEFAULT_RECIPE;
    return {
      source: head.style,
      density: head.density,
      tone: head.shape,
      emphasize_beats: !!head.emphasize_beats,
      chapters: chapters.map((chapter) => ({
        at_ms: chapter.at_ms,
        end_ms: chapter.end_ms ?? null,
      })),
      recipes: recipes.map((recipe) => ({
        source: recipe.style,
        stroke_density: recipe.density,
        tone: recipe.shape,
        emphasize_beats: !!recipe.emphasize_beats,
      })),
      sourceSelections,
      candidateTracks: {
        video: videoCandidate,
        imported: null,
      },
    };
  }, [chapters, recipes, sourceSelections, videoCandidate]);

  useEffect(() => {
    if (phase === PHASES.GENERATING && progressRef.current) {
      progressRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [phase]);

  if (!sidecar) return <NoSidecarHint />;
  if (!mediaPath) return <NoMediaPathHint />;
  if (!complete) return <RecipesIncompleteHint />;

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
      if (typeof onFunscriptReady === 'function') {
        try { onFunscriptReady(out); } catch { /* keep run result */ }
      }
    } catch (err) {
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
      // Best-effort cancel; the in-flight promise will settle.
    }
  }

  const busy = phase === PHASES.GENERATING;

  return (
    <section className="tab-panel" style={{ padding: 0, border: 'none', background: 'transparent' }}>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--accent)',
          borderRadius: 6,
          padding: '12px 16px',
          fontSize: 13,
          color: 'var(--muted)',
          lineHeight: 1.55,
        }}>
          <span style={{ color: 'var(--fg)', fontWeight: 700 }}>Generate</span>
          {' - '}
          Run the accepted audio recipe plan through videoflow and write the final funscript.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={labelStyle}>Script overview</div>
          <ChapterStrip sidecar={sidecar} focusedIdx={-1} onFocus={() => {}} />
        </div>

        <AcceptedPlan chapters={chapters} recipes={recipes} sourceSelections={sourceSelections} />

        <div style={{
          padding: '10px 14px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          fontSize: 12,
          color: 'var(--muted)',
          lineHeight: 1.5,
        }}>
          Source plan: {sourceSummary.counts.audio} audio / {sourceSummary.counts.video} video / {sourceSummary.counts.imported} imported / {sourceSummary.seams} seam{sourceSummary.seams === 1 ? '' : 's'}.
          {' '}Audio chapters use accepted Recipes; video/imported chapters are stitched from their selected source tracks.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14 }}>
          {!isTauri() && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Browser mode returns mock generation data.
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
              title="Run Generate again; current funscript is backed up first"
            >
              Regenerate
            </button>
          )}
          {busy ? (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                padding: '12px 22px',
                background: 'transparent',
                border: '1px solid var(--warning)',
                borderRadius: 8,
                color: 'var(--warning)',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 800,
                cursor: cancelling ? 'wait' : 'pointer',
                opacity: cancelling ? 0.6 : 1,
              }}
            >
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          ) : phase === PHASES.DONE ? (
            <button
              onClick={() => onSwitchToOutput && onSwitchToOutput()}
              style={{
                padding: '12px 22px',
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                color: '#0c0d10',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              View Output
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              style={{
                padding: '12px 22px',
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                color: '#0c0d10',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Generate funscript
            </button>
          )}
        </div>

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
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'pulse 1.2s ease-in-out infinite',
              }} />
              Running videoflow generate-funscript...
            </div>
            {recipeSummary && <div style={{ color: 'var(--fg)', fontSize: 12 }}>{recipeSummary}</div>}
            <Stepper stages={GENERATE_STAGES} currentStageId={stageId} detail={stage} />
          </div>
        )}

        {error && (
          <div className="error-block">
            <strong>Bridge error:</strong>{' '}
            <code style={{ fontSize: 11 }}>{error}</code>
          </div>
        )}

        {result && phase === PHASES.DONE && (
          <ResultPanel result={result} mediaPath={mediaPath} recipeSummary={recipeSummary} />
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
