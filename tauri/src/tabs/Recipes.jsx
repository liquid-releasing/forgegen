import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_RECIPE,
  DENSITY_OPTIONS,
  SHAPE_OPTIONS,
  STYLE_OPTIONS,
  VisualRecipeButtons,
} from '../components/generate/PerChapterForm.jsx';
import {
  chapterDurationMs,
  contentTypeColor,
  contentTypeLabel,
  fmtTime,
} from '../lib/analysis.js';
import { TARGETS, exceedsHeadroom, getTarget } from '../lib/targets.js';

const EMPTY_RECIPE = {
  style: null,
  density: null,
  shape: null,
  emphasize_beats: false,
};

const DEFAULT_TARGET_ID = 'keon';

function isRecipeComplete(recipe) {
  return !!(recipe?.style && recipe?.density && recipe?.shape);
}

function normalizeRecipe(recipe) {
  return {
    ...DEFAULT_RECIPE,
    ...recipe,
    emphasize_beats: !!recipe?.emphasize_beats,
  };
}

function Label({ children, right }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      fontSize: 10,
      fontWeight: 800,
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: 1,
    }}>
      <span>{children}</span>
      {right}
    </div>
  );
}

function StyleButtons({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      {STYLE_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              minHeight: 56,
              padding: '9px 10px',
              borderRadius: 7,
              border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              background: active ? 'var(--accent-glow-soft)' : 'var(--bg)',
              color: active ? 'var(--fg)' : 'var(--muted)',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 750,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ChapterAtGlance({ chapters, recipes, focusedIdx, onFocus, sourceSelections }) {
  const accepted = recipes.filter(isRecipeComplete).length;
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      background: 'var(--bg-elevated)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        color: 'var(--muted)',
        fontSize: 12,
      }}>
        <span>{accepted} / {chapters.length} chapters accepted</span>
        <span>Audio phase</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: 'var(--border)' }}>
        {chapters.map((chapter, idx) => {
          const recipe = recipes[idx];
          const complete = isRecipeComplete(recipe);
          const active = focusedIdx === idx;
          const source = sourceSelections[idx] || 'audio';
          return (
            <button
              key={`${chapter.at_ms}-${idx}`}
              type="button"
              onClick={() => onFocus(idx)}
              style={{
                minHeight: 86,
                padding: 10,
                background: active ? 'var(--accent-glow-soft)' : 'var(--bg)',
                border: active ? '1px solid var(--accent)' : '1px solid transparent',
                color: 'var(--fg)',
                fontFamily: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: contentTypeColor(chapter.content_type) }} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Chapter {idx + 1}</span>
                <span style={{ marginLeft: 'auto', color: complete ? 'var(--success)' : 'var(--warning)', fontSize: 11 }}>
                  {complete ? 'accepted' : 'blank'}
                </span>
              </div>
              <div style={{ fontWeight: 750, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {chapter.name || `Chapter ${idx + 1}`}
              </div>
              <div style={{ marginTop: 5, fontSize: 11, color: 'var(--muted)' }}>
                {source === 'audio' && complete
                  ? `${recipe.density}x / ${recipe.shape}`
                  : source !== 'audio'
                    ? `${source} source`
                    : 'select recipe'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TrackDefaults({ bulk, onBulkChange, targetId, onTargetChange, onApplyToAll }) {
  const target = getTarget(targetId);
  const complete = isRecipeComplete(bulk);
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      background: 'var(--bg-elevated)',
      padding: 12,
      display: 'grid',
      gap: 12,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 0.8fr) minmax(220px, 1fr) minmax(320px, 1.4fr) minmax(320px, 1.4fr)', gap: 12, alignItems: 'end' }}>
        <div style={{ display: 'grid', gap: 5 }}>
          <Label>Target</Label>
          <select
            value={targetId}
            onChange={(e) => onTargetChange(e.target.value)}
            style={{
              padding: '8px 10px',
              background: 'var(--bg)',
              color: 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontFamily: 'inherit',
            }}
          >
            {TARGETS.map((targetOption) => (
              <option key={targetOption.id} value={targetOption.id}>{targetOption.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gap: 5 }}>
          <Label>Audio mix</Label>
          <StyleButtons value={bulk.style} onChange={(style) => onBulkChange({ ...bulk, style })} />
        </div>
        <div style={{ display: 'grid', gap: 5 }}>
          <Label>Density</Label>
          <VisualRecipeButtons
            kind="density"
            options={DENSITY_OPTIONS}
            value={bulk.density}
            onChange={(density) => onBulkChange({ ...bulk, density })}
            density={bulk.density}
            shape={bulk.shape}
            warningFor={(density) => exceedsHeadroom(target, density)}
          />
        </div>
        <div style={{ display: 'grid', gap: 5 }}>
          <Label>Shape</Label>
          <VisualRecipeButtons
            kind="shape"
            options={SHAPE_OPTIONS}
            value={bulk.shape}
            onChange={(shape) => onBulkChange({ ...bulk, shape })}
            density={bulk.density}
            shape={bulk.shape}
          />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ color: 'var(--muted)', fontSize: 11, flex: 1 }}>
          <strong style={{ color: 'var(--fg)' }}>{target.label}:</strong> {target.summary}
        </div>
        <button
          type="button"
          onClick={onApplyToAll}
          disabled={!complete}
          style={{
            padding: '9px 14px',
            borderRadius: 6,
            border: `1px solid ${complete ? 'var(--accent)' : 'var(--border)'}`,
            background: complete ? 'var(--accent)' : 'var(--bg)',
            color: complete ? '#0c0d10' : 'var(--muted)',
            fontFamily: 'inherit',
            fontWeight: 800,
            cursor: complete ? 'pointer' : 'not-allowed',
          }}
        >
          Apply to all
        </button>
      </div>
    </div>
  );
}

function ChapterEditor({
  chapter,
  idx,
  draft,
  onDraftChange,
  onAccept,
  target,
  source,
}) {
  const complete = source !== 'audio' || isRecipeComplete(draft);
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      background: 'var(--bg-elevated)',
      padding: 14,
      display: 'grid',
      gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, color: 'var(--fg)', fontSize: 16, letterSpacing: 0, textTransform: 'none' }}>
          Chapter {idx + 1}: {chapter.name || `Chapter ${idx + 1}`}
        </h2>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          {contentTypeLabel(chapter.content_type)} / {fmtTime(chapterDurationMs(chapter))}
        </span>
      </div>

      {source !== 'audio' ? (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
          This chapter is assigned to <strong style={{ color: 'var(--fg)' }}>{source}</strong> in Sources.
          Accepting marks the chapter ready without audio recipe knobs.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.8fr) minmax(320px, 1fr) minmax(320px, 1fr)', gap: 14 }}>
          <div style={{ display: 'grid', gap: 7 }}>
            <Label>Audio mix</Label>
            <StyleButtons value={draft.style} onChange={(style) => onDraftChange({ ...draft, style })} />
          </div>
          <div style={{ display: 'grid', gap: 7 }}>
            <Label>Density</Label>
            <VisualRecipeButtons
              kind="density"
              options={DENSITY_OPTIONS}
              value={draft.density}
              onChange={(density) => onDraftChange({ ...draft, density })}
              density={draft.density}
              shape={draft.shape}
              warningFor={(density) => exceedsHeadroom(target, density)}
            />
          </div>
          <div style={{ display: 'grid', gap: 7 }}>
            <Label>Shape</Label>
            <VisualRecipeButtons
              kind="shape"
              options={SHAPE_OPTIONS}
              value={draft.shape}
              onChange={(shape) => onDraftChange({ ...draft, shape })}
              density={draft.density}
              shape={draft.shape}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--muted)', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={!!draft.emphasize_beats}
            onChange={(e) => onDraftChange({ ...draft, emphasize_beats: e.target.checked })}
            disabled={source !== 'audio'}
            style={{ accentColor: 'var(--accent)' }}
          />
          emphasize downbeats
        </label>
        <button
          type="button"
          onClick={onAccept}
          disabled={!complete}
          style={{
            padding: '11px 18px',
            borderRadius: 7,
            border: `1px solid ${complete ? 'var(--accent)' : 'var(--border)'}`,
            background: complete ? 'var(--accent)' : 'var(--bg)',
            color: complete ? '#0c0d10' : 'var(--muted)',
            fontFamily: 'inherit',
            fontWeight: 850,
            cursor: complete ? 'pointer' : 'not-allowed',
          }}
        >
          Accept recipe
        </button>
      </div>
    </div>
  );
}

export function recipesComplete(recipes, chapterCount) {
  return Array.isArray(recipes)
    && recipes.length === chapterCount
    && recipes.every(isRecipeComplete);
}

export default function Recipes({
  sidecar,
  recipes,
  onRecipesChange,
  sourceSelections = [],
}) {
  const chapters = sidecar?.chapters || [];
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [targetId, setTargetId] = useState(DEFAULT_TARGET_ID);
  const [bulk, setBulk] = useState(EMPTY_RECIPE);
  const [draft, setDraft] = useState(EMPTY_RECIPE);
  const target = getTarget(targetId);

  useEffect(() => {
    const saved = recipes?.[focusedIdx];
    setDraft(saved ? normalizeRecipe(saved) : EMPTY_RECIPE);
  }, [focusedIdx, recipes]);

  const completion = useMemo(() => {
    const accepted = recipes.filter(isRecipeComplete).length;
    return { accepted, total: chapters.length };
  }, [chapters.length, recipes]);

  if (!sidecar) {
    return (
      <section className="tab-panel">
        <h2>Recipes</h2>
        <div style={{ color: 'var(--muted)' }}>Run Analysis before authoring recipes.</div>
      </section>
    );
  }

  function setRecipeAt(idx, recipe) {
    const next = Array.from({ length: chapters.length }, (_, i) => recipes[i] || null);
    next[idx] = normalizeRecipe(recipe);
    onRecipesChange(next);
  }

  function nextIncompleteIndex(nextRecipes, fromIdx) {
    for (let offset = 1; offset <= chapters.length; offset += 1) {
      const idx = (fromIdx + offset) % chapters.length;
      if (!isRecipeComplete(nextRecipes[idx])) return idx;
    }
    return fromIdx;
  }

  function handleAccept() {
    const recipe = sourceSelections[focusedIdx] === 'audio' || !sourceSelections[focusedIdx]
      ? draft
      : DEFAULT_RECIPE;
    const next = Array.from({ length: chapters.length }, (_, i) => recipes[i] || null);
    next[focusedIdx] = normalizeRecipe(recipe);
    onRecipesChange(next);
    setFocusedIdx(nextIncompleteIndex(next, focusedIdx));
  }

  function handleApplyToAll() {
    if (!isRecipeComplete(bulk)) return;
    onRecipesChange(chapters.map(() => normalizeRecipe(bulk)));
  }

  const focused = chapters[focusedIdx] || chapters[0];
  const source = sourceSelections[focusedIdx] || 'audio';

  return (
    <section className="tab-panel" style={{ padding: 0, border: 'none', background: 'transparent' }}>
      <div style={{ padding: 22, display: 'grid', gap: 18 }}>
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
          <span style={{ color: 'var(--fg)', fontWeight: 700 }}>Recipes</span>
          {' - '}
          Select and accept one audio recipe per chapter. The footer unlocks only after every chapter is accepted.
        </div>

        <div style={{ display: 'grid', gap: 7 }}>
          <Label right={<span>{completion.accepted} / {completion.total}</span>}>
            All chapters influence at a glance
          </Label>
          <ChapterAtGlance
            chapters={chapters}
            recipes={recipes}
            focusedIdx={focusedIdx}
            onFocus={setFocusedIdx}
            sourceSelections={sourceSelections}
          />
        </div>

        <div style={{ display: 'grid', gap: 7 }}>
          <Label>Track defaults</Label>
          <TrackDefaults
            bulk={bulk}
            onBulkChange={setBulk}
            targetId={targetId}
            onTargetChange={setTargetId}
            onApplyToAll={handleApplyToAll}
          />
        </div>

        {focused && (
          <ChapterEditor
            chapter={focused}
            idx={focusedIdx}
            draft={draft}
            onDraftChange={setDraft}
            onAccept={handleAccept}
            target={target}
            source={source}
          />
        )}
      </div>
    </section>
  );
}
