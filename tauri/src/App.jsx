// App shell — TopBar (env badge + tab nav) + active tab body.
// Sidecar state lifted here so Project and Analysis can share it.

import { useState } from 'react';
import Project from './tabs/Project.jsx';
import Analysis from './tabs/Analysis.jsx';
import { isTauri } from './api/videoflow.js';

const TABS = [
  { id: 'project', label: 'Project', enabled: true },
  { id: 'analysis', label: 'Analysis', enabled: true },
  { id: 'generate', label: 'Generate', enabled: false },
  { id: 'device', label: 'Device', enabled: false },
  { id: 'export', label: 'Export', enabled: false },
];

export default function App() {
  const [tab, setTab] = useState('project');
  const [sidecar, setSidecar] = useState(null);

  return (
    <div className="app">
      <header className="topbar">
        <h1>forgegen</h1>
        <span className="version">scaffold v0.1</span>

        <nav className="tabstrip">
          {TABS.map((t) => {
            const active = t.id === tab;
            const requiresSidecar = t.id === 'analysis' && !sidecar;
            const disabled = !t.enabled || requiresSidecar;
            return (
              <button
                key={t.id}
                onClick={() => !disabled && setTab(t.id)}
                disabled={disabled}
                title={
                  !t.enabled
                    ? 'Not yet implemented'
                    : requiresSidecar
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
        {tab === 'project' && <Project sidecar={sidecar} onSidecarLoaded={setSidecar} />}
        {tab === 'analysis' && <Analysis sidecar={sidecar} />}
      </main>
    </div>
  );
}
