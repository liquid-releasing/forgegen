// ForgeGen · Analysis tab — read-only sidecar viewer.
//
// Reinterprets the scaffold's Analysis tab in the FFP visual language:
//   • Chapter strip (clickable, focusable)
//   • Beat-strength bars (the headline visual)
//   • Per-chapter KPI strip + heat-ribbon (novel)
//   • Tabbed category panel (Structure · Beats · Phrases · Energy)
//   • Chapter focus row (compact per-chapter inspector)
//   • Provenance footer
//
// Analysis writes nothing — every artifact is read from the sidecar.
// Accepting the stage signals "the analysis is sensible" and lights up
// the Generate stage.

function AnalysisTab({ project, focusedIdx, onFocus,
                       category, onSetCategory, onContinue }) {
  return (
    <FGTabBody>
      <FGTabHeader
        eyebrow="Stage 02 · Analysis"
        title="Review the structure"
        subtitle="ForgeGen reads the natural sections from your audio — silence, energy transitions, recurrence — then runs the analysis per chapter so a quiet section isn't drowned out by a loud one. Click any chapter to inspect."
      />

      {/* Chapter strip (script overview) */}
      <FGSectionLabel right={<span style={{ color: "var(--text-dim)" }}>click to focus</span>}>
        Script overview
      </FGSectionLabel>
      <ChapterStrip project={project} focusedIdx={focusedIdx} onFocus={onFocus} />

      {/* Main timeline — beat-strength bars + chapter ribbon */}
      <div style={{ marginTop: 16 }}>
        <FGSectionLabel>Beat strength · per-beat envelope</FGSectionLabel>
        <BeatStrengthTimeline project={project} focusedIdx={focusedIdx} onFocus={onFocus} />
      </div>

      {/* Heat ribbon — novel: per-chapter at-a-glance "alive vs flat" */}
      <div style={{ marginTop: 16 }}>
        <FGSectionLabel right={<span style={{ color: "var(--text-dim)" }}>per chapter</span>}>
          Energy heat ribbon
        </FGSectionLabel>
        <HeatRibbon project={project} focusedIdx={focusedIdx} onFocus={onFocus} />
      </div>

      {/* KPI strip */}
      <div style={{ marginTop: 16 }}>
        <FGSectionLabel>Pre-generation stats</FGSectionLabel>
        <KpiStrip project={project} />
      </div>

      {/* Tabbed analysis panel */}
      <div style={{ marginTop: 16 }}>
        <CategoryTabs active={category} onChange={onSetCategory} />
        <CategoryCanvas project={project} categoryId={category}
                          focusedIdx={focusedIdx} onFocus={onFocus} />
      </div>

      {/* Provenance footer */}
      <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid var(--border)",
                      textAlign: "center", fontSize: 11, color: "var(--text-dim)",
                      fontFamily: "var(--font-mono)" }}>
        Last analysed by {project.provenance.writer} {project.provenance.version} · {project.provenance.timestamp}
      </div>
    </FGTabBody>
  );
}

// ── Chapter strip ─────────────────────────────────────────────
function ChapterStrip({ project, focusedIdx, onFocus }) {
  const total = project.duration_ms;
  return (
    <div style={{ display: "flex", height: 56, gap: 0, minWidth: 0,
                   borderRadius: 8, overflow: "hidden",
                   background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      {project.chapters.map((c, i) => {
        const flex = c.duration_ms / total;
        const focused = i === focusedIdx;
        return (
          <button key={c.id} onClick={() => onFocus(i)}
            style={{
              flex, minWidth: 0,
              background: focused ? c.color : `color-mix(in srgb, ${c.color} 60%, transparent)`,
              borderTop: focused ? "3px solid #fff" : "3px solid transparent",
              borderRight: i < project.chapters.length - 1 ? "1px solid rgba(0,0,0,0.45)" : "none",
              border: "none",
              cursor: "pointer", textAlign: "left",
              padding: "8px 12px",
              display: "flex", flexDirection: "column", justifyContent: "center", gap: 2,
              fontFamily: "inherit",
              color: "#fff",
              boxShadow: focused ? "inset 0 -3px 0 #fff" : "none",
              outline: focused ? "1px solid rgba(255,255,255,0.4)" : "none",
              outlineOffset: -1,
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5,
                            fontWeight: 700, opacity: 0.9, letterSpacing: "0.05em",
                            textTransform: "uppercase", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>
              <span className="mono">{String(i + 1).padStart(2, "0")}</span>
              <span>· {c.contentType}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>
              {c.name}
            </div>
            <div style={{ fontSize: 9.5, opacity: 0.85, fontFamily: "var(--font-mono)" }}>
              {fmtMs(c.duration_ms)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Beat strength timeline ────────────────────────────────────
// The headline visualization. Each beat is a vertical bar whose height
// = strength. Downbeats in orange, off-beats in muted blue. The chapter
// ribbon underneath maps each beat to its chapter.
function BeatStrengthTimeline({ project, focusedIdx, onFocus }) {
  const total = project.duration_ms;
  const beats = project.beats;
  // Downsample for fast render — at most 360 visible bars.
  const stride = Math.max(1, Math.floor(beats.length / 360));
  const visible = [];
  for (let i = 0; i < beats.length; i += stride) {
    // Max strength of stride window so downbeats survive.
    let max = beats[i], maxStr = beats[i].strength;
    for (let j = i + 1; j < Math.min(beats.length, i + stride); j++) {
      if (beats[j].strength > maxStr) { max = beats[j]; maxStr = beats[j].strength; }
    }
    visible.push(max);
  }
  return (
    <div style={{
      position: "relative", background: "var(--surface-2)",
      border: "1px solid var(--border)", borderRadius: 8, padding: 4,
      overflow: "hidden",
    }}>
      <div style={{ position: "relative", height: 110, display: "flex", alignItems: "flex-end", gap: 1 }}>
        {visible.map((b, i) => (
          <div key={i} style={{
            flex: 1,
            height: `${b.strength * 100}%`,
            background: b.is_downbeat ? "var(--accent-warm)" : "var(--accent-elec)",
            opacity: b.is_downbeat ? 0.95 : 0.6,
            borderRadius: "1px 1px 0 0",
            boxShadow: b.is_downbeat ? "0 0 4px var(--warm-glow)" : "none",
          }} />
        ))}
      </div>
      {/* Chapter ribbon underneath */}
      <div style={{ display: "flex", height: 22, gap: 0, marginTop: 4 }}>
        {project.chapters.map((c, i) => {
          const flex = c.duration_ms / total;
          const focused = i === focusedIdx;
          return (
            <button key={c.id} onClick={() => onFocus(i)} title={c.name}
              style={{
                flex, minWidth: 0,
                background: focused ? c.color : `color-mix(in srgb, ${c.color} 60%, transparent)`,
                border: "none",
                borderRight: i < project.chapters.length - 1 ? "1px solid rgba(0,0,0,0.4)" : "none",
                color: "#fff", fontFamily: "inherit", fontSize: 10, fontWeight: 700,
                cursor: "pointer", padding: "0 8px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                textShadow: "0 1px 2px rgba(0,0,0,0.45)", textAlign: "left",
              }}>{c.name}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Heat ribbon (novel) ───────────────────────────────────────
// Each chapter becomes a horizontal stripe coloured by its energy +
// IQR. Hot reds for energetic chapters, cool blues for calm. Click to
// focus. Shows phrase-mode tile underneath each chapter.
function HeatRibbon({ project, focusedIdx, onFocus }) {
  const total = project.duration_ms;
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)",
                    borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", height: 36 }}>
        {project.chapters.map((c, i) => {
          const flex = c.duration_ms / total;
          const focused = i === focusedIdx;
          const k = project.energy.per_chapter[i];
          // Heat colour from energy_mean.
          const heat = blendHexes("#1f3a8a", "#ff4b4b", k.energy_mean);
          return (
            <button key={c.id} onClick={() => onFocus(i)} title={`${c.name} · energy ${(k.energy_mean*100).toFixed(0)}%`}
              style={{
                flex, minWidth: 0, height: "100%",
                background: heat,
                border: "none",
                borderRight: i < project.chapters.length - 1 ? "1px solid rgba(0,0,0,0.45)" : "none",
                position: "relative", cursor: "pointer",
                outline: focused ? "2px solid #fff" : "none",
                outlineOffset: -2,
              }}>
              {/* Phrase-mode tile bar */}
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0,
                              display: "flex", height: 8 }}>
                {project.phrases.filter(p => p.chapter_id === c.id).map(p => (
                  <div key={p.id} style={{
                    flex: p.duration_ms,
                    background: fgModeVar(p.mode),
                    opacity: 0.95,
                  }} />
                ))}
              </div>
              {/* Chapter index + energy readout */}
              <div style={{ position: "absolute", left: 6, top: 4,
                              fontSize: 9, fontWeight: 700,
                              color: "rgba(255,255,255,0.95)",
                              textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                              fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
                {String(i + 1).padStart(2, "0")} · {(k.energy_mean * 100).toFixed(0)}%
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function blendHexes(a, b, t) {
  function p(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
  const [ar,ag,ab] = p(a), [br,bg,bb] = p(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

// ── KPI strip ────────────────────────────────────────────────
function KpiStrip({ project }) {
  // Aggregate values across chapters.
  const meanEnergy = project.energy.per_chapter.reduce((a, c) => a + c.energy_mean, 0)
                     / project.energy.per_chapter.length;
  const downbeatCount = project.beats.filter(b => b.is_downbeat).length;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
      <KpiCard label="Chapters" value={project.chapters.length} subtitle={`${(project.duration_ms / 60_000).toFixed(1)} min`} icon="layers" />
      <KpiCard label="Phrases" value={project.phrases.length} subtitle="across all chapters" icon="rows-3" />
      <KpiCard label="Beats" value={project.beats.length.toLocaleString()} subtitle={`${downbeatCount} downbeats`} icon="audio-waveform" />
      <KpiCard label="Mean energy" value={`${(meanEnergy * 100).toFixed(0)}%`} subtitle="per chapter avg" icon="flame" warm />
      <KpiCard label="Confidence" value={`${(project.chapters.reduce((a, c) => a + c.confidence, 0) / project.chapters.length * 100).toFixed(0)}%`}
                subtitle="auto-chapter avg" icon="circle-check-big" success />
    </div>
  );
}

function KpiCard({ label, value, subtitle, icon, warm, success }) {
  const accent = warm ? "var(--accent-warm-2)" : success ? "var(--success)" : "var(--accent-2)";
  return (
    <div style={{ padding: 12, borderRadius: 8, background: "var(--surface)",
                    border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={12} style={{ color: accent }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)",
                        textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--text)",
                                       letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{subtitle}</div>
    </div>
  );
}

// ── Category tabs ────────────────────────────────────────────
const CATEGORIES = [
  { id: "structure", label: "Structure", icon: "layers",
    headline: "Chapters and phrases",
    desc: "How the track breaks into natural sections, and the modes inside each." },
  { id: "beats", label: "Beats", icon: "audio-waveform",
    headline: "Beat grid stability",
    desc: "PLP-detected beats with downbeat markers. Long-form stable to ±15ms across an album." },
  { id: "phrases", label: "Phrases", icon: "rows-3",
    headline: "Phrase modes",
    desc: "Each phrase classified by mode — break / tease / slow / steady / fast / edging." },
  { id: "energy", label: "Energy", icon: "flame",
    headline: "Per-chapter energy",
    desc: "Mean + peak energy per chapter, normalised within each chapter's own range." },
];

function CategoryTabs({ active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 0 }}>
      {CATEGORIES.map(c => {
        const isActive = c.id === active;
        return (
          <button key={c.id} onClick={() => onChange(c.id)} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 14px",
            borderRadius: "8px 8px 0 0",
            border: "1px solid",
            borderColor: isActive ? "var(--accent)" : "var(--border)",
            borderBottom: isActive ? "1px solid transparent" : "1px solid var(--border)",
            background: isActive ? "var(--surface)" : "var(--surface-2)",
            color: isActive ? "var(--text)" : "var(--text-muted)",
            cursor: "pointer", fontFamily: "inherit",
            fontSize: 12, fontWeight: 600,
            marginBottom: -1,
            position: "relative", zIndex: isActive ? 1 : 0,
          }}>
            <Icon name={c.icon} size={12} />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function CategoryCanvas({ project, categoryId, focusedIdx, onFocus }) {
  const cat = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
  return (
    <div style={{
      padding: 16, borderRadius: "0 8px 8px 8px",
      background: "var(--surface)", border: "1px solid var(--accent)",
      borderTop: "1px solid var(--accent)",
      marginTop: -1,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>{cat.headline}</h2>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{cat.desc}</span>
      </div>
      {categoryId === "structure"  && <StructureView project={project} onFocus={onFocus} />}
      {categoryId === "beats"      && <BeatsView project={project} />}
      {categoryId === "phrases"    && <PhrasesView project={project} />}
      {categoryId === "energy"     && <EnergyView project={project} />}
    </div>
  );
}

function StructureView({ project, onFocus }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
      {project.chapters.map((c, i) => {
        const k = project.energy.per_chapter[i];
        return (
          <div key={c.id} onClick={() => onFocus(i)}
            style={{ padding: 12, borderRadius: 8, background: "var(--surface-2)",
                      border: "1px solid var(--border)", cursor: "pointer",
                      borderLeft: `4px solid ${c.color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
              <div style={{ flex: 1 }} />
              <Pill tone="neutral">{c.contentType}</Pill>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
              <span><span className="mono">{fmtMs(c.duration_ms)}</span></span>
              <span><span className="mono">{c.beats}</span> beats</span>
              <span>energy <span className="mono" style={{ color: "var(--accent-warm-2)" }}>
                {(k.energy_mean * 100).toFixed(0)}%
              </span></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BeatsView({ project }) {
  // Beat histogram + summary.
  const beats = project.beats;
  const bins = 60;
  const hist = new Array(bins).fill(0);
  for (const b of beats) {
    const i = Math.min(bins - 1, Math.floor((b.strength) * bins));
    hist[i]++;
  }
  const max = Math.max(...hist);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 80,
                      background: "var(--surface-2)", border: "1px solid var(--border)",
                      borderRadius: 6, padding: 6 }}>
        {hist.map((v, i) => (
          <div key={i} style={{
            flex: 1, height: `${(v / max) * 100}%`,
            background: i > bins * 0.65 ? "var(--accent-warm)" : "var(--accent-elec)",
            opacity: 0.7, borderRadius: "1px 1px 0 0",
          }} />
        ))}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: 11.5, color: "var(--text-muted)" }}>
        <span>total beats: <span className="mono" style={{ color: "var(--text)" }}>{beats.length}</span></span>
        <span>downbeats: <span className="mono" style={{ color: "var(--accent-warm-2)" }}>
          {beats.filter(b => b.is_downbeat).length}
        </span></span>
        <span>mean strength: <span className="mono" style={{ color: "var(--text)" }}>
          {(beats.reduce((a, b) => a + b.strength, 0) / beats.length).toFixed(2)}
        </span></span>
        <span>BPM: <span className="mono" style={{ color: "var(--accent)" }}>{project.bpm}</span></span>
      </div>
    </div>
  );
}

function PhrasesView({ project }) {
  const counts = {};
  for (const p of project.phrases) counts[p.mode] = (counts[p.mode] || 0) + 1;
  const modes = Object.keys(counts);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${modes.length}, 1fr)`, gap: 10 }}>
      {modes.map(m => (
        <div key={m} style={{
          padding: 12, borderRadius: 8,
          background: "var(--surface-2)", border: "1px solid var(--border)",
          borderLeft: `4px solid ${fgModeVar(m)}`,
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)",
                                            textTransform: "uppercase", letterSpacing: "0.06em" }}>{m}</span>
          <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
            {counts[m]}
          </span>
          <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>phrases</span>
        </div>
      ))}
    </div>
  );
}

function EnergyView({ project }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
      {project.chapters.map((c, i) => {
        const k = project.energy.per_chapter[i];
        return (
          <div key={c.id} style={{
            padding: 12, borderRadius: 8, background: "var(--surface-2)",
            border: "1px solid var(--border)", borderLeft: `4px solid ${c.color}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
            </div>
            <div style={{ position: "relative", height: 26, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${k.energy_mean * 100}%`,
                background: blendHexes("#1f3a8a", "#ff4b4b", k.energy_mean),
              }} />
              <div className="mono" style={{
                position: "absolute", inset: 0, display: "grid", placeItems: "center",
                fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)",
              }}>{(k.energy_mean * 100).toFixed(0)}%</div>
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 10, fontSize: 10.5, color: "var(--text-dim)" }}>
              <span>peak <span className="mono" style={{ color: "var(--text)" }}>{(k.energy_peak * 100).toFixed(0)}%</span></span>
              <span>IQR <span className="mono" style={{ color: "var(--text)" }}>{k.iqr.toFixed(1)}</span></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { AnalysisTab, CATEGORIES });
