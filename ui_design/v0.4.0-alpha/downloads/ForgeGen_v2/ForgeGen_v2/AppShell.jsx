// ForgeGen AppShell — TopBar / pipeline pathway / status bar / accept bar.
// Same structural pattern as ForgeAssembler / BeatFlo, retuned for the
// 4-stage forgegen pipeline (Project → Analysis → Generate → Output).
//
// Brand: FunscriptForge red accent + a small forge-spark moment on the
// brand glyph and the active-stage indicator.

// ── Brand glyph (forge / tesla-coil) ──────────────────────────────
function FGGlyph({ size = 32 }) {
  // A small mechanical-forge mark: a Tesla-coil silhouette with two
  // spheres on top, lightning arcs in electric blue, and orange embers
  // at the base. Reads cleanly at 32×32 without being pictogram-noisy.
  const w = size, h = size;
  return (
    <svg width={w} height={h} viewBox="0 0 32 32" aria-hidden="true"
         style={{ flexShrink: 0, filter: "drop-shadow(0 0 6px rgba(255,140,66,0.35))" }}>
      <defs>
        <linearGradient id="fg-coil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a5f72" />
          <stop offset="0.4" stopColor="#22252e" />
          <stop offset="1" stopColor="#0e1117" />
        </linearGradient>
        <radialGradient id="fg-ember" cx="50%" cy="80%" r="60%">
          <stop offset="0" stopColor="#ffd166" />
          <stop offset="0.4" stopColor="#ff8c42" />
          <stop offset="1" stopColor="#ff8c42" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Coil body */}
      <rect x="11" y="9"  width="10" height="14" rx="1" fill="url(#fg-coil)" stroke="#3a3f5c" strokeWidth="0.4" />
      {/* Horizontal winding lines */}
      {[11, 13, 15, 17, 19, 21].map(y => (
        <line key={y} x1="11.5" y1={y} x2="20.5" y2={y} stroke="#0a0d14" strokeWidth="0.5" opacity="0.7" />
      ))}
      {/* Top platter */}
      <ellipse cx="16" cy="9" rx="6" ry="1.6" fill="#3a3f5c" />
      <ellipse cx="16" cy="9" rx="5"   ry="1.2" fill="#22252e" />
      {/* Two top spheres */}
      <circle cx="11.5" cy="7.5" r="2.4" fill="#22252e" stroke="#5a5f72" strokeWidth="0.4" />
      <circle cx="20.5" cy="7.5" r="2.4" fill="#22252e" stroke="#5a5f72" strokeWidth="0.4" />
      {/* Lightning arcs */}
      <path d="M11.5 5.5 Q 14 4 16 5.5 Q 18 7 20.5 5.5"
            fill="none" stroke="#5b9dff" strokeWidth="1.1" strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 2px #5b9dff)" }} />
      <path d="M11.5 6.5 Q 14 8 16 6.5 Q 18 5 20.5 6.5"
            fill="none" stroke="#5b9dff" strokeWidth="0.6" strokeLinecap="round" opacity="0.7" />
      {/* Ember base */}
      <ellipse cx="16" cy="25" rx="9" ry="3.5" fill="url(#fg-ember)" />
      <circle cx="16" cy="24"   r="0.5" fill="#ffd166" />
      <circle cx="13" cy="25.5" r="0.4" fill="#ffd166" opacity="0.7" />
      <circle cx="19" cy="25.2" r="0.4" fill="#ffd166" opacity="0.7" />
    </svg>
  );
}

// ── TopBar ────────────────────────────────────────────────────────
function FGTopBar({ project, dirty, lastSavedAtMs, onOpen, onSave,
                    onToggleTweaks, tweaksOpen,
                    canUndo, canRedo, undoLabel, redoLabel, undoDepth, onUndo, onRedo }) {
  const filename = project.filename || `${project.name}.chapters.json`;
  return (
    <header style={{
      height: "var(--header-h)", padding: "0 18px", flexShrink: 0,
      background: "var(--surface)", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <FGGlyph size={32} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>ForgeGen</span>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--text-dim)" }}>v0.3-alpha</span>
          <Pill tone="accent" dot>{project.engine || "videoflow 0.4"}</Pill>
        </div>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
          {filename}
          {dirty && <span style={{ marginLeft: 6, color: "var(--accent-warm-2)" }}>· unsaved</span>}
          {!dirty && lastSavedAtMs && <span style={{ marginLeft: 6 }}>· saved {fmtRel(lastSavedAtMs)}</span>}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Button kind="ghost" size="icon"
                 title={canUndo ? `Undo${undoLabel ? `: ${undoLabel}` : ""} (⌘Z)` : "Nothing to undo"}
                 onClick={onUndo} disabled={!canUndo}>
          <Icon name="undo-2" size={14} />
        </Button>
        <Button kind="ghost" size="icon"
                 title={canRedo ? `Redo${redoLabel ? `: ${redoLabel}` : ""} (⌘⇧Z)` : "Nothing to redo"}
                 onClick={onRedo} disabled={!canRedo}>
          <Icon name="redo-2" size={14} />
        </Button>
        {undoDepth > 0 && (
          <span className="mono" title={`${undoDepth} undoable action${undoDepth === 1 ? "" : "s"}`}
                 style={{ fontSize: 10, color: "var(--text-dim)", marginRight: 4 }}>
            {undoDepth}
          </span>
        )}
        <Button kind="secondary" size="sm" icon="folder-open" onClick={onOpen}>Open</Button>
        <Button kind={dirty ? "primary" : "secondary"} size="sm" icon="save" onClick={onSave}>
          {dirty ? "Save" : "Saved"}
        </Button>
        {onToggleTweaks && (
          <Button kind={tweaksOpen ? "primary" : "secondary"} size="sm" icon="sliders-horizontal"
                   onClick={onToggleTweaks} title="Toggle Tweaks panel (⌘K)">
            Tweaks
          </Button>
        )}
      </div>
    </header>
  );
}

function fmtRel(ms) {
  const dt = Math.max(0, (Date.now() - ms) / 1000);
  if (dt < 5)    return "just now";
  if (dt < 60)   return `${Math.round(dt)}s ago`;
  if (dt < 3600) return `${Math.round(dt / 60)} min ago`;
  return `${Math.round(dt / 3600)}h ago`;
}

// ── Pipeline pathway ─────────────────────────────────────────────
// Five linear stages. Each writes a chained artifact the next reads.
// Project   → input.json   (media + sidecar load)
// Analysis  → chapters.json (auto-detected structure, read-only review)
// Recipes   → recipes.json  (per-chapter influence mix + style knobs)
// Generate  → <stem>.funscript
// Output    → completed run (signed off + exported)
const FG_STAGES = [
  { id: "project",  label: "Project",  icon: "folder-open",   hint: "media in" },
  { id: "analysis", label: "Analysis", icon: "scan-line",     hint: "review structure" },
  { id: "recipes",  label: "Recipes",  icon: "sliders-vertical", hint: "mix influences" },
  { id: "generate", label: "Generate", icon: "wand-sparkles", hint: "forge the script" },
  { id: "output",   label: "Output",   icon: "activity",      hint: "inspect + export" },
];

function FGStageButton({ s, i, active, pipeline, onChange }) {
  const isActive = s.id === active;
  const accepted = pipeline[s.id]?.accepted;
  const upstream = i === 0 ? null : FG_STAGES[i - 1];
  const upOk = !upstream || pipeline[upstream.id]?.accepted;
  const notReady = !upOk && !isActive;
  return (
    <button onClick={() => onChange(s.id)} disabled={notReady}
      style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 18px", border: "none", background: "transparent",
      color: isActive ? "var(--text)" : (notReady ? "var(--text-dim)" : "var(--text-muted)"),
      cursor: notReady ? "not-allowed" : "pointer", fontFamily: "inherit",
      fontSize: 13, fontWeight: 600,
      borderBottom: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
      opacity: notReady ? 0.5 : 1, position: "relative",
    }}>
      <span className="mono" style={{
        display: "inline-grid", placeItems: "center",
        width: 24, height: 24, borderRadius: 6,
        background: isActive ? "var(--accent)" :
                     (accepted ? "var(--accent-glow)" : "var(--surface-3)"),
        color: isActive ? "#fff" : (accepted ? "var(--accent-2)" : "var(--text-dim)"),
        fontSize: 10, fontWeight: 700,
      }}>{String(i + 1).padStart(2, "0")}</span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.15 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name={s.icon} size={13} />
          <span>{s.label}</span>
        </span>
        <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 500 }}>{s.hint}</span>
      </div>
      {accepted && <span style={{
        position: "absolute", top: 8, right: 8,
        width: 6, height: 6, borderRadius: "50%", background: "var(--success)",
        boxShadow: "0 0 6px rgba(62,213,152,0.6)",
      }} />}
    </button>
  );
}

function FGPathway({ active, onChange, pipeline }) {
  return (
    <nav style={{
      display: "flex", alignItems: "stretch",
      background: "var(--surface)", borderBottom: "1px solid var(--border)",
      padding: "0 12px", gap: 0, flexShrink: 0,
    }}>
      {FG_STAGES.map((s, i) => (
        <React.Fragment key={s.id}>
          {i > 0 && <PathwayConnector i={i} pipeline={pipeline} />}
          <FGStageButton s={s} i={i} active={active} pipeline={pipeline} onChange={onChange} />
        </React.Fragment>
      ))}
      <div style={{ flex: 1 }} />
    </nav>
  );
}

function PathwayConnector({ i, pipeline }) {
  const up = FG_STAGES[i - 1];
  const lit = pipeline[up.id]?.accepted;
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "0 2px",
                  color: lit ? "var(--accent-2)" : "var(--text-dim)", opacity: lit ? 1 : 0.5 }}>
      <Icon name="chevron-right" size={14} />
    </div>
  );
}

// ── AcceptBar — bottom of every stage ─────────────────────────────
function FGAcceptBar({ summary, chainFile, accepted, onAccept, onReset,
                       primaryLabel = "Accept and continue", primaryIcon = "check",
                       secondary }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 22px", background: "var(--surface)",
      borderTop: "1px solid var(--border)", flexShrink: 0,
    }}>
      <Icon name={accepted ? "circle-check-big" : "info"} size={16}
            style={{ color: accepted ? "var(--success)" : "var(--text-dim)" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
        <span style={{ fontSize: 12, color: "var(--text)" }}>{summary}</span>
        {chainFile && (
          <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
            writes <span style={{ color: "var(--accent-2)" }}>{chainFile}</span> · next stage reads this
          </span>
        )}
      </div>
      {accepted && <Pill tone="success" dot>Accepted</Pill>}
      {secondary}
      <Button kind="ghost" size="sm" onClick={onReset}>Reset</Button>
      <Button kind={accepted ? "secondary" : "primary"} icon={accepted ? "rotate-cw" : primaryIcon}
              onClick={onAccept}>
        {accepted ? "Re-accept" : primaryLabel}
      </Button>
    </div>
  );
}

// ── StatusBar ─────────────────────────────────────────────────────
function FGStatusBar({ activeTab, project, chainFile, engine = "videoflow 0.4" }) {
  return (
    <footer style={{
      height: "var(--status-h)", padding: "0 14px", flexShrink: 0,
      background: "var(--surface)", borderTop: "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: 14, fontSize: 11, color: "var(--text-dim)",
    }}>
      <span><Icon name="circle-check" size={11}
                  style={{ verticalAlign: "-1px", color: "var(--success)", marginRight: 4 }} />Ready</span>
      <span className="mono">stage: {activeTab}</span>
      {project && (<>
        <span className="mono">chapters: {project.chapters?.length || 0}</span>
        <span className="mono">phrases: {project.phrases?.length || 0}</span>
        <span className="mono">beats: {project.beats?.length || 0}</span>
      </>)}
      {chainFile && <span className="mono">→ {chainFile}</span>}
      <div style={{ flex: 1 }} />
      <span className="mono">{engine}</span>
      <span>ForgeGen v0.3-alpha</span>
    </footer>
  );
}

// ── Layout helpers ────────────────────────────────────────────────
function FGTabBody({ children, padded = true, style = {} }) {
  return (
    <div style={{
      flex: 1, minHeight: 0, overflow: "auto",
      padding: padded ? "20px 24px 16px" : 0,
      background: "var(--bg)", ...style,
    }}>{children}</div>
  );
}

function FGTabHeader({ title, subtitle, eyebrow, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end",
                  justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
      <div>
        {eyebrow && <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-dim)",
                                  textTransform: "uppercase", letterSpacing: "0.1em",
                                  marginBottom: 6 }}>{eyebrow}</div>}
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6,
                                   maxWidth: 760, lineHeight: 1.5 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function FGSectionLabel({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  fontSize: 10.5, fontWeight: 700, color: "var(--text-dim)",
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  marginBottom: 10, marginTop: 4 }}>
      <span>{children}</span>
      {right}
    </div>
  );
}

// ── Toast banner ─────────────────────────────────────────────────
function FGToast({ toast, onClose }) {
  if (!toast) return null;
  let icon = "info", title = "", body = null, accent = "var(--accent)";
  if (toast.kind === "frame") {
    icon = "frame"; title = `Output frame: ${toast.label}`; body = toast.body;
    accent = "var(--accent-warm)";
  } else if (toast.kind === "generated") {
    icon = "wand-sparkles"; title = "Funscript generated";
    body = toast.body; accent = "var(--accent)";
  } else if (toast.kind === "saved") {
    icon = "save"; title = toast.title || "Saved"; body = toast.body;
    accent = "var(--success)";
  } else if (toast.kind === "undo" || toast.kind === "redo") {
    icon = toast.kind === "undo" ? "undo-2" : "redo-2";
    title = `${toast.kind === "undo" ? "Undid" : "Redid"} · ${toast.label}`;
    accent = "var(--text-muted)";
  } else if (toast.kind === "text") {
    icon = toast.icon || "info"; title = toast.title; body = toast.body;
    accent = toast.accent || "var(--accent)";
  }
  return (
    <div role="status" style={{
      position: "fixed", left: "50%", bottom: 64, transform: "translateX(-50%)",
      zIndex: 200, minWidth: 320, maxWidth: 520,
      background: "var(--surface)", border: `1px solid ${accent}`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: 8, boxShadow: "var(--elev-3)",
      padding: "10px 14px",
      display: "flex", alignItems: "flex-start", gap: 10,
      animation: "fg-toast-in 200ms var(--ease-emph)",
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 6,
                     display: "grid", placeItems: "center",
                     background: "var(--surface-3)", flexShrink: 0 }}>
        <Icon name={icon} size={14} style={{ color: accent }} />
      </div>
      <div style={{ flex: 1, lineHeight: 1.35 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{title}</div>
        {body && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{body}</div>}
      </div>
      <button onClick={onClose} aria-label="Dismiss" style={{
        width: 22, height: 22, borderRadius: 4, border: "none", background: "transparent",
        color: "var(--text-dim)", cursor: "pointer", display: "grid", placeItems: "center",
      }}><Icon name="x" size={12} /></button>
    </div>
  );
}

// ── Time formatters ──────────────────────────────────────────────
function fmtMs(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
function fmtMsPrecise(ms) {
  const sec = Math.max(0, ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

Object.assign(window, {
  FGGlyph, FGTopBar, FGPathway, FGStatusBar, FGAcceptBar,
  FGTabBody, FGTabHeader, FGSectionLabel, FGToast,
  FG_STAGES,
  fmtMs, fmtMsPrecise, fmtRel,
});
