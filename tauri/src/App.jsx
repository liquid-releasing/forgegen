// App shell — TopBar (env badge + tab nav) + active tab body.
// Sidecar + mediaPath + lastFunscript lifted here so Project / Analysis /
// Generate / Output can share state without re-fetching on tab switch.

import { useState } from 'react';
import Project from './tabs/Project.jsx';
import Analysis from './tabs/Analysis.jsx';
import Generate from './tabs/Generate.jsx';
import Output from './tabs/Output.jsx';
import { isTauri } from './api/videoflow.js';

// Device tab dropped 2026-05-11 — "device" really meant "what stroke
// density does my toy comfortably sustain?", which fits inline as the
// Target preset on Generate (see lib/targets.js). Output replaces it as
// the funscript-inspection / multi-format-export surface.
const TABS = [
  { id: 'project', label: 'Project', enabled: true },
  { id: 'analysis', label: 'Analysis', enabled: true },
  { id: 'generate', label: 'Generate', enabled: true },
  { id: 'output', label: 'Output', enabled: true },
];

export default function App() {
  const [tab, setTab] = useState('project');
  const [sidecar, setSidecar] = useState(null);
  const [mediaPath, setMediaPath] = useState(null);
  // The result returned by the most recent successful generateFunscript
  // call this session. Shape: { output, bpm, beats, phrases, duration_ms,
  // actions, mocked }. The Output tab gates on this — switching to Output
  // before generating shows a hint to run Generate first.
  const [lastFunscript, setLastFunscript] = useState(null);

  return (
    <div className="app">
      <header className="topbar">
        <h1>forgegen</h1>
        <span className="version">scaffold v0.1</span>

        <nav className="tabstrip">
          {TABS.map((t) => {
            const active = t.id === tab;
            const needsSidecar = (t.id === 'analysis' || t.id === 'generate') && !sidecar;
            const needsFunscript = t.id === 'output' && !lastFunscript;
            const disabled = !t.enabled || needsSidecar || needsFunscript;
            return (
              <button
                key={t.id}
                onClick={() => !disabled && setTab(t.id)}
                disabled={disabled}
                title={
                  !t.enabled
                    ? 'Not yet implemented'
                    : needsSidecar
                    ? 'Load a sidecar via Project tab first'
                    : needsFunscript
                    ? 'Generate a funscript first — Output inspects what Generate produced'
                    : ''
                }
                className={`tabbutton ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <span
          className="env-badge"
          data-env={isTauri() ? 'tauri' : 'browser'}
          title={
            isTauri()
              ? 'Real Tauri runtime — bridge calls reach videoflow'
              : 'Browser-only — bridge calls return mock data'
          }
        >
          {isTauri() ? 'Tauri' : 'browser-only'}
        </span>
      </header>

      <main>
        {tab === 'project' && (
          <Project
            sidecar={sidecar}
            onSidecarLoaded={setSidecar}
            onMediaPathChanged={setMediaPath}
            onSwitchToAnalysis={() => setTab('analysis')}
          />
        )}
        {tab === 'analysis' && (
          <Analysis sidecar={sidecar} onContinue={() => setTab('generate')} />
        )}
        {tab === 'generate' && (
          <Generate
            sidecar={sidecar}
            mediaPath={mediaPath}
            onFunscriptReady={setLastFunscript}
            onSwitchToOutput={() => setTab('output')}
          />
        )}
        {tab === 'output' && (
          <Output sidecar={sidecar} lastFunscript={lastFunscript} />
        )}
      </main>
    </div>
  );
}
