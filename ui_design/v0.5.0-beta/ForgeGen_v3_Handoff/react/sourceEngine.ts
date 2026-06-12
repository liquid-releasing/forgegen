// sourceEngine.ts — ForgeGen v3 source logic, framework-agnostic.
//
// In the prototype these were window globals in data.js. Here they are typed
// pure functions. In PRODUCTION:
//   • buildVideoCandidate → replace with ingesting Funscript-Flow's real
//     .funscript output (run it as a Tauri sidecar / subprocess, Mode 1).
//   • the confidence numbers → derive from real beat/energy clarity (audio)
//     and CV tracking confidence (video) instead of the hand-authored sample.
//   • stitchSources / blendSeams → wire to the engine's real --blend-seams.

import type {
  Action, Candidates, Chapter, Seam, SourceConf, SourceId, SourceMeta,
} from "./types";

export const SOURCES: Record<SourceId, SourceMeta> = {
  audio: {
    id: "audio", label: "Audio-synth", short: "Audio", icon: "audio-lines",
    color: "var(--accent)", desc: "forgegen's beat + energy influence mix",
  },
  video: {
    id: "video", label: "Video CV", short: "Video", icon: "video",
    color: "var(--info)", desc: "Funscript-Flow optical-flow motion track",
  },
  imported: {
    id: "imported", label: "Imported", short: "Import", icon: "file-down",
    color: "var(--mode-chaotic)", desc: "A .funscript you brought in",
  },
};

/** Deterministic PRNG so synthesized candidates are stable across renders. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * PROTOTYPE ONLY — synthesize a video-CV candidate that reads as more organic
 * than the beat-locked audio track and gets jittery in low-confidence chapters.
 * Replace with real Funscript-Flow output in production.
 */
export function buildVideoCandidate(chapters: Chapter[], conf: SourceConf[]): Action[] {
  const r = rng(0x71de0c0);
  const out: Action[] = [];
  chapters.forEach((c, i) => {
    const cf = conf[i]?.video ?? 0.5;
    const fast = c.contentType === "action" || c.contentType === "climax";
    const slow = c.contentType === "intro" || c.contentType === "outro";
    const base = fast ? 360 : slow ? 700 : 520;
    let t = c.at_ms;
    let up = r() > 0.5;
    while (t < c.end_ms) {
      const interval = base * (0.78 + r() * 0.5) + (r() - 0.5) * (1 - cf) * base * 0.9;
      const amp = cf * 56 + 14;
      const noise = (r() - 0.5) * (1 - cf) * 46;
      const centre = 50 + (r() - 0.5) * 10;
      let pos = (up ? centre + amp / 2 : centre - amp / 2) + noise / 2;
      pos = Math.max(2, Math.min(98, Math.round(pos)));
      out.push({ at: Math.round(t), pos });
      up = !up;
      t += Math.max(140, interval);
    }
  });
  return out.sort((a, b) => a.at - b.at);
}

/** PROTOTYPE ONLY — a clean "expert script" candidate for the import demo. */
export function buildImportedCandidate(chapters: Chapter[]): Action[] {
  const r = rng(0x4a11ce5);
  const out: Action[] = [];
  chapters.forEach((c) => {
    let t = c.at_ms;
    let up = r() > 0.5;
    while (t < c.end_ms) {
      const amp = 82;
      const centre = 50;
      let pos = (up ? centre + amp / 2 : centre - amp / 2) + (r() - 0.5) * 6;
      pos = Math.max(2, Math.min(98, Math.round(pos)));
      out.push({ at: Math.round(t), pos });
      up = !up;
      t += 500 * (0.9 + r() * 0.2);
    }
  });
  return out.sort((a, b) => a.at - b.at);
}

/** Default each chapter to its higher-confidence source ("suggested"). */
export function suggestSources(conf: SourceConf[]): SourceId[] {
  return conf.map((k) => (k.video > k.audio ? "video" : "audio"));
}

export function sliceChapter(actions: Action[], c: Chapter): Action[] {
  return actions.filter((a) => a.at >= c.at_ms && a.at < c.end_ms);
}

/** Light seam smoothing around a source-change boundary (prototype-grade). */
export function blendSeams(actions: Action[], seams: Seam[], windowMs = 500): Action[] {
  if (!seams.length) return actions;
  const out = actions.map((a) => ({ ...a }));
  for (const seam of seams) {
    const idxs: number[] = [];
    for (let i = 0; i < out.length; i++) {
      if (Math.abs(out[i].at - seam.at_ms) <= windowMs) idxs.push(i);
    }
    if (idxs.length < 2) continue;
    const first = idxs[0];
    const last = idxs[idxs.length - 1];
    const p0 = out[first].pos;
    const p1 = out[last].pos;
    for (const i of idxs) {
      const t = (out[i].at - out[first].at) / Math.max(1, out[last].at - out[first].at);
      out[i].pos = Math.round(out[i].pos * 0.45 + (p0 + (p1 - p0) * t) * 0.55);
    }
  }
  return out;
}

/** Stitch the per-chapter selection into one timeline + the blended seams. */
export function stitchSources(
  chapters: Chapter[],
  sources: SourceId[],
  candidates: Candidates,
): { actions: Action[]; seams: Seam[] } {
  const out: Action[] = [];
  const seams: Seam[] = [];
  chapters.forEach((c, i) => {
    const src = sources[i] ?? "audio";
    const acts = candidates[src] ?? candidates.audio;
    out.push(...sliceChapter(acts, c));
    const prev = sources[i - 1] ?? "audio";
    if (i > 0 && prev !== src) seams.push({ at_ms: c.at_ms, from: prev, to: src });
  });
  out.sort((a, b) => a.at - b.at);
  return { actions: blendSeams(out, seams), seams };
}

export function sourceMix(sources: SourceId[]): Record<SourceId, number> {
  const m: Record<SourceId, number> = { audio: 0, video: 0, imported: 0 };
  for (const s of sources) m[s] = (m[s] ?? 0) + 1;
  return m;
}
