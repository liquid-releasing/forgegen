// App shell — TopBar (env badge + tab nav) + active tab body.
// Sidecar + mediaPath + lastFunscript lifted here so Project / Analysis /
// Generate / Output can share state without re-fetching on tab switch.

import { useEffect, useState } from 'react';
import Library from './tabs/Library.jsx';
import Project from './tabs/Project.jsx';
import Analysis from './tabs/Analysis.jsx';
import Sources from './tabs/Sources.jsx';
import Recipes, { recipesComplete } from './tabs/Recipes.jsx';
import Generate from './tabs/Generate.jsx';
import Output from './tabs/Output.jsx';
import AppFooter from './components/common/AppFooter.jsx';
import { isTauri, pickAudioFile, readSidecar } from './api/videoflow.js';
import { addRecent, getRecents, removeRecent } from './api/recents.js';

// Device tab dropped 2026-05-11 — "device" really meant "what stroke
// density does my toy comfortably sustain?", which fits inline as the
// Target preset on Generate (see lib/targets.js). Output replaces it as
// the funscript-inspection / multi-format-export surface.
const TABS = [
  { id: 'library', label: 'Library', enabled: true },
  { id: 'project', label: 'Project', enabled: true },
  { id: 'analysis', label: 'Analysis', enabled: true },
  { id: 'sources', label: 'Sources', enabled: true },
  { id: 'recipes', label: 'Recipes', enabled: true },
  { id: 'generate', label: 'Generate', enabled: true },
  { id: 'output', label: 'Output', enabled: true },
];

export default function App() {
  const [tab, setTab] = useState('library');
  const [sidecar, setSidecar] = useState(null);
  const [mediaPath, setMediaPath] = useState(null);
  const [sourceSelections, setSourceSelections] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [recents, setRecents] = useState([]);
  const [openedProject, setOpenedProject] = useState(null);
  const [videoAnalyzed, setVideoAnalyzed] = useState(false);
  const [videoCandidate, setVideoCandidate] = useState(null);
  const [busy, setBusy] = useState(null);
  const [appError, setAppError] = useState(null);
  // The result returned by the most recent successful generateFunscript
  // call this session. Shape: { output, bpm, beats, phrases, duration_ms,
  // actions, mocked }. The Output tab gates on this — switching to Output
  // before generating shows a hint to run Generate first.
  const [lastFunscript, setLastFunscript] = useState(null);

  useEffect(() => {
    getRecents().then(setRecents).catch(() => setRecents([]));
  }, []);

  useEffect(() => {
    const count = sidecar?.chapters?.length || 0;
    setSourceSelections(Array.from({ length: count }, () => 'audio'));
    setRecipes(Array.from({ length: count }, () => null));
    setVideoAnalyzed(false);
    setVideoCandidate(null);
    setLastFunscript(null);
  }, [sidecar]);

  const nextTab = {
    library: 'project',
    project: 'analysis',
    analysis: 'sources',
    sources: 'recipes',
    recipes: 'generate',
    generate: 'output',
  }[tab];
  const gate = (() => {
    if (tab === 'library') return null;
    if (!mediaPath) return 'Open a raw audio/video media project first.';
    if (['sources', 'recipes', 'generate'].includes(tab) && !sidecar) return 'Run Analysis before continuing.';
    if (tab === 'recipes' && !recipesComplete(recipes, sidecar?.chapters?.length || 0)) {
      return 'Accept a recipe for every chapter before continuing.';
    }
    if (tab === 'generate' && !recipesComplete(recipes, sidecar?.chapters?.length || 0)) {
      return 'Complete Recipes before generating.';
    }
    if (tab === 'output' && !lastFunscript) return 'Generate a funscript before opening Output.';
    return null;
  })();
  const chainFile = mediaPath && nextTab
    ? `${mediaPath.split(/[\\/]/).pop() || 'media'}.${tab}.json`
    : null;

  function handleFooterAccept() {
    if (gate || !nextTab) return;
    setTab(nextTab);
  }

  async function refreshRecents() {
    const updated = await getRecents();
    setRecents(updated);
    return updated;
  }

  async function openMediaProject(path, { switchTo = 'project', force = false } = {}) {
    if (!path) return;
    const filename = path.split(/[\\/]/).pop() || path;
    setAppError(null);
    setBusy({ message: 'Opening media project...', detail: filename });
    setMediaPath(path);
    setOpenedProject({
      path,
      title: filename.replace(/\.[^.]+$/, ''),
      filename,
      pending: true,
    });
    setSidecar(null);
    setLastFunscript(null);
    try {
      let existing = null;
      if (!force) {
        existing = await readSidecar(path);
      }
      if (existing) {
        setSidecar(existing);
      }
      await addRecent(path);
      await refreshRecents();
      setOpenedProject({
        path,
        title: filename.replace(/\.[^.]+$/, ''),
        filename,
        hasSidecar: !!existing,
        openedAt: Date.now(),
      });
      if (switchTo) setTab(switchTo);
    } catch (err) {
      const message = err?.message ? String(err.message) : String(err);
      setAppError(`Could not open project: ${message}`);
    } finally {
      setBusy(null);
    }
  }

  async function pickAndOpenMediaProject(switchTo = 'project') {
    const picked = await pickAudioFile();
    if (!picked) return;
    await openMediaProject(picked, { switchTo });
  }

  async function removeRecentProject(path) {
    await removeRecent(path);
    await refreshRecents();
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>forgegen</h1>
        <span className="version">scaffold v0.1</span>

        <nav className="tabstrip">
          {TABS.map((t) => {
            const active = t.id === tab;
            const needsMedia = (t.id !== 'library' && !mediaPath);
            const needsSidecar = (t.id === 'sources' || t.id === 'recipes' || t.id === 'generate') && !sidecar;
            const needsRecipes = t.id === 'generate' && !recipesComplete(recipes, sidecar?.chapters?.length || 0);
            const needsFunscript = t.id === 'output' && !lastFunscript;
            const disabled = !t.enabled || needsMedia || needsSidecar || needsRecipes || needsFunscript;
            return (
              <button
                key={t.id}
                onClick={() => !disabled && setTab(t.id)}
                disabled={disabled}
                title={
                  !t.enabled
                    ? 'Not yet implemented'
                    : needsMedia
                    ? 'Open a media project first'
                    : needsSidecar
                    ? 'Run or load analysis first'
                    : needsRecipes
                    ? 'Accept every chapter recipe first'
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
        {tab === 'library' && (
          <Library
            recents={recents}
            activePath={mediaPath}
            sidecar={sidecar}
            busy={busy}
            onOpenMedia={openMediaProject}
            onPickMedia={() => pickAndOpenMediaProject('project')}
            onRemoveRecent={removeRecentProject}
            onGoToProject={() => setTab('project')}
          />
        )}
        {tab === 'project' && (
          <Project
            mediaPath={mediaPath}
            openedProject={openedProject}
            recents={recents}
            sidecar={sidecar}
            busy={busy}
            onOpenMedia={openMediaProject}
            onPickMedia={() => pickAndOpenMediaProject('project')}
            onRemoveRecent={removeRecentProject}
            onSwitchToAnalysis={() => setTab('analysis')}
            onForceAnalysis={() => {
              setSidecar(null);
              setTab('analysis');
            }}
          />
        )}
        {tab === 'analysis' && (
          <Analysis
            sidecar={sidecar}
            mediaPath={mediaPath}
            onSidecarLoaded={setSidecar}
            setBusy={setBusy}
            setAppError={setAppError}
            onContinue={() => setTab('sources')}
          />
        )}
        {tab === 'sources' && (
          <Sources
            sidecar={sidecar}
            sourceSelections={sourceSelections}
            onSourceSelectionsChange={setSourceSelections}
            videoAnalyzed={videoAnalyzed}
            onVideoAnalyzedChange={setVideoAnalyzed}
            videoCandidate={videoCandidate}
            onVideoCandidateChange={setVideoCandidate}
            onContinue={() => setTab('recipes')}
          />
        )}
        {tab === 'recipes' && (
          <Recipes
            sidecar={sidecar}
            recipes={recipes}
            onRecipesChange={setRecipes}
            sourceSelections={sourceSelections}
          />
        )}
        {tab === 'generate' && (
          <Generate
            sidecar={sidecar}
            mediaPath={mediaPath}
            sourceSelections={sourceSelections}
            videoCandidate={videoCandidate}
            acceptedRecipes={recipes}
            onFunscriptReady={setLastFunscript}
            setBusy={setBusy}
            setAppError={setAppError}
            onSwitchToOutput={() => setTab('output')}
          />
        )}
        {tab === 'output' && (
          <Output sidecar={sidecar} lastFunscript={lastFunscript} sourceSelections={sourceSelections} />
        )}
      </main>
      <AppFooter
        tab={tab}
        tabs={TABS}
        busy={busy}
        error={appError}
        gate={gate}
        chainFile={chainFile}
        onClearError={() => setAppError(null)}
        onAccept={handleFooterAccept}
      />
    </div>
  );
}
