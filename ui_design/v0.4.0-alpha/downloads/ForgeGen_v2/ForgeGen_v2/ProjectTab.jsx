// ForgeGen · Project tab.
//
// File picker + recents rail + sidecar status. Reinterprets the
// scaffold's two-pane layout with the FFP design vocabulary:
// red accent, dark editor backdrop, the "auto-chapter is a forge
// moment" treatment.

// v2 — empty Project tab on first paint. "Load sample project" pulls
// in the synthetic big_buck_bunny data. The Recents rail also lists
// the sample plus a few fake projects so the desktop-app feel reads.
const FG_RECENTS_FAKE = [
  { name: "big_buck_bunny",                  path: "/media/big_buck_bunny_1080p_h264.mov",       savedAtMs: Date.now() - 60_000,         isSample: true },
  { name: "midnight_drive",                   path: "/media/midnight_drive.mp3",                  savedAtMs: Date.now() - 26 * 60_000 },
  { name: "supermassive_dark_progression",    path: "/media/Dark Progression (2019).mp4",         savedAtMs: Date.now() - 3 * 3600_000 },
  { name: "victoriaoaks_wet_dreams_4k",       path: "/media/VictoriaOaks - Wet Dreams 4k.mp4",    savedAtMs: Date.now() - 26 * 3600_000 },
];

function ProjectTab({ project, onLoadSample, onReanalyse, onContinue, busy }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      {/* ── Recents rail ────────────────────────────────────── */}
      <ProjectRail recents={FG_RECENTS_FAKE} activePath={project?.source_path}
                   busy={busy} onPick={onLoadSample}
                   onRecentClick={onLoadSample} />

      {/* ── Main pane ───────────────────────────────────────── */}
      <FGTabBody>
        <FGTabHeader
          eyebrow="Stage 01 · Project"
          title={project ? "Project loaded" : "Bring your media"}
          subtitle={project
            ? "ForgeGen reuses the existing .chapters.json sidecar if available, otherwise runs videoflow auto-chapter to detect natural sections."
            : <>Drop an audio or video file, or click <b style={{ color: "var(--accent-2)" }}>Load sample project</b> to explore ForgeGen against the Big Buck Bunny benchmark.</>}
          right={project && (
            <Pill tone="success" dot>
              {project.name}.chapters.json
            </Pill>
          )}
        />

        {/* Drop zone — always present */}
        <DropZone onBrowse={onLoadSample} busy={busy} hasProject={!!project} />

        {/* Sidecar summary */}
        {project && !busy && (
          <SidecarSummary project={project} onReanalyse={onReanalyse} />
        )}

        {/* Pipeline summary footer */}
        {project && (
          <div style={{ marginTop: 18 }}>
            <FGSectionLabel>What ForgeGen sees</FGSectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <KpiBox label="Duration"   value={fmtMs(project.duration_ms)} icon="clock" />
              <KpiBox label="Chapters"   value={project.chapters.length} icon="layers" accent />
              <KpiBox label="BPM"        value={`${project.bpm} · ${project.meter}`} icon="activity" />
              <KpiBox label="Beats"      value={project.beats.length.toLocaleString()} icon="audio-waveform" />
            </div>
          </div>
        )}
      </FGTabBody>
    </div>
  );
}

// ── Recents rail ──────────────────────────────────────────────
function ProjectRail({ recents, activePath, busy, onPick, onRecentClick }) {
  return (
    <aside style={{
      width: "var(--rail-w)", flexShrink: 0,
      borderRight: "1px solid var(--border)",
      background: "var(--surface-2)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
        <Button kind="primary" icon="sparkles" onClick={onPick} disabled={busy}
                 style={{ width: "100%", justifyContent: "center" }}>
          {busy ? "Loading…" : "Load sample project"}
        </Button>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8, lineHeight: 1.5 }}>
          Or drop a file into the main pane. ForgeGen reuses cached sidecars when available.
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 12px" }}>
        <FGSectionLabel>Recent projects</FGSectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {recents.map(r => (
            <RecentRow key={r.path} recent={r}
                        active={r.path === activePath}
                        onClick={() => onRecentClick(r.path)} />
          ))}
        </div>
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)",
                     fontSize: 11, color: "var(--text-dim)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="info" size={11} />
          <span>Sidecars are cached at <span className="mono" style={{ color: "var(--text-muted)" }}>{"<stem>"}.chapters.json</span></span>
        </div>
      </div>
    </aside>
  );
}

function RecentRow({ recent, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px", borderRadius: 6,
      border: "1px solid",
      borderColor: active ? "var(--accent)" : "transparent",
      background: active ? "var(--accent-glow)" : "transparent",
      color: "var(--text)", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 6,
                      background: active ? "var(--accent)" : "var(--surface-3)",
                      display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name="film" size={13} style={{ color: active ? "#fff" : "var(--text-muted)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
            {recent.name}
          </span>
          {recent.isSample && <span className="mono" style={{
            fontSize: 9, padding: "1px 5px", borderRadius: 3,
            background: "var(--accent-glow)", color: "var(--accent-2)",
            border: "1px solid var(--accent-glow-strong)", flexShrink: 0,
          }}>sample</span>}
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
          {fmtRel(recent.savedAtMs)}
        </div>
      </div>
    </button>
  );
}

// ── Drop zone ────────────────────────────────────────────────
function DropZone({ onBrowse, busy, hasProject }) {
  return (
    <div onClick={busy ? undefined : onBrowse}
      style={{
      position: "relative", overflow: "hidden",
      border: `1.5px dashed ${busy ? "var(--accent-warm)" : hasProject ? "var(--border)" : "var(--accent)"}`,
      borderRadius: 12,
      padding: hasProject ? 22 : 40, textAlign: "center",
      background: hasProject ? "var(--surface-2)" : "radial-gradient(120% 80% at 50% 100%, var(--accent-glow-soft) 0%, transparent 60%), var(--surface-2)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      marginBottom: 22, cursor: busy ? "wait" : "pointer",
      transition: "padding 200ms, border-color 200ms",
    }}>
      <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
        <div style={{
          position: "absolute", inset: -12, borderRadius: "50%",
          background: "radial-gradient(circle, var(--warm-glow) 0%, transparent 70%)",
        }} />
        <Icon name={busy ? "loader-2" : "upload-cloud"} size={hasProject ? 28 : 42}
              style={{ color: "var(--accent-2)", animation: busy ? "fg-spin 1s linear infinite" : "none" }} />
      </div>
      <div style={{ fontSize: hasProject ? 14 : 17, fontWeight: 700 }}>
        {busy ? "Loading sample…" : (hasProject ? "Bring another file" : "Drop audio or video here")}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        .mp4 / .mp3 / .wav / .mkv · or click to browse
      </div>
      {!busy && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <Button kind="primary" icon="folder-open">Choose files…</Button>
          <Button kind="secondary" icon="link">From URL</Button>
          {!hasProject && (
            <Button kind="ghost" icon="sparkles"
                    style={{ borderColor: "var(--accent)", color: "var(--accent-2)", borderWidth: 1, borderStyle: "solid" }}>
              Load sample project
            </Button>
          )}
        </div>
      )}
      {!hasProject && (
        <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--text-dim)" }}>
          <Icon name="info" size={10} style={{ verticalAlign: "-1px", marginRight: 3 }} />
          The sample is the Big Buck Bunny benchmark — 7 chapters, 90 BPM, 9:55.
        </div>
      )}
    </div>
  );
}

// ── Sidecar summary ─────────────────────────────────────────
function SidecarSummary({ project, onReanalyse }) {
  return (
    <div style={{ padding: 16, borderRadius: 10,
                   background: "var(--surface)", border: "1px solid var(--border)",
                   marginBottom: 18 }}>
      <FGSectionLabel right={<Pill tone="success" dot>cached</Pill>}>
        Loaded existing sidecar
      </FGSectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 6, columnGap: 14,
                      fontSize: 12, color: "var(--text)" }}>
        <span style={{ color: "var(--text-dim)" }}>file</span>
        <span className="mono" style={{ wordBreak: "break-all" }}>{project.source_path}</span>
        <span style={{ color: "var(--text-dim)" }}>schema</span>
        <span className="mono">{project.schema} v{project.version}</span>
        <span style={{ color: "var(--text-dim)" }}>writer</span>
        <span className="mono">{project.provenance.writer} {project.provenance.version}</span>
        <span style={{ color: "var(--text-dim)" }}>analysed</span>
        <span className="mono">{project.provenance.timestamp}</span>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Button kind="ghost" size="sm" icon="rotate-cw" onClick={onReanalyse}>
          Re-analyse
        </Button>
      </div>
    </div>
  );
}

// ── KPI box ────────────────────────────────────────────────
function KpiBox({ label, value, icon, accent }) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 10,
      background: accent ? "var(--accent-glow)" : "var(--surface)",
      border: `1px solid ${accent ? "var(--accent-glow-strong)" : "var(--border)"}`,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={12} style={{ color: accent ? "var(--accent-2)" : "var(--text-dim)" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)",
                        textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      </div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--text)",
                                       letterSpacing: "-0.01em" }}>{value}</div>
    </div>
  );
}

Object.assign(window, { ProjectTab });
