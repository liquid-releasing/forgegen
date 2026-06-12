import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ANALYSIS_CATEGORIES,
  BeatStrengthBars,
  CategoryPanel,
  ChapterStripPanel,
  EnergyHeatRibbon,
  KpiStrip,
  TempoMap,
  Button,
  Pill,
} from 'forgemoment';
import {
  chapterColor,
  chapterDurationMs,
  lastProvenance,
  totalDurationMs,
} from '../lib/analysis.js';
import { autoChapter, cancelAutoChapter, isCancelled, readSidecar } from '../api/videoflow.js';

const autoStartedMediaPaths = new Set();

function toPanelChapters(sidecar) {
  return (sidecar?.chapters || []).map((chapter, idx) => ({
    ...chapter,
    id: chapter.id || `ch${idx + 1}`,
    atMs: chapter.at_ms ?? chapter.atMs ?? 0,
    endMs: chapter.end_ms ?? chapter.endMs ?? 0,
    name: chapter.name || `Chapter ${idx + 1}`,
    color: chapterColor(chapter),
    contentType: chapter.content_type,
    content_type: chapter.content_type,
  }));
}

function beatData(sidecar) {
  const map = sidecar?.energy?.beat_map;
  const beatsMs = Array.isArray(map?.times_ms) ? map.times_ms : [];
  const downbeatsMs = beatsMs.filter((_, idx) => !!map?.is_downbeat?.[idx]);
  const bpmValues = Object.values(sidecar?.energy?.per_chapter || {})
    .map((row) => row?.bpm)
    .filter((v) => Number.isFinite(v));
  const bpm = bpmValues.length
    ? Math.round(bpmValues.reduce((acc, v) => acc + v, 0) / bpmValues.length)
    : null;
  return { beatsMs, downbeatsMs, bpm };
}

function energyByChapter(sidecar) {
  const per = sidecar?.energy?.per_chapter || {};
  return (sidecar?.chapters || []).map((_, idx) => {
    const row = per[idx] || per[String(idx)] || {};
    return row.energy_mean ?? row.energy ?? row.mean ?? 0;
  });
}

function buildKpis(sidecar, beats) {
  return [
    {
      icon: 'bookmark',
      label: 'Chapters',
      value: sidecar?.chapters?.length ?? 0,
      subtitle: 'generation sections',
    },
    {
      icon: 'list',
      label: 'Phrases',
      value: sidecar?.phrases?.length ?? 0,
      subtitle: 'stanza candidates',
    },
    {
      icon: 'activity',
      label: 'Beats',
      value: beats.beatsMs.length,
      subtitle: `${beats.downbeatsMs.length} downbeats`,
    },
    {
      icon: 'gauge',
      label: 'BPM',
      value: beats.bpm ?? '-',
      subtitle: 'chapter-weighted',
    },
    {
      icon: 'clock',
      label: 'Duration',
      value: fmtDuration(totalDurationMs(sidecar)),
      subtitle: 'source media',
    },
  ];
}

function fmtDuration(ms) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

const ANALYSIS_STEPS = [
  'Extract media',
  'Load audio',
  'Detect chapters',
  'Classify chapters',
  'Write sidecars',
];

function busySteps(label) {
  const text = String(label || '').toLowerCase();
  const active = text.includes('class')
    ? 3
    : text.includes('sidecar') || text.includes('writ')
      ? 4
      : text.includes('detect') || text.includes('chapter')
        ? 2
        : text.includes('load') || text.includes('audio')
          ? 1
          : 0;
  return ANALYSIS_STEPS.map((step, idx) => ({
    label: step,
    status: idx < active ? 'done' : idx === active ? 'running' : 'pending',
  }));
}

function AnalysisStateBanner({ sidecar, mediaPath, analyzing, progress, pipelineError, onRun, onCancel }) {
  const ready = !!sidecar?.chapters?.length;
  const prov = lastProvenance(sidecar);
  return (
    <div className={`fg-analysis-banner ${pipelineError ? 'error' : analyzing ? 'running' : ready ? 'ready' : ''}`}>
      <div>
        <strong>
          {pipelineError
            ? 'Analysis needs attention'
            : analyzing
              ? 'Analysis is running'
              : ready
                ? 'Analysis sidecars are ready'
                : mediaPath
                  ? 'Analysis is ready to run'
                  : 'No media project selected'}
        </strong>
        <p>
          {pipelineError
            ? pipelineError
            : analyzing
              ? (progress || 'Detecting chapters, beats, and energy from the media.')
              : ready
                ? `Loaded ${sidecar.chapters.length} chapters${prov ? ` from ${prov.writer}` : ''}.`
                : mediaPath
                  ? 'Run videoflow auto-chapter to create the chapter sidecar.'
                  : 'Open a raw audio or video file from Library or Project first.'}
        </p>
        {mediaPath && <code>{mediaPath}</code>}
      </div>
      <div className="fg-header-actions">
        {analyzing ? (
          <Button kind="secondary" onClick={onCancel}>Cancel</Button>
        ) : (
          mediaPath && <Button kind="primary" onClick={onRun}>{ready ? 'Re-analyze' : 'Run Analysis'}</Button>
        )}
      </div>
    </div>
  );
}

export default function Analysis({ sidecar, mediaPath, onSidecarLoaded, setBusy, setAppError, onContinue }) {
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [activeCategoryId, setActiveCategoryId] = useState('structure');
  const [analyzing, setAnalyzing] = useState(false);
  const [pipelineError, setPipelineError] = useState(null);
  const [progress, setProgress] = useState(null);
  const analyzingRef = useRef(false);

  const runAnalysis = useCallback(async ({ force = false } = {}) => {
    if (!mediaPath || analyzingRef.current) return;
    if (force) onSidecarLoaded?.(null);
    analyzingRef.current = true;
    setAnalyzing(true);
    setPipelineError(null);
    setProgress(null);
    setAppError?.(null);
    setBusy?.({
      message: `Analyzing ${mediaPath.split(/[\\/]/).pop() || 'media'}...`,
      detail: 'videoflow auto-chapter',
      steps: busySteps('extract'),
    });
    try {
      const fresh = await autoChapter(mediaPath, (label) => {
        setProgress(label);
        setBusy?.({
          message: `Analyzing ${mediaPath.split(/[\\/]/).pop() || 'media'}...`,
          detail: label,
          steps: busySteps(label),
        });
        readSidecar(mediaPath)
          .then((data) => {
            if (data?.chapters?.length) onSidecarLoaded?.(data);
          })
          .catch(() => {});
      });
      onSidecarLoaded?.(fresh);
    } catch (err) {
      if (isCancelled(err)) {
        setProgress(null);
        return;
      }
      const message = err?.message ? String(err.message) : String(err);
      setPipelineError(message);
      setAppError?.(`Analysis failed: ${message}`);
    } finally {
      analyzingRef.current = false;
      setAnalyzing(false);
      setBusy?.(null);
    }
  }, [mediaPath, onSidecarLoaded, setAppError, setBusy]);

  useEffect(() => {
    if (sidecar || !mediaPath || analyzing) return;
    if (autoStartedMediaPaths.has(mediaPath)) return;
    autoStartedMediaPaths.add(mediaPath);
    runAnalysis();
  }, [sidecar, mediaPath, analyzing, runAnalysis]);

  async function handleCancel() {
    try {
      await cancelAutoChapter();
    } catch {
      setAnalyzing(false);
      setBusy?.(null);
    }
  }

  const chapters = useMemo(() => toPanelChapters(sidecar), [sidecar]);
  const durationMs = totalDurationMs(sidecar);
  const beats = useMemo(() => beatData(sidecar), [sidecar]);
  const energy = useMemo(() => energyByChapter(sidecar), [sidecar]);
  const status = sidecar?.chapters?.length ? 'ready' : analyzing ? 'loading' : 'empty';

  return (
    <section className="fg-analysis">
      <header className="fg-page-header">
        <div>
          <div className="fg-eyebrow">Stage - Analysis</div>
          <h2>{mediaPath ? `Reviewing ${mediaPath.split(/[\\/]/).pop()}` : 'Review the structure'}</h2>
          <p>
            FunscriptForge analysis chassis, driven by ForgeGen raw media:
            chapters, beats, energy, then Sources and Recipes.
          </p>
        </div>
        <div className="fg-header-actions">
          {sidecar?.chapters?.length ? <Pill tone="success" dot>{sidecar.chapters.length} chapters</Pill> : null}
          {sidecar?.chapters?.length ? (
            <Button kind="primary" onClick={onContinue}>Continue to Sources</Button>
          ) : null}
        </div>
      </header>

      <AnalysisStateBanner
        sidecar={sidecar}
        mediaPath={mediaPath}
        analyzing={analyzing}
        progress={progress}
        pipelineError={pipelineError}
        onRun={() => runAnalysis({ force: !!sidecar })}
        onCancel={handleCancel}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <ChapterStripPanel
          status={status}
          chapters={chapters}
          durationMs={durationMs}
          focusedIdx={focusedIdx}
          onFocus={setFocusedIdx}
          error={null}
          onRetry={() => runAnalysis({ force: true })}
        />

        <TempoMap
          status={beats.beatsMs.length ? 'ready' : status}
          beats={beats.beatsMs}
          globalBpm={beats.bpm}
          durationMs={durationMs}
          error={null}
          onRetry={() => runAnalysis({ force: true })}
        />

        <BeatStrengthBars
          status={beats.beatsMs.length ? 'ready' : status}
          beats={beats.beatsMs}
          downbeats={beats.downbeatsMs}
          chapters={chapters}
          durationMs={durationMs}
          focusedIdx={focusedIdx}
          onFocus={setFocusedIdx}
          error={null}
          onRetry={() => runAnalysis({ force: true })}
        />

        <EnergyHeatRibbon
          status={energy.some((v) => v > 0) ? 'ready' : status}
          chapters={chapters}
          energy={energy}
          durationMs={durationMs}
          focusedIdx={focusedIdx}
          onFocus={setFocusedIdx}
          error={null}
          onRetry={() => runAnalysis({ force: true })}
        />

        <KpiStrip status={status === 'ready' ? 'ready' : status} kpis={buildKpis(sidecar, beats)} />

        <CategoryPanel
          activeCategoryId={activeCategoryId}
          onChange={setActiveCategoryId}
          status={status}
          categories={ANALYSIS_CATEGORIES}
          data={{
            chapters,
            phrases: sidecar?.phrases || [],
            stanzas: sidecar?.phrases || [],
            trackBeats: beats,
            durationMs,
            focusedIdx,
            onFocus: setFocusedIdx,
          }}
          error={null}
          onRetry={() => runAnalysis({ force: true })}
        />
      </div>
    </section>
  );
}
