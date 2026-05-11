// Bridge client — wraps Tauri invoke() for videoflow CLI commands.
//
// In browser-only mode (npm run dev), Tauri isn't loaded; calls fall back
// to mock data so UI iteration doesn't require the Rust runtime.
//
// See ../../../BRIDGE_DESIGN.md for the protocol and ../README.md for run modes.

export function isTauri() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function invokeOrMock(command, args, mockFn) {
  if (!isTauri()) {
    return mockFn();
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(command, args);
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export async function listPatterns() {
  return invokeOrMock('list_patterns', undefined, mockListPatterns);
}

export async function analyzeMedia(path) {
  return invokeOrMock('analyze_media', { path }, () => mockAnalyzeMedia(path));
}

/** Run auto-chapter on `path`. Optional `onProgress(stageLabel)` is invoked
 * for each per-stage progress line streamed from videoflow's stderr (e.g.
 * "Loading audio (librosa)…", "Analysing beats and energy…"). The
 * subscription is set up before the bridge call and torn down on resolve
 * or reject — caller doesn't need to manage cleanup.
 */
export async function autoChapter(path, onProgress) {
  if (!isTauri()) {
    return mockAutoChapter(path, onProgress);
  }
  let unlisten = null;
  if (typeof onProgress === 'function') {
    const { listen } = await import('@tauri-apps/api/event');
    unlisten = await listen('auto_chapter_progress', (e) => {
      try { onProgress(String(e.payload)); } catch { /* never break the run */ }
    });
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('auto_chapter', { path });
  } finally {
    if (unlisten) unlisten();
  }
}

/** Read existing <stem>.chapters.json next to media path. Returns null if missing. */
export async function readSidecar(path) {
  return invokeOrMock('read_sidecar', { path }, () => mockReadSidecar(path));
}

/** Generate a funscript from `path` using the supplied options.
 *
 * options shape (matches Rust GenerateOptions):
 *   { source: 'full'|'percussive', density: 'half'|'full'|'1'|'2'|'4'|'8',
 *     tone: 'flat'|'rise'|'fall'|'auto', emphasize_beats: boolean }
 *
 * Returns { output, bpm, beats, phrases, duration_ms } from videoflow CLI.
 */
export async function generateFunscript(path, options) {
  return invokeOrMock(
    'generate_funscript',
    { path, options },
    () => mockGenerateFunscript(path, options)
  );
}

// ---------------------------------------------------------------------------
// File picker — Tauri dialog plugin (native) or HTML <input> stub (browser)
// ---------------------------------------------------------------------------

/** Open a native file picker for audio/video. Returns the selected absolute
 * path, or null if the user cancelled. In browser-only mode, returns a
 * stable mock path so the rest of the flow can be exercised. */
export async function pickAudioFile() {
  if (!isTauri()) {
    return mockPickAudioFile();
  }
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: 'Audio / Video',
        extensions: [
          'mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac',
          'mp4', 'mkv', 'mov', 'avi', 'webm', 'm4v',
        ],
      },
      { name: 'All files', extensions: ['*'] },
    ],
  });
  return selected ?? null;
}

// ---------------------------------------------------------------------------
// Mocks (browser-only mode)
// ---------------------------------------------------------------------------

function mockListPatterns() {
  return {
    version: 1,
    patterns: [
      { id: 'h_pulse', label: 'Pulse', color: '#4cc3ff', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Steady on/off oscillation. The metronome.' },
      { id: 'h_wave', label: 'Wave', color: '#3ed598', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Smooth sine envelope across active regions.' },
      { id: 'h_rolling', label: 'Rolling', color: '#ffb547', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Sensation chases around the body.' },
      { id: 'h_tremor', label: 'Tremor', color: '#c77dff', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Random flutter. No fixed period.' },
      { id: 'h_sustain', label: 'Sustain', color: '#8b9bff', category: 'haptic',
        consumers: ['haptic', 'stim', 'edit', 'multiaxis'],
        summary: 'Hold a steady pressure. The drone.' },
      { id: 'h_impact', label: 'Impact', color: '#ff4b4b', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Sharp punctuation. Rare, high-intensity hits.' },
      { id: 'h_reactive', label: 'Reactive', color: '#56e0a0', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Audio-following. No inherent shape — envelope = audio energy.' },
    ],
    consumers: [
      { id: 'haptic', label: 'Haptics', icon: 'vibrate', color: '#4cc3ff' },
      { id: 'stim', label: 'Stim', icon: 'zap', color: '#ffb547' },
      { id: 'multiaxis', label: 'Multi-axis', icon: 'move-3d', color: '#c77dff' },
      { id: 'edit', label: 'Edit', icon: 'edit-3', color: '#3ed598' },
    ],
    none_sentinel: '_none',
  };
}

function mockAnalyzeMedia(path) {
  return Promise.reject(
    new Error(
      `Browser-only mock — analyzeMedia(${path}) not implemented. ` +
        `Run npm run tauri:dev to use the real bridge.`
    )
  );
}

function mockAutoChapter(_path, onProgress) {
  // Returns a realistic videoflow.sidecar v2 shape. Mirrors what
  // videoflow.structural.auto_chapter() would write to <stem>.chapters.json
  // for a ~9.5 minute music track with intro/build/climax/recover structure.
  // If onProgress is supplied, simulate a few stage labels with delays so
  // browser-mode UI dev exercises the live-progress code path.
  if (typeof onProgress !== 'function') {
    return Promise.resolve(buildMockSidecar());
  }
  const STAGES = [
    'Extracting audio from video (ffmpeg)…',
    'Loading audio (librosa)…',
    'Detecting chapter boundaries…',
    'Analysing beats and energy…',
    'Classifying phrases…',
    'Writing sidecar…',
  ];
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      if (i < STAGES.length) {
        try { onProgress(STAGES[i]); } catch { /* swallow */ }
        i += 1;
        setTimeout(tick, 500);
      } else {
        resolve(buildMockSidecar());
      }
    };
    tick();
  });
}

function mockReadSidecar(_path) {
  // Browser-only mode never has a real sidecar on disk — pretend
  // there isn't one so the caller falls through to autoChapter.
  return Promise.resolve(null);
}

function mockPickAudioFile() {
  // Stable fake path so the rest of the flow can be exercised in browser.
  return Promise.resolve('browser-mock://demo-track.mp3');
}

function mockGenerateFunscript(path, options) {
  // Simulate a 1.2s synthesis so the spinner UI is exercised.
  return new Promise((resolve) => {
    setTimeout(() => {
      const stem = String(path).replace(/\.[^.]+$/, '');
      const density = options?.density ?? 'half';
      // Rough action count for the mock sidecar (~2400 beats × density factor)
      const factor = { half: 1, full: 2, '1': 1, '2': 2, '4': 4, '8': 8 }[density] ?? 1;
      resolve({
        output: `${stem}.funscript`,
        bpm: 122.0,
        beats: 1240,
        phrases: 32,
        duration_ms: 572000,
        actions: 1240 * factor,
        mocked: true,
      });
    }, 1200);
  });
}

// ---------------------------------------------------------------------------
// Sidecar mock builder (browser-mode dev data)
// ---------------------------------------------------------------------------

function buildMockSidecar() {
  const chapters = [
    {
      at_ms: 0, end_ms: 90000, name: 'Intro — ambient',
      intent: 'intro', content_type: 'ambient', confidence: 0.92,
      evidence: 'Low RMS, no percussive content for first 90s',
      tone: 'tender', shape: 'rise', auto_generated: true,
    },
    {
      at_ms: 90000, end_ms: 240000, name: 'Build — music',
      intent: 'build', content_type: 'music', confidence: 0.88,
      evidence: 'Tempo lock at 122 BPM, energy curve rising 0.18 → 0.45',
      tone: 'build', shape: 'rise', auto_generated: true,
    },
    {
      at_ms: 240000, end_ms: 480000, name: 'Climax — music',
      intent: 'climax', content_type: 'music', confidence: 0.81,
      evidence: 'Peak energy 0.84, BPM stable, percussive_ratio 0.71',
      tone: 'climax', shape: 'auto', auto_generated: true,
    },
    {
      at_ms: 480000, end_ms: 572000, name: 'Recover — ambient',
      intent: 'recover', content_type: 'ambient', confidence: 0.74,
      evidence: 'Energy decay, beat detection unstable past 9:00',
      tone: 'tender', shape: 'fall', auto_generated: true,
    },
  ];

  const phrases = buildMockPhrases(chapters);
  const beatMap = buildMockBeatMap(chapters);
  const perChapter = buildMockPerChapter(chapters, beatMap);

  const sortedAll = [...beatMap.strengths].sort((a, b) => a - b);
  const pf = (frac) => {
    if (sortedAll.length === 0) return 0;
    const idx = Math.max(0, Math.min(sortedAll.length - 1, Math.floor(frac * sortedAll.length)));
    return Math.round(sortedAll[idx] * 1000) / 1000;
  };

  return {
    schema: 'audio-structure',
    version: '2.0',
    auto_generated: true,
    chapters,
    phrases,
    energy: {
      percentiles: { p5: pf(0.05), p25: pf(0.25), p50: pf(0.50), p75: pf(0.75), p95: pf(0.95) },
      beat_map: beatMap,
      per_chapter: perChapter,
    },
    provenance: [
      {
        writer: 'videoflow.structural',
        version: '0.0.5-alpha',
        timestamp: '2026-05-11T14:22:11Z',
        fields: ['chapters', 'phrases', 'energy'],
      },
    ],
  };
}

function buildMockPhrases(chapters) {
  const modesByChapter = [
    ['break', 'tease', 'tease'],
    ['steady', 'steady', 'edging', 'edging', 'fast', 'fast', 'edging'],
    ['fast', 'edging', 'fast', 'fast', 'edging', 'edging',
     'fast', 'edging', 'edging', 'edging', 'fast', 'fast'],
    ['slow', 'break', 'slow'],
  ];
  const jitter = (n) => 0.72 + (((n * 9301 + 49297) % 23300) / 23300) * 0.26;

  const phrases = [];
  let pidx = 0;
  chapters.forEach((c, ci) => {
    const modes = modesByChapter[ci] || ['steady'];
    const phraseDur = (c.end_ms - c.at_ms) / modes.length;
    modes.forEach((mode, pi) => {
      phrases.push({
        chapter_idx: ci,
        at_ms: Math.round(c.at_ms + pi * phraseDur),
        end_ms: Math.round(c.at_ms + (pi + 1) * phraseDur),
        mode,
        confidence: Math.round(jitter(pidx) * 100) / 100,
        source: 'audio',
        auto_generated: true,
      });
      pidx++;
    });
  });
  return phrases;
}

function buildMockBeatMap(chapters) {
  const times_ms = [];
  const strengths = [];
  const is_downbeat = [];
  chapters.forEach((c) => {
    if (c.content_type !== 'music') return;
    const bpm = c.intent === 'build' ? 122 : 128;
    const intervalMs = 60000 / bpm;
    let beatIdx = 0;
    for (let t = c.at_ms; t < c.end_ms; t += intervalMs) {
      times_ms.push(Math.round(t));
      const posInBar = beatIdx % 4;
      const base = posInBar === 0 ? 0.85 : posInBar === 2 ? 0.65 : 0.45;
      const seed = (times_ms.length * 2654435761) >>> 0;
      const variation = ((seed % 1000) / 1000 - 0.5) * 0.18;
      strengths.push(Math.round(Math.max(0, Math.min(1, base + variation)) * 1000) / 1000);
      is_downbeat.push(posInBar === 0);
      beatIdx++;
    }
  });
  return { times_ms, strengths, is_downbeat };
}

function buildMockPerChapter(chapters, beatMap) {
  const out = {};
  chapters.forEach((c, ci) => {
    const inRange = [];
    for (let i = 0; i < beatMap.times_ms.length; i++) {
      if (beatMap.times_ms[i] >= c.at_ms && beatMap.times_ms[i] < c.end_ms) {
        inRange.push(beatMap.strengths[i]);
      }
    }
    if (inRange.length === 0) {
      out[ci] = {
        percentiles: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 },
        bpm: null,
        content_type: c.content_type,
      };
      return;
    }
    const sorted = [...inRange].sort((a, b) => a - b);
    const p = (frac) => {
      const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(frac * sorted.length)));
      return Math.round(sorted[idx] * 1000) / 1000;
    };
    const dur = (c.end_ms - c.at_ms) / 1000;
    out[ci] = {
      percentiles: { p5: p(0.05), p25: p(0.25), p50: p(0.50), p75: p(0.75), p95: p(0.95) },
      bpm: Math.round((inRange.length * 60) / dur),
      content_type: c.content_type,
    };
  });
  return out;
}
