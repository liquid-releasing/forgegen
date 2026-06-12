import { useEffect, useMemo, useState } from 'react';
import { Button, Icon, Pill } from 'forgemoment';
import {
  addRoot,
  loadConfig,
  pickFolder,
  removeRoot,
  revealInExplorer,
  saveConfig,
  scanRoot,
} from '../api/library.js';

const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'raw', label: 'Raw' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

const SORT_OPTIONS = [
  { id: 'lastEdited', label: 'Last edited' },
  { id: 'title', label: 'Title' },
  { id: 'duration', label: 'Duration' },
];

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function fmtDuration(ms) {
  if (!ms) return null;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function fmtEdited(iso) {
  if (!iso) return '';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function sortProjects(projects, sortKey) {
  const rows = [...projects];
  if (sortKey === 'title') return rows.sort((a, b) => a.title.localeCompare(b.title));
  if (sortKey === 'duration') return rows.sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0));
  return rows.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
}

function computeLocationLabel(dirPath, rootPath, rootLabel) {
  if (!dirPath || !rootPath) return rootLabel || '';
  const normDir = dirPath.replaceAll('\\', '/');
  const normRoot = rootPath.replaceAll('\\', '/').replace(/\/$/, '');
  const rest = normDir.startsWith(normRoot) ? normDir.slice(normRoot.length).replace(/^\//, '') : '';
  return rest || rootLabel || '';
}

function CenteredMessage({ children }) {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
      {children}
    </div>
  );
}

function Header({ config, scans, scanning }) {
  const projects = [...scans.values()].reduce((n, s) => n + (s.projects?.length || 0), 0);
  const errors = [...scans.values()].reduce((n, s) => n + (s.errors?.length || 0), 0);
  return (
    <header className="fg-page-header">
      <div>
        <div className="fg-eyebrow">Library</div>
        <h2>Media projects</h2>
        <p>
          FunscriptForge library scanner, adapted for ForgeGen: raw media opens the project,
          and generated funscripts become outputs attached to that media.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Pill tone="accent" dot>{config.roots.length} roots</Pill>
        <Pill tone={scanning.size ? 'warn' : 'success'} dot>
          {scanning.size ? 'Scanning' : `${projects} projects`}
        </Pill>
        {errors > 0 && <Pill tone="danger" dot>{errors} errors</Pill>}
      </div>
    </header>
  );
}

function RootsRow({
  config,
  scans,
  scanning,
  activeRootPath,
  onSelectRoot,
  onAddRoot,
  onRemoveRoot,
  onReveal,
  onRescan,
}) {
  return (
    <div className="fg-library-roots">
      <button
        className={activeRootPath == null ? 'active' : ''}
        onClick={() => onSelectRoot(null)}
      >
        <Icon name="layers" size={14} />
        <span>All roots</span>
      </button>
      {config.roots.map((root) => {
        const scan = scans.get(root.path);
        const isScanning = scanning.has(root.path);
        return (
          <button
            key={root.path}
            className={activeRootPath === root.path ? 'active' : ''}
            onClick={() => onSelectRoot(root.path)}
            title={root.path}
          >
            <Icon name={isScanning ? 'loader-circle' : 'folder'} size={14} />
            <span>{root.label || root.path}</span>
            <em>{scan?.projects?.length ?? (isScanning ? '...' : 0)}</em>
            <i
              onClick={(event) => {
                event.stopPropagation();
                onRescan(root.path);
              }}
              title="Rescan"
            >
              <Icon name="refresh-cw" size={12} />
            </i>
            <i
              onClick={(event) => {
                event.stopPropagation();
                onReveal(root.path);
              }}
              title="Reveal"
            >
              <Icon name="folder-open" size={12} />
            </i>
            <i
              onClick={(event) => {
                event.stopPropagation();
                onRemoveRoot(root.path);
              }}
              title="Remove root"
            >
              <Icon name="x" size={12} />
            </i>
          </button>
        );
      })}
      <Button kind="secondary" size="sm" icon="plus" onClick={onAddRoot}>Add root</Button>
    </div>
  );
}

function ProjectCard({ project, selected, onOpen }) {
  const duration = fmtDuration(project.durationMs);
  return (
    <article className={`fg-library-card ${selected ? 'selected' : ''}`} onClick={() => onOpen(project)}>
      <div className="fg-library-card-head">
        <div className="fg-library-kind">{project.kind === 'video' ? 'VID' : 'AUD'}</div>
        <div style={{ minWidth: 0 }}>
          <h3>{project.title}</h3>
          <p>{project._locationLabel || project.dirPath}</p>
        </div>
      </div>
      <div className="fg-library-pills">
        {project.pills?.video && <Pill tone="warm">video</Pill>}
        {project.pills?.audio && <Pill tone="accent">audio</Pill>}
        {project.pills?.funscript && <Pill tone="success">funscript</Pill>}
        {project.pills?.forged && <Pill tone="beat">forged</Pill>}
        <Pill tone={project.status === 'raw' ? 'warn' : project.status === 'completed' ? 'success' : 'accent'}>
          {project.status}
        </Pill>
      </div>
      <div className="fg-library-meta">
        <span>{duration || fmtSize(project.sizeBytes)}</span>
        <span>{project.metadata?.chapters ? `${project.metadata.chapters} chapters` : 'no chapters sidecar'}</span>
        <span>{fmtEdited(project.mtime)}</span>
      </div>
      <div className="fg-library-path">{project.mediaPath}</div>
    </article>
  );
}

export default function Library({ activePath, onOpenMedia }) {
  const [config, setConfig] = useState(null);
  const [scans, setScans] = useState(new Map());
  const [scanning, setScanning] = useState(new Set());
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('lastEdited');
  const [query, setQuery] = useState('');
  const [activeRootPath, setActiveRootPath] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    loadConfig()
      .then((cfg) => { if (!cancelled) setConfig(cfg); })
      .catch((err) => {
        if (!cancelled) setError(String(err?.message || err));
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    if (!config) return undefined;
    let cancelled = false;
    (async () => {
      setScanning(new Set(config.roots.map((root) => root.path)));
      for (const root of config.roots) {
        try {
          const result = await scanRoot(root);
          if (cancelled) return;
          setScans((prev) => new Map(prev).set(root.path, result));
        } catch (err) {
          if (cancelled) return;
          setScans((prev) => new Map(prev).set(root.path, {
            root,
            projects: [],
            errors: [String(err?.message || err)],
            scannedAt: Date.now(),
          }));
        } finally {
          if (!cancelled) {
            setScanning((prev) => {
              const next = new Set(prev);
              next.delete(root.path);
              return next;
            });
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [config]);

  const handleAddRoot = async () => {
    const path = await pickFolder();
    if (!path) return;
    const next = addRoot(config, path);
    await saveConfig(next);
    setConfig(next);
  };

  const handleRemoveRoot = async (rootPath) => {
    const next = removeRoot(config, rootPath);
    await saveConfig(next);
    setConfig(next);
    setScans((prev) => {
      const copy = new Map(prev);
      copy.delete(rootPath);
      return copy;
    });
    if (activeRootPath === rootPath) setActiveRootPath(null);
  };

  const handleRescan = async (rootPath) => {
    const root = config.roots.find((r) => r.path === rootPath);
    if (!root) return;
    setScanning((prev) => new Set(prev).add(rootPath));
    try {
      const result = await scanRoot(root);
      setScans((prev) => new Map(prev).set(rootPath, result));
    } finally {
      setScanning((prev) => {
        const next = new Set(prev);
        next.delete(rootPath);
        return next;
      });
    }
  };

  const projects = useMemo(() => {
    if (!config) return [];
    const roots = activeRootPath
      ? config.roots.filter((root) => root.path === activeRootPath)
      : config.roots;
    let rows = [];
    for (const root of roots) {
      const scan = scans.get(root.path);
      if (!scan) continue;
      rows.push(...scan.projects.map((project) => ({
        ...project,
        _locationLabel: computeLocationLabel(project.dirPath, root.path, root.label),
      })));
    }
    if (statusFilter !== 'all') rows = rows.filter((project) => project.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((project) => (
        project.title.toLowerCase().includes(q)
        || project.mediaPath.toLowerCase().includes(q)
        || project.dirPath.toLowerCase().includes(q)
      ));
    }
    return sortProjects(rows, sortKey);
  }, [activeRootPath, config, query, scans, sortKey, statusFilter]);

  if (config === null) {
    if (error) {
      return (
        <CenteredMessage>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center' }}>
            <div>Couldn't load the library.</div>
            <code>{error}</code>
            <Button kind="secondary" size="sm" icon="refresh-ccw" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        </CenteredMessage>
      );
    }
    return <CenteredMessage>Loading library...</CenteredMessage>;
  }

  return (
    <section className="fg-library">
      <Header config={config} scans={scans} scanning={scanning} />
      <RootsRow
        config={config}
        scans={scans}
        scanning={scanning}
        activeRootPath={activeRootPath}
        onSelectRoot={setActiveRootPath}
        onAddRoot={handleAddRoot}
        onRemoveRoot={handleRemoveRoot}
        onReveal={revealInExplorer}
        onRescan={handleRescan}
      />

      <div className="fg-library-toolbar">
        <input className="fg-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" />
        <div className="fg-segmented">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={statusFilter === opt.id ? 'active' : ''}
              onClick={() => setStatusFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select className="fg-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          {SORT_OPTIONS.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
        </select>
      </div>

      {config.roots.length === 0 ? (
        <div className="fg-library-empty">
          <h3>Add a library root</h3>
          <p>ForgeGen uses the same scanner as FunscriptForge. Pick a folder that contains raw media.</p>
          <Button kind="primary" icon="plus" onClick={handleAddRoot}>Add root</Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="fg-library-empty">
          <h3>No projects match</h3>
          <p>Try a different filter, or add a root containing audio/video files.</p>
        </div>
      ) : (
        <div className="fg-library-scan-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              selected={project.mediaPath === activePath}
              onOpen={(p) => onOpenMedia(p.mediaPath, { switchTo: 'project' })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
