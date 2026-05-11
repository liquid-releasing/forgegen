// App shell — TopBar (env badge + tab nav) + active tab body.
// Sidecar + mediaPath lifted here so Project / Analysis / Generate can share.

import { useState } from 'react';
import Project from './tabs/Project.jsx';
import Analysis from './tabs/Analysis.jsx';
import Generate from './tabs/Generate.jsx';
import { isTauri } from './api/videoflow.js';

const TABS = [
  { id: 'project', label: 'Project', enabled: true },
  { id: 'analysis', label: 'Analysis', enabled: true },
  { id: 'generate', label: 'Generate', enabled: true },
  { id: 'device', label: 'Device', enabled: false },
  { id: 'export', label: 'Export', enabled: false },
];

export default function App() {
  const [tab, setTab] = useState('project');
  const [sidecar, setSidecar] = useState(null);
  const [mediaPath, setMediaPath] = useState(null);

  return (
    <div className="app">
      <header className="topbar">
        <h1>forgegen</h1>
        <span className="version">scaffold v0.1</span>

        <nav className="tabstrip">
          {TABS.map((t) => {
            const active = t.id === tab;
            const needsSidecar = (t.id === 'analysis' || t.id === 'generate') && !sidecar;
            const disabled = !t.enabled || needsSidecar;
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
        {tab === 'generate' && <Generate sidecar={sidecar} mediaPath={mediaPath} />}
      </main>
    </div>
  );
}
