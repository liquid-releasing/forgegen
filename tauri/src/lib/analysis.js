// Analysis tab helpers — color tokens, vocab metadata, math.
//
// Vocabularies match videoflow's sidecar schema validation:
//   _VALID_PHRASE_MODES = {"", "tease", "steady", "edging", "break", "fast", "slow"}
//   _VALID_TONE_LABELS  = {"", "tender", "build", "tease", "edge", "climax", "dominant"}
//   _VALID_SHAPES       = {"", "flat", "rise", "fall", "auto"}
//   _VALID_CONTENT_TYPES = {"", "music", "ambient", "mixed"}
// Intent vocab (chapter intent) is the seven-stage narrative arc per
// forgegen/architecture/chapter-composition.md.

export const PHRASE_MODES = {
  tease:  { label: 'Tease',  color: '#c77dff' },
  steady: { label: 'Steady', color: '#3ed598' },
  edging: { label: 'Edging', color: '#ffb547' },
  break:  { label: 'Break',  color: '#64748b' },
  fast:   { label: 'Fast',   color: '#ff4b4b' },
  slow:   { label: 'Slow',   color: '#4dabf7' },
};

export const CONTENT_TYPES = {
  music:   { label: 'Music',   color: '#4dabf7' },
  ambient: { label: 'Ambient', color: '#94a3b8' },
  mixed:   { label: 'Mixed',   color: '#c77dff' },
};

export const INTENTS = {
  intro:   { label: 'Intro',   color: '#94a3b8' },
  build:   { label: 'Build',   color: '#4dabf7' },
  sustain: { label: 'Sustain', color: '#3ed598' },
  edge:    { label: 'Edge',    color: '#ffb547' },
  climax:  { label: 'Climax',  color: '#ff4b4b' },
  recover: { label: 'Recover', color: '#56e0a0' },
  outro:   { label: 'Outro',   color: '#94a3b8' },
};

export const LOW_CONFIDENCE_THRESHOLD = 0.85;

// ---------------------------------------------------------------------------
// Color lookup
// ---------------------------------------------------------------------------

export function chapterColor(chapter) {
  return (
    INTENTS[chapter?.intent]?.color ||
    CONTENT_TYPES[chapter?.content_type]?.color ||
    '#64748b'
  );
}

export function modeColor(mode) {
  return PHRASE_MODES[mode]?.color || '#64748b';
}

export function modeLabel(mode) {
  return PHRASE_MODES[mode]?.label || '—';
}

export function contentTypeColor(ct) {
  return CONTENT_TYPES[ct]?.color || '#94a3b8';
}

export function contentTypeLabel(ct) {
  return CONTENT_TYPES[ct]?.label || (ct ? ct : '—');
}

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

export function fmtTime(ms) {
  const totalSec = Math.floor((ms || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Sidecar helpers
// ---------------------------------------------------------------------------

export function chapterDurationMs(chapter) {
  return (chapter.end_ms || 0) - (chapter.at_ms || 0);
}

export function totalDurationMs(sidecar) {
  if (!sidecar?.chapters?.length) return 0;
  return Math.max(...sidecar.chapters.map((c) => c.end_ms || 0));
}

export function phrasesIn(sidecar, chapterIdx) {
  return (sidecar?.phrases || []).filter((p) => p.chapter_idx === chapterIdx);
}

/** Indices into beat_map arrays for beats falling in [startMs, endMs). */
export function beatIndicesInRange(beatMap, startMs, endMs) {
  const out = [];
  if (!beatMap?.times_ms) return out;
  for (let i = 0; i < beatMap.times_ms.length; i++) {
    const t = beatMap.times_ms[i];
    if (t >= startMs && t < endMs) out.push(i);
  }
  return out;
}

/** Find the index of the phrase containing time t (or -1). */
export function phraseIndexAt(phrases, t) {
  if (!phrases?.length) return -1;
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    if (t >= p.at_ms && t < p.end_ms) return i;
  }
  return -1;
}

/** Bin a list of (time, value) tuples into N equally-spaced buckets. */
export function bin(times, values, totalMs, n, reducer = 'mean') {
  const buckets = new Array(n).fill(0).map(() => ({ sum: 0, count: 0 }));
  for (let i = 0; i < times.length; i++) {
    const idx = Math.min(n - 1, Math.floor((times[i] / totalMs) * n));
    buckets[idx].sum += values[i];
    buckets[idx].count += 1;
  }
  return buckets.map((b) => {
    if (b.count === 0) return 0;
    return reducer === 'sum' ? b.sum : b.sum / b.count;
  });
}

/** Aggregate avg BPM across chapters, weighted by chapter duration. */
export function avgBpmWeighted(sidecar) {
  const perCh = sidecar?.energy?.per_chapter;
  if (!perCh) return null;
  let weightedSum = 0;
  let totalWeight = 0;
  Object.entries(perCh).forEach(([k, v]) => {
    if (v.bpm == null) return;
    const ch = sidecar.chapters[Number(k)];
    if (!ch) return;
    const dur = chapterDurationMs(ch);
    weightedSum += v.bpm * dur;
    totalWeight += dur;
  });
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
}

export function bpmRange(sidecar) {
  const perCh = sidecar?.energy?.per_chapter;
  if (!perCh) return null;
  const bpms = Object.values(perCh).map((v) => v.bpm).filter((b) => b != null);
  if (bpms.length === 0) return null;
  return { min: Math.min(...bpms), max: Math.max(...bpms) };
}

export function avgConfidence(sidecar) {
  const chs = sidecar?.chapters || [];
  if (chs.length === 0) return null;
  const sum = chs.reduce((acc, c) => acc + (c.confidence || 0), 0);
  return sum / chs.length;
}

export function downbeatCount(sidecar) {
  const flags = sidecar?.energy?.beat_map?.is_downbeat;
  if (!flags) return 0;
  return flags.reduce((acc, b) => acc + (b ? 1 : 0), 0);
}

export function totalBeats(sidecar) {
  return sidecar?.energy?.beat_map?.times_ms?.length || 0;
}

export function lastProvenance(sidecar) {
  const list = sidecar?.provenance;
  if (!list?.length) return null;
  return list[list.length - 1];
}
