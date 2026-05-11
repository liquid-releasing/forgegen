import { useState, useEffect } from 'react';
import Project from './tabs/Project.jsx';
import { listPatterns, isTauri } from './api/videoflow.js';

export default function App() {
  const [patterns, setPatterns] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPatterns()
      .then((data) => {
        setPatterns(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <h1>forgegen</h1>
        <span className="version">scaffold v0</span>
        <span className="env-badge" data-env={isTauri() ? 'tauri' : 'browser'}>
          {isTauri() ? 'Tauri' : 'browser-only'}
        </span>
      </header>

      <main>
        <Project />

        <section className="bridge-test">
          <h2>Bridge sanity check — videoflow patterns-list</h2>

          {loading && <div className="status">Loading…</div>}

          {error && (
            <div className="error">
              <strong>Bridge error:</strong> {error}
              {!isTauri() && (
                <p className="hint">
                  Browser-only mode — the bridge can't reach videoflow without
                  Tauri. Run <code>npm run tauri:dev</code> for the real bridge.
                </p>
              )}
            </div>
          )}

          {patterns && (
            <>
              <div className="status">
                {patterns.patterns.length} patterns loaded
                {!isTauri() && <span className="muted"> (mock data)</span>}
              </div>
              <ul className="patterns">
                {patterns.patterns.map((p) => (
                  <li key={p.id} style={{ borderLeftColor: p.color }}>
                    <div className="pattern-head">
                      <strong>{p.label}</strong>
                      <code>{p.id}</code>
                    </div>
                    <div className="pattern-summary">{p.summary}</div>
                    <div className="pattern-consumers">
                      {p.consumers.map((c) => (
                        <span key={c} className="consumer-chip">
                          {c}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
