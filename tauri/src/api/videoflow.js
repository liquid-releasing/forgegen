// Bridge client — wraps Tauri invoke() for videoflow CLI commands.
//
// In browser-only mode (npm run dev), Tauri isn't loaded; calls fall back
// to mock data so UI iteration doesn't require the Rust runtime.
//
// See ../../../BRIDGE_DESIGN.md for the protocol and ../README.md for
// run modes.

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

export async function autoChapter(path) {
  return invokeOrMock('auto_chapter', { path }, () => mockAutoChapter(path));
}

// ---------------------------------------------------------------------------
// Mocks (browser-only mode)
// ---------------------------------------------------------------------------

function mockListPatterns() {
  // Mirror the videoflow.patterns CATALOG shape — kept tiny on purpose.
  // Real catalog comes from `videoflow patterns-list` in Tauri mode.
  return {
    version: 1,
    patterns: [
      {
        id: 'h_pulse', label: 'Pulse', color: '#4cc3ff', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Steady on/off oscillation. The metronome.',
      },
      {
        id: 'h_wave', label: 'Wave', color: '#3ed598', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Smooth sine envelope across active regions.',
      },
      {
        id: 'h_rolling', label: 'Rolling', color: '#ffb547', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Sensation chases around the body.',
      },
      {
        id: 'h_tremor', label: 'Tremor', color: '#c77dff', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Random flutter. No fixed period.',
      },
      {
        id: 'h_sustain', label: 'Sustain', color: '#8b9bff', category: 'haptic',
        consumers: ['haptic', 'stim', 'edit', 'multiaxis'],
        summary: 'Hold a steady pressure. The drone.',
      },
      {
        id: 'h_impact', label: 'Impact', color: '#ff4b4b', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Sharp punctuation. Rare, high-intensity hits.',
      },
      {
        id: 'h_reactive', label: 'Reactive', color: '#56e0a0', category: 'haptic',
        consumers: ['haptic', 'edit', 'stim', 'multiaxis'],
        summary: 'Audio-following. No inherent shape — envelope = audio energy.',
      },
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

function mockAutoChapter(path) {
  return Promise.reject(
    new Error(
      `Browser-only mock — autoChapter(${path}) not implemented. ` +
        `Run npm run tauri:dev to use the real bridge.`
    )
  );
}
