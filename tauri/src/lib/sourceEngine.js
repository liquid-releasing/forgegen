export const SOURCE_IDS = ['audio', 'video', 'imported'];

export const SOURCES = {
  audio: {
    id: 'audio',
    label: 'Audio-synth',
    short: 'Audio',
    color: 'var(--source-audio, #ff4b4b)',
    desc: 'ForgeGen beat and energy synthesis',
  },
  video: {
    id: 'video',
    label: 'Video CV',
    short: 'Video',
    color: 'var(--source-video, #4dabf7)',
    desc: 'Mocked video-motion candidate for this milestone',
  },
  imported: {
    id: 'imported',
    label: 'Imported',
    short: 'Import',
    color: 'var(--source-imported, #c084fc)',
    desc: 'External funscript candidate',
  },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeChapters(sidecar) {
  return (sidecar?.chapters || []).map((c, idx) => {
    const at = Number(c.at_ms || 0);
    const end = Number(c.end_ms || at + 1);
    return {
      ...c,
      id: c.id || `chapter-${idx + 1}`,
      idx,
      name: c.name || `Chapter ${idx + 1}`,
      at_ms: at,
      end_ms: end,
      duration_ms: Math.max(1, end - at),
      contentType: c.content_type || c.intent || 'mixed',
    };
  });
}

export function makeDefaultSourceSelections(chapters) {
  return chapters.map(() => 'audio');
}

export function buildSourceConfidence(chapters, sidecar) {
  const perChapter = sidecar?.energy?.per_chapter || {};
  return chapters.map((c, idx) => {
    const energy = Number(perChapter[idx]?.energy_mean ?? perChapter[String(idx)]?.energy_mean ?? 0.5);
    const confidence = Number(c.confidence ?? 0.82);
    const actionLike = /action|climax|edge|fast/i.test(`${c.contentType} ${c.intent || ''}`);
    const video = Math.max(0.2, Math.min(0.96, confidence * (actionLike ? 1.03 : 0.82)));
    const audio = Math.max(0.25, Math.min(0.97, 0.58 + energy * 0.22 + confidence * 0.2));
    return {
      audio,
      video,
      audioWhy: actionLike ? 'Strong beat structure; audio remains reliable.' : 'Audio energy carries this section.',
      videoWhy: actionLike ? 'Motion-heavy chapter; visual source is a good candidate.' : 'Less visible motion; use only if it previews better.',
    };
  });
}

export function suggestSources(conf, videoAnalyzed = false) {
  return conf.map((row) => (videoAnalyzed && row.video > row.audio ? 'video' : 'audio'));
}

export function buildMockVideoCandidate(chapters, conf = []) {
  const r = rng(0x71de0c0);
  const out = [];
  chapters.forEach((c, idx) => {
    const cf = conf[idx]?.video ?? 0.65;
    const fast = /action|climax|edge/i.test(`${c.contentType} ${c.intent || ''}`);
    const slow = /intro|outro|ambient/i.test(`${c.contentType} ${c.intent || ''}`);
    const base = fast ? 340 : slow ? 720 : 520;
    let t = c.at_ms;
    let up = r() > 0.5;
    while (t < c.end_ms) {
      const interval = Math.max(140, base * (0.78 + r() * 0.52) + (r() - 0.5) * (1 - cf) * base);
      const amp = cf * 58 + 16;
      const centre = 50 + (r() - 0.5) * 12;
      const noise = (r() - 0.5) * (1 - cf) * 36;
      const pos = Math.max(2, Math.min(98, Math.round((up ? centre + amp / 2 : centre - amp / 2) + noise)));
      out.push({ at: Math.round(t), pos });
      up = !up;
      t += interval;
    }
  });
  return out.sort((a, b) => a.at - b.at);
}

export function sourceMix(sources = []) {
  return sources.reduce((acc, src) => {
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, { audio: 0, video: 0, imported: 0 });
}

export function sourceMixText(sources = []) {
  const mix = sourceMix(sources);
  return SOURCE_IDS.filter((id) => mix[id] > 0)
    .map((id) => `${mix[id]} ${SOURCES[id].short.toLowerCase()}`)
    .join(' · ') || 'no chapters';
}

