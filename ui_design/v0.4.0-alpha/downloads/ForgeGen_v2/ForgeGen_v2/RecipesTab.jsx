// ForgeGen v2 · Recipes tab — author per-chapter recipes + influence mix.
//
// Conceptual split (the v2 headline):
//
//   Influence mix  — what SHOULD shape the haptics per chapter?
//                    Beat / Bass / Voice / Ambient · plus future-tagged
//                    influences (Video motion, Focus zone). Authored
//                    as a draggable polygon "Influence Console" with
//                    mirrored channel faders below.
//
//   Recipe knobs   — once you know WHAT influences this chapter, the
//                    knobs (Style / Density / Shape / Emphasize) shape
//                    HOW that mix becomes a stroke pattern.
//
// ForgeGen never edits below the chapter level — that is FunscriptForge's
// job. Everything here is a chapter-granular decision.

const { useState: useStateR, useMemo: useMemoR, useRef: useRefR, useEffect: useEffectR } = React;

// ── Influence sources ────────────────────────────────────────
// Live: the four the analyzer can extract today.
// Future: ghosted in the UI so the metaphor reads end-to-end.
const FG_INFLUENCES_LIVE = [
  { id: "beat",    label: "Beat",    icon: "audio-lines",  color: "var(--accent-warm)",
    desc: "Rhythmic onset grid — strokes lock to downbeats" },
  { id: "bass",    label: "Bass",    icon: "waves",        color: "var(--accent)",
    desc: "Sub-200Hz energy envelope — drives intensity" },
  { id: "voice",   label: "Voice",   icon: "mic-2",        color: "var(--accent-elec)",
    desc: "Vocal / dialog band — melodic motion, slower curves" },
  { id: "ambient", label: "Ambient", icon: "cloud",        color: "var(--success)",
    desc: "Overall envelope — mood, pacing, breath" },
];
const FG_INFLUENCES_FUTURE = [
  { id: "video",   label: "Video motion", icon: "video",   color: "var(--info)",
    desc: "Camera motion + scene change density (planned · v0.5)" },
  { id: "focus",   label: "Focus zone",   icon: "scan",    color: "var(--accent-warm-2)",
    desc: "User-selected on-screen region — motion within it weights strokes (planned · v0.6)" },
];

// ── Recipe (style/density/shape) constants — same vocabulary as v1 ──
const STYLE_OPTIONS_R = [
  { value: "full",       label: "Full mix",   hint: "Mix all selected influences" },
  { value: "percussive", label: "Percussive", hint: "Drums + transients only" },
];
const DENSITY_OPTIONS_R = [
  { value: 1, label: "1×", hint: "sparse · 1 stroke per beat" },
  { value: 2, label: "2×", hint: "canonical · 2 per beat" },
  { value: 4, label: "4×", hint: "dense · 4 per beat" },
  { value: 8, label: "8×", hint: "saturated · 8 per beat" },
];
const SHAPE_OPTIONS_R = [
  { value: "flat", label: "Flat" },
  { value: "rise", label: "Rise" },
  { value: "fall", label: "Fall" },
  { value: "auto", label: "Auto" },
];
const FG_TARGETS = [
  { id: "keon",     label: "Handy / Keon",    summary: "Linear stroker — moderate density, full range",  recommendedDensity: 2, maxSafeDensity: 4 },
  { id: "osr2",     label: "OSR2 / SR6",      summary: "Multi-axis robot — handles dense scripts well",   recommendedDensity: 4, maxSafeDensity: 8 },
  { id: "bhaptics", label: "bHaptics suit",   summary: "Sparse pulse triggers — low density, beat-aligned", recommendedDensity: 1, maxSafeDensity: 2 },
  { id: "estim",    label: "Estim audio",     summary: "Continuous waveform — density less relevant",      recommendedDensity: 2, maxSafeDensity: 4 },
  { id: "shaker",   label: "Shaker (rumble)", summary: "Single-channel buzz — emphasises beats over strokes", recommendedDensity: 1, maxSafeDensity: 2 },
];
const DEFAULT_INFLUENCE = { beat: 50, bass: 50, voice: 25, ambient: 25 };

// HTML overlay positions for the polygon axis labels.
// The polygon is square (size × size); labels sit at top center, right of
// center vertically, bottom center, and left of center vertically — outside
// the polygon area so they never overlap the draggable vertex hit zones.
const LABEL_POSITIONS = {
  beat:    { style: { top: -2,           left: "50%", transform: "translateX(-50%)" }, align: "center" },
  bass:    { style: { top: "50%",        right: -8,   transform: "translateY(-50%)" }, align: "flex-end" },
  voice:   { style: { bottom: -2,        left: "50%", transform: "translateX(-50%)" }, align: "center" },
  ambient: { style: { top: "50%",        left: -8,    transform: "translateY(-50%)" }, align: "flex-start" },
};

// ── Main tab ─────────────────────────────────────────────────
function RecipesTab({ project, focusedIdx, onFocus,
                      recipes, onRecipeChange, onApplyRecipeAll,
                      onInfluenceChange, onApplyInfluenceAll,
                      bulkRecipe, onBulkRecipeChange,
                      targetId, onTargetChange }) {
  const focused = project.chapters[focusedIdx] || project.chapters[0];
  const focusedRecipe = recipes[focusedIdx] || { style: "full", density: 2, shape: "rise", emphasize: false };
  const focusedMix = (project.influenceMix && project.influenceMix[focusedIdx]) || DEFAULT_INFLUENCE;
  const k = project.energy.per_chapter[focusedIdx];

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row", overflow: "hidden" }}>
      {/* Main column */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "auto" }}>
        <div style={{ padding: "20px 24px 16px" }}>
          <FGTabHeader
            eyebrow="Stage 03 · Recipes"
            title="Mix your influences"
            subtitle={<>ForgeGen never edits below the chapter level — that is <span style={{ color: "var(--accent-2)" }}>FunscriptForge's</span> job. Here, you decide <i>what</i> shapes the haptics for each chapter (the influence mix) and <i>how</i> that mix becomes strokes (the recipe knobs).</>}
            right={
              <div style={{ display: "flex", gap: 6 }}>
                <Pill tone="accent" dot>{project.bpm} BPM</Pill>
                <Pill tone="neutral">{project.chapters.length} chapters</Pill>
              </div>
            }
          />

          {/* Track defaults */}
          <FGSectionLabel>Track defaults</FGSectionLabel>
          <TrackDefaults
            targetId={targetId} onTargetChange={onTargetChange}
            bulkRecipe={bulkRecipe} onBulkRecipeChange={onBulkRecipeChange}
            onApplyRecipeAll={onApplyRecipeAll}
            focusedMix={focusedMix}
            onApplyInfluenceAll={onApplyInfluenceAll}
          />

          {/* Focused-chapter authoring — above the fold */}
          <div style={{ marginTop: 18 }}>
            <FGSectionLabel right={
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="mono" style={{ color: "var(--text-dim)" }}>chapter</span>
                <Pill tone="warm">{String(focusedIdx + 1).padStart(2,"0")} · {focused.name}</Pill>
              </span>
            }>
              Author this chapter
            </FGSectionLabel>

            <div style={{
              display: "grid", gridTemplateColumns: "minmax(420px, 1fr) minmax(360px, 1fr)",
              gap: 14,
            }}>
              {/* Left: Influence Console (the headline) */}
              <InfluenceConsole
                project={project} idx={focusedIdx}
                chapter={focused}
                mix={focusedMix}
                kpi={k}
                onChange={(m) => onInfluenceChange(focusedIdx, m)}
              />
              {/* Right: Recipe knobs */}
              <RecipeKnobs
                recipe={focusedRecipe}
                onChange={(r) => onRecipeChange(focusedIdx, r)}
                mix={focusedMix}
              />
            </div>
          </div>

          {/* Chapter rail — navigation between chapters' authoring */}
          <div style={{ marginTop: 22 }}>
            <FGSectionLabel right={<span style={{ color: "var(--text-dim)" }}>click to switch chapter</span>}>
              All chapters · influence at a glance
            </FGSectionLabel>
            <ChapterMixRail project={project} recipes={recipes}
                            focusedIdx={focusedIdx} onFocus={onFocus} />
          </div>
        </div>
      </div>

      {/* Right rail — selection inspector */}
      <ChapterInspector
        project={project} chapter={focused} idx={focusedIdx}
        recipe={focusedRecipe} mix={focusedMix} kpi={k}
        onFocus={onFocus}
      />
    </div>
  );
}

// ── Track defaults strip ──────────────────────────────────────
function TrackDefaults({ targetId, onTargetChange,
                         bulkRecipe, onBulkRecipeChange,
                         onApplyRecipeAll, focusedMix, onApplyInfluenceAll }) {
  const target = FG_TARGETS.find(x => x.id === targetId) || FG_TARGETS[0];
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: "var(--surface)", border: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <SelectFieldR label="Target device" value={targetId}
                      options={FG_TARGETS.map(t => ({ value: t.id, label: t.label }))}
                      onChange={onTargetChange} accent />
        <SelectFieldR label="Default style" value={bulkRecipe.style}
                      options={STYLE_OPTIONS_R}
                      onChange={(v) => onBulkRecipeChange({ ...bulkRecipe, style: v })} />
        <SelectFieldR label="Default density" value={bulkRecipe.density}
                      options={DENSITY_OPTIONS_R.map(o => ({ value: o.value, label: o.label }))}
                      onChange={(v) => onBulkRecipeChange({ ...bulkRecipe, density: Number(v) })} />
        <SelectFieldR label="Default shape" value={bulkRecipe.shape}
                      options={SHAPE_OPTIONS_R}
                      onChange={(v) => onBulkRecipeChange({ ...bulkRecipe, shape: v })} />

        <div style={{ flex: 1 }} />

        <Button kind="secondary" onClick={onApplyRecipeAll} icon="copy-plus"
                title="Copy these recipe defaults to every chapter row">
          Apply recipe to all
        </Button>
        <Button kind="ghost" onClick={() => onApplyInfluenceAll(focusedMix)} icon="share-2"
                title="Copy the focused chapter's influence mix to every chapter">
          Apply influence to all
        </Button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
        <span style={{ color: "var(--text)" }}><b>{target.label}:</b></span>{" "}
        {target.summary}
        <span className="mono" style={{ marginLeft: 8, color: "var(--text-dim)" }}>
          · max safe density: {target.maxSafeDensity}×
        </span>
      </div>
    </div>
  );
}

function SelectFieldR({ label, value, options, onChange, accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130, flex: 1 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)",
                       textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        padding: "7px 10px", borderRadius: 6,
        background: "var(--surface-2)",
        border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}`,
        color: "var(--text)", fontFamily: "inherit", fontSize: 12.5,
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Chapter mix rail ─────────────────────────────────────────
// Tiny influence-polygon thumbnails, one per chapter. Click to focus.
function ChapterMixRail({ project, recipes, focusedIdx, onFocus }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${project.chapters.length}, minmax(0, 1fr))`,
      gap: 8,
    }}>
      {project.chapters.map((c, i) => {
        const mix = (project.influenceMix && project.influenceMix[i]) || DEFAULT_INFLUENCE;
        const r = recipes[i] || { style: "full", density: 2, shape: "rise", emphasize: false };
        const focused = i === focusedIdx;
        return (
          <button key={c.id} onClick={() => onFocus(i)}
            style={{
              padding: 10, borderRadius: 10,
              background: focused ? "var(--surface)" : "var(--surface-2)",
              border: `1px solid ${focused ? c.color : "var(--border)"}`,
              borderLeftWidth: 4, borderLeftColor: c.color,
              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              display: "flex", flexDirection: "column", gap: 6,
              outline: focused ? "2px solid color-mix(in srgb, " + c.color + " 30%, transparent)" : "none",
              outlineOffset: 2,
              transition: "background 150ms, border-color 150ms",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>{String(i+1).padStart(2,"0")}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600,
                               whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                {c.name}
              </span>
            </div>
            <InfluencePolygonMini mix={mix} size={70} />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Pill tone="neutral" style={{ fontSize: 9.5, padding: "1px 6px" }}>{r.style}</Pill>
              <Pill tone="neutral" style={{ fontSize: 9.5, padding: "1px 6px" }}>{r.density}×</Pill>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Influence polygon (mini) ─────────────────────────────────
// Read-only thumbnail variant for the chapter rail.
function InfluencePolygonMini({ mix, size = 80 }) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.42;
  const pts = polyPoints(mix, cx, cy, r);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {/* Grid */}
      {[0.33, 0.66, 1].map(scale => (
        <polygon key={scale} points={polyPoints({beat:100, bass:100, voice:100, ambient:100}, cx, cy, r * scale).map(p => p.join(",")).join(" ")}
                 fill="none" stroke="var(--border)" strokeWidth="0.5" opacity={scale === 1 ? 0.6 : 0.3} />
      ))}
      {/* Axes */}
      {polyPoints({beat:100, bass:100, voice:100, ambient:100}, cx, cy, r).map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--border)" strokeWidth="0.5" opacity="0.4" />
      ))}
      {/* Filled polygon */}
      <polygon points={pts.map(p => p.join(",")).join(" ")}
               fill="var(--accent-glow-strong)"
               stroke="var(--accent-2)" strokeWidth="1.2" />
      {/* Vertex dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={FG_INFLUENCES_LIVE[i].color} />
      ))}
    </svg>
  );
}

function polyPoints(mix, cx, cy, r) {
  // Order: Beat (top), Bass (right), Voice (bottom), Ambient (left)
  const axes = [
    { v: mix.beat,    angle: -Math.PI / 2 },
    { v: mix.bass,    angle: 0 },
    { v: mix.voice,   angle: Math.PI / 2 },
    { v: mix.ambient, angle: Math.PI },
  ];
  return axes.map(a => {
    const m = (a.v / 100) * r;
    return [cx + Math.cos(a.angle) * m, cy + Math.sin(a.angle) * m];
  });
}

// ── Influence Console (the headline novel UX) ────────────────
function InfluenceConsole({ project, idx, chapter, mix, kpi, onChange }) {
  const size = 280;
  const cx = size / 2, cy = size / 2;
  const r = size * 0.38;
  const svgRef = useRefR(null);
  const [dragging, setDragging] = useStateR(null);  // 'beat'|'bass'|'voice'|'ambient'

  function setAxis(axis, value) {
    onChange({ ...mix, [axis]: Math.max(0, Math.min(100, Math.round(value))) });
  }

  function onPointerDown(axis, e) {
    e.preventDefault();
    setDragging(axis);
  }
  useEffectR(() => {
    if (!dragging) return;
    function move(ev) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ev.clientX - rect.left - cx;
      const y = ev.clientY - rect.top - cy;
      // Project onto the axis direction.
      const dirs = { beat: [0, -1], bass: [1, 0], voice: [0, 1], ambient: [-1, 0] };
      const d = dirs[dragging];
      const proj = Math.max(0, x * d[0] + y * d[1]);
      const v = Math.min(100, (proj / r) * 100);
      setAxis(dragging, v);
    }
    function up() { setDragging(null); }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, mix]);

  const pts = polyPoints(mix, cx, cy, r);

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: 16,
      display: "flex", flexDirection: "column", gap: 12,
      borderLeft: `4px solid ${chapter.color}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="radar" size={14} style={{ color: "var(--accent-2)" }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>Influence mix</span>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>drag any vertex, or use the channels below</span>
        <div style={{ flex: 1 }} />
        <Button kind="ghost" size="sm" icon="rotate-ccw"
                title="Reset to analyzer-suggested mix"
                onClick={() => onChange(window.suggestInfluence(project, idx))}>
          Suggested
        </Button>
      </div>

      {/* Polygon + label ring */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", width: size, height: size,
                        padding: "8px 60px",
                        boxSizing: "content-box" }}>
          {/* Axis labels — absolutely positioned around the polygon */}
          {FG_INFLUENCES_LIVE.map(inf => {
            const pos = LABEL_POSITIONS[inf.id];
            return (
              <div key={inf.id} style={{
                position: "absolute", ...pos.style,
                display: "flex", flexDirection: "column", alignItems: pos.align,
                lineHeight: 1.1, pointerEvents: "none",
                fontFamily: "var(--font-mono)",
              }}>
                <span style={{ fontSize: 10, fontWeight: 700,
                                  letterSpacing: "0.08em", color: inf.color,
                                  textTransform: "uppercase",
                                  whiteSpace: "nowrap" }}>
                  {inf.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                  {Math.round(mix[inf.id])}
                </span>
              </div>
            );
          })}

          <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`}
               style={{ touchAction: "none", position: "relative", zIndex: 1 }}>
          <defs>
            <radialGradient id="influence-fill" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.32"/>
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0.08"/>
            </radialGradient>
          </defs>

          {/* Concentric grid */}
          {[0.25, 0.5, 0.75, 1].map(scale => (
            <polygon key={scale}
                     points={polyPoints({beat:100, bass:100, voice:100, ambient:100}, cx, cy, r * scale)
                              .map(p => p.join(",")).join(" ")}
                     fill="none" stroke="var(--border)"
                     strokeWidth={scale === 1 ? 1 : 0.5}
                     opacity={scale === 1 ? 0.7 : 0.3}
                     strokeDasharray={scale === 1 ? "none" : "2 3"} />
          ))}
          {/* Axes */}
          {polyPoints({beat:100, bass:100, voice:100, ambient:100}, cx, cy, r).map((p, i) => (
            <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--border-strong)" strokeWidth="0.7" />
          ))}

          {/* Filled polygon */}
          <polygon points={pts.map(p => p.join(",")).join(" ")}
                   fill="url(#influence-fill)"
                   stroke="var(--accent-2)" strokeWidth="2"
                   style={{ filter: "drop-shadow(0 0 6px var(--accent-glow))" }} />

          {/* Vertex dots (draggable) */}
          {pts.map((p, i) => {
            const inf = FG_INFLUENCES_LIVE[i];
            const isDragging = dragging === inf.id;
            return (
              <g key={inf.id}>
                <circle cx={p[0]} cy={p[1]} r="10"
                        fill="transparent"
                        onPointerDown={(e) => onPointerDown(inf.id, e)}
                        style={{ cursor: "grab" }} />
                <circle cx={p[0]} cy={p[1]} r={isDragging ? 7 : 5}
                        fill={inf.color}
                        stroke="var(--bg)" strokeWidth="2"
                        style={{
                          filter: `drop-shadow(0 0 ${isDragging ? 8 : 3}px ${inf.color})`,
                          transition: "r 120ms",
                          pointerEvents: "none",
                        }} />
              </g>
            );
          })}

          {/* Center label */}
          <text x={cx} y={cy + 4} fontSize="10" fill="var(--text-dim)"
                textAnchor="middle" style={{ fontFamily: "var(--font-mono)" }}>
            {dominant(mix)}
          </text>
        </svg>
        </div>
      </div>

      {/* Channel faders mirror the polygon */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        {FG_INFLUENCES_LIVE.map(inf => (
          <ChannelFader key={inf.id} inf={inf} value={mix[inf.id]}
                         onChange={(v) => onChange({ ...mix, [inf.id]: v })} />
        ))}
      </div>

      {/* Future-tagged influences */}
      <div style={{ paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-dim)",
                        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Coming soon — more sources of influence
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FG_INFLUENCES_FUTURE.map(inf => (
            <div key={inf.id} title={inf.desc} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 9px", borderRadius: 6,
              background: "var(--surface-2)", border: "1px dashed var(--border-strong)",
              opacity: 0.7,
            }}>
              <Icon name={inf.icon} size={11} style={{ color: inf.color }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)" }}>{inf.label}</span>
              <span className="mono" style={{ fontSize: 9, color: "var(--text-dim)",
                                                 padding: "1px 5px", borderRadius: 3,
                                                 background: "var(--surface-3)" }}>soon</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChannelFader({ inf, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 92 }}>
        <Icon name={inf.icon} size={12} style={{ color: inf.color }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)",
                         textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {inf.label}
        </span>
      </div>
      <div style={{ flex: 1, position: "relative", height: 6,
                      background: "var(--surface-3)", borderRadius: 3 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${value}%`,
          background: `linear-gradient(90deg, ${inf.color} 0%, color-mix(in srgb, ${inf.color} 60%, transparent) 100%)`,
          borderRadius: 3,
          boxShadow: `0 0 8px color-mix(in srgb, ${inf.color} 50%, transparent)`,
        }} />
        <input type="range" min="0" max="100" step="1" value={value}
               onChange={(e) => onChange(Number(e.target.value))}
               style={{
                 position: "absolute", inset: 0, opacity: 0,
                 width: "100%", height: "100%", cursor: "pointer",
               }} />
      </div>
      <span className="mono" style={{ fontSize: 11, color: "var(--text)", minWidth: 28, textAlign: "right" }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

function dominant(mix) {
  const e = Object.entries(mix).sort((a, b) => b[1] - a[1]);
  return e[0][1] > 0 ? `dominant · ${e[0][0]}` : "silent";
}

// ── Recipe knobs — Style / Density / Shape / Emphasize ────────
function RecipeKnobs({ recipe, onChange, mix }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: 16,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="sliders-horizontal" size={14} style={{ color: "var(--accent-warm-2)" }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>Recipe knobs</span>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>how this mix becomes strokes</span>
      </div>

      <KnobBlock label="Style" hint="Source mix vs. drums-only">
        <div style={{ display: "flex", gap: 6 }}>
          {STYLE_OPTIONS_R.map(o => (
            <SegBtn key={o.value} active={recipe.style === o.value}
                    onClick={() => onChange({ ...recipe, style: o.value })}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <span style={{ fontWeight: 700 }}>{o.label}</span>
                <span style={{ fontSize: 9.5, color: "var(--text-dim)", fontWeight: 500 }}>{o.hint}</span>
              </div>
            </SegBtn>
          ))}
        </div>
      </KnobBlock>

      <KnobBlock label="Density" hint="Strokes per beat">
        <div style={{ display: "flex", gap: 6 }}>
          {DENSITY_OPTIONS_R.map(o => (
            <SegBtn key={o.value} active={recipe.density === o.value}
                    onClick={() => onChange({ ...recipe, density: o.value })}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{o.label}</span>
                <span style={{ fontSize: 9, color: "var(--text-dim)", fontWeight: 500 }}>{o.hint}</span>
              </div>
            </SegBtn>
          ))}
        </div>
      </KnobBlock>

      <KnobBlock label="Shape" hint="Long-arc gesture across the chapter">
        <div style={{ display: "flex", gap: 6 }}>
          {SHAPE_OPTIONS_R.map(o => (
            <SegBtn key={o.value} active={recipe.shape === o.value}
                    onClick={() => onChange({ ...recipe, shape: o.value })}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <ShapeGlyphR shape={o.value} />
                <span style={{ fontWeight: 700 }}>{o.label}</span>
              </div>
            </SegBtn>
          ))}
        </div>
      </KnobBlock>

      <KnobBlock label="Emphasize downbeats" hint="Boost stroke amplitude on every 4th beat">
        <button onClick={() => onChange({ ...recipe, emphasize: !recipe.emphasize })} style={{
          alignSelf: "flex-start",
          padding: "6px 12px", borderRadius: 6,
          border: `1px solid ${recipe.emphasize ? "var(--accent-warm)" : "var(--border)"}`,
          background: recipe.emphasize ? "var(--warm-glow)" : "var(--surface-2)",
          color: recipe.emphasize ? "var(--accent-warm-2)" : "var(--text-muted)",
          fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Icon name={recipe.emphasize ? "check" : "circle"} size={11} />
          {recipe.emphasize ? "Downbeats boosted" : "Off"}
        </button>
      </KnobBlock>

      {/* Live preview: rough stroke-density estimate */}
      <div style={{ paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-dim)",
                        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Estimated output
        </div>
        <StrokePreview recipe={recipe} mix={mix} />
      </div>
    </div>
  );
}

function KnobBlock({ label, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-dim)",
                         textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        {hint && <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>· {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SegBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "8px 10px", borderRadius: 6,
      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      background: active ? "var(--accent-glow)" : "var(--surface-2)",
      color: active ? "var(--text)" : "var(--text-muted)",
      fontFamily: "inherit", fontSize: 11.5, fontWeight: 600,
      cursor: "pointer",
      display: "flex", justifyContent: "center", alignItems: "center",
      transition: "background 120ms, border-color 120ms",
    }}>
      {children}
    </button>
  );
}

function ShapeGlyphR({ shape }) {
  const stroke = "currentColor";
  return (
    <svg width="28" height="12" viewBox="0 0 28 12">
      {shape === "flat" && <line x1="2" y1="6" x2="26" y2="6" stroke={stroke} strokeWidth="1.5" />}
      {shape === "rise" && <path d="M2 10 Q 14 10 26 2" stroke={stroke} strokeWidth="1.5" fill="none" />}
      {shape === "fall" && <path d="M2 2 Q 14 2 26 10" stroke={stroke} strokeWidth="1.5" fill="none" />}
      {shape === "auto" && <path d="M2 8 Q 8 1 14 8 T 26 8" stroke={stroke} strokeWidth="1.5" fill="none" />}
    </svg>
  );
}

function StrokePreview({ recipe, mix }) {
  // A small animated waveform that reflects density + emphasis.
  // Pure visual — not real stroke data, just intent.
  const beats = 16;
  const ampBase = 0.55 + (mix.bass / 100) * 0.3 - (mix.ambient / 100) * 0.2;
  return (
    <div style={{
      height: 56, padding: 6, borderRadius: 6,
      background: "var(--surface-2)", border: "1px solid var(--border)",
      display: "flex", alignItems: "flex-end", gap: 2,
    }}>
      {Array.from({ length: beats * recipe.density }).map((_, i) => {
        const isDown = i % (4 * recipe.density) === 0;
        const beatPos = i / (beats * recipe.density);
        let shapeMod = 1;
        if (recipe.shape === "rise") shapeMod = 0.4 + beatPos * 0.7;
        else if (recipe.shape === "fall") shapeMod = 1.1 - beatPos * 0.7;
        else if (recipe.shape === "auto") shapeMod = 0.6 + Math.abs(Math.sin(beatPos * Math.PI * 2)) * 0.5;
        const emp = recipe.emphasize && isDown ? 1.3 : 1;
        const h = Math.max(0.05, Math.min(1, ampBase * shapeMod * emp));
        return (
          <div key={i} style={{
            flex: 1, height: `${h * 100}%`,
            background: isDown
              ? "linear-gradient(180deg, var(--accent-warm) 0%, var(--accent) 100%)"
              : "linear-gradient(180deg, var(--accent-2) 0%, var(--accent) 100%)",
            opacity: isDown ? 1 : 0.65,
            borderRadius: "2px 2px 0 0",
          }} />
        );
      })}
    </div>
  );
}

// ── Right-rail chapter inspector ─────────────────────────────
function ChapterInspector({ project, chapter, idx, recipe, mix, kpi, onFocus }) {
  return (
    <aside style={{
      width: "var(--inspector-w)", flexShrink: 0,
      borderLeft: "1px solid var(--border)",
      background: "var(--surface)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{ padding: "14px 16px 10px",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--surface-2)" }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-dim)",
                        textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Inspector · chapter {String(idx+1).padStart(2,"0")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={{ width: 4, height: 22, borderRadius: 2, background: chapter.color }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0,
                         whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {chapter.name}
          </h3>
        </div>
        <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
          <Pill tone="neutral">{chapter.contentType}</Pill>
          <Pill tone="accent" dot>{fmtMs(chapter.duration_ms)}</Pill>
          <Pill tone="warm">{kpi.beats} beats</Pill>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* KPI block */}
        <section>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-dim)",
                          textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Analyzer KPIs
          </div>
          <KpiRow label="Energy mean" value={`${(kpi.energy_mean * 100).toFixed(0)}%`} />
          <KpiRow label="Energy peak" value={`${(kpi.energy_peak * 100).toFixed(0)}%`} />
          <KpiRow label="Mode"        value={kpi.suggested_mode} valueColor={fgModeVar(kpi.suggested_mode)} />
          <KpiRow label="Suggested ×" value={`${kpi.suggested_density}×`} />
          <KpiRow label="Phrases"     value={kpi.phrase_count} />
          <KpiRow label="Downbeats"   value={kpi.downbeats} />
          <KpiRow label="Confidence"  value={`${(chapter.confidence * 100).toFixed(0)}%`} />
        </section>

        {/* Current recipe summary */}
        <section>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-dim)",
                          textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Current recipe
          </div>
          <KpiRow label="Style"     value={recipe.style} />
          <KpiRow label="Density"   value={`${recipe.density}×`} />
          <KpiRow label="Shape"     value={recipe.shape} />
          <KpiRow label="Emphasize" value={recipe.emphasize ? "downbeats" : "off"}
                  valueColor={recipe.emphasize ? "var(--accent-warm-2)" : "var(--text-dim)"} />
        </section>

        {/* Influence summary */}
        <section>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-dim)",
                          textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Influence mix
          </div>
          {FG_INFLUENCES_LIVE.map(inf => (
            <div key={inf.id} style={{ display: "flex", alignItems: "center", gap: 8,
                                           padding: "4px 0" }}>
              <Icon name={inf.icon} size={11} style={{ color: inf.color }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>{inf.label}</span>
              <div style={{ width: 80, height: 4, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${mix[inf.id]}%`, height: "100%", background: inf.color }} />
              </div>
              <span className="mono" style={{ fontSize: 10.5, color: "var(--text)",
                                                 minWidth: 28, textAlign: "right" }}>
                {Math.round(mix[inf.id])}
              </span>
            </div>
          ))}
        </section>

        {/* Sibling-chapter quick-nav */}
        <section>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-dim)",
                          textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Jump to chapter
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {project.chapters.map((c, i) => {
              const focused = i === idx;
              return (
                <button key={c.id} onClick={() => onFocus(i)} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 8px", borderRadius: 6,
                  background: focused ? "var(--accent-glow)" : "transparent",
                  border: `1px solid ${focused ? "var(--accent)" : "transparent"}`,
                  color: focused ? "var(--text)" : "var(--text-muted)",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                }}>
                  <span style={{ width: 4, height: 16, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                  <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>{String(i+1).padStart(2,"0")}</span>
                  <span style={{ fontSize: 11.5, whiteSpace: "nowrap",
                                   overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{c.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}

function KpiRow({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    padding: "4px 0", gap: 8,
                    borderBottom: "1px dashed var(--border)" }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <span className="mono" style={{ fontSize: 11.5, color: valueColor || "var(--text)", whiteSpace: "nowrap", flexShrink: 0 }}>{value}</span>
    </div>
  );
}

Object.assign(window, { RecipesTab, FG_TARGETS, FG_INFLUENCES_LIVE, FG_INFLUENCES_FUTURE, DEFAULT_INFLUENCE });
