// ForgeGen v2 · Generate tab — pure forge-run view.
//
// All per-chapter authoring lives in the Recipes stage now. This stage
// just shows: the plan (recipes summary), the forge sequence, and a
// per-chapter sweep that lights each chapter as the forger walks through
// it. Plus a beat-locked pulse so the forge feels "in time" with the music.

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG } = React;

function GenerateTab({ project, recipes, targetId, accepted,
                       generating, stage, progress, sweepChapter,
                       onForge }) {
  const target = FG_TARGETS.find(x => x.id === targetId) || FG_TARGETS[0];
  return (
    <FGTabBody>
      <FGTabHeader
        eyebrow="Stage 04 · Generate"
        title={accepted ? "Forged." : "Light the forge"}
        subtitle={accepted
          ? "The funscript is hot off the press. Step over to Output to inspect, export to your device target, or hand off to FunscriptForge for sub-chapter refinement."
          : <>ForgeGen now has your <b>chapter influence mix</b> and <b>recipe knobs</b>. Pressing forge runs the engine once per chapter, normalised within that chapter's own energy range, then stitches the result into a single <span className="mono" style={{ color: "var(--accent-2)" }}>.funscript</span>.</>}
        right={
          <div style={{ display: "flex", gap: 6 }}>
            <Pill tone="accent" dot>{project.bpm} BPM</Pill>
            <Pill tone="warm">{target.label}</Pill>
          </div>
        }
      />

      {/* The big forge stage */}
      <ForgeStage project={project} generating={generating}
                  stage={stage} progress={progress} sweepChapter={sweepChapter}
                  accepted={accepted}
                  onForge={onForge} />

      {/* Plan summary — what's about to happen, per chapter */}
      <div style={{ marginTop: 18 }}>
        <FGSectionLabel right={
          <span style={{ color: "var(--text-dim)" }}>read-only · edit in Recipes</span>
        }>The plan</FGSectionLabel>
        <PlanGrid project={project} recipes={recipes} sweepChapter={sweepChapter} generating={generating} accepted={accepted} />
      </div>
    </FGTabBody>
  );
}

// ── ForgeStage — the headline animated area ──────────────────
const GENERATE_STAGES = [
  { id: "extract", label: "Extract", hint: "Demuxing audio"   },
  { id: "load",    label: "Load",    hint: "Decoding stream"  },
  { id: "beats",   label: "Beats",   hint: "PLP analysis"     },
  { id: "shape",   label: "Shape",   hint: "Per-chapter curve" },
  { id: "write",   label: "Write",   hint: "Sidecar + funscript" },
];

function ForgeStage({ project, generating, stage, progress, sweepChapter,
                       accepted, onForge }) {
  const stages = GENERATE_STAGES;
  const idx = stages.findIndex(s => s.id === stage);
  const overallPct = Math.round((progress ?? 0) * 100);

  // Beat-locked pulse: a synthetic 90 BPM cadence drives the ember.
  const beatMs = 60_000 / project.bpm;
  const [beatTick, setBeatTick] = useStateG(0);
  useEffectG(() => {
    if (!generating) return;
    const id = setInterval(() => setBeatTick(t => t + 1), beatMs);
    return () => clearInterval(id);
  }, [generating, beatMs]);

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      borderRadius: 14,
      background: generating
        ? "radial-gradient(120% 80% at 50% 100%, var(--warm-glow-strong) 0%, transparent 60%), var(--surface)"
        : (accepted
          ? "radial-gradient(120% 80% at 50% 100%, rgba(62,213,152,0.18) 0%, transparent 55%), var(--surface)"
          : "var(--surface)"),
      border: `1px solid ${generating ? "var(--accent-warm)" : accepted ? "var(--success)" : "var(--border)"}`,
      boxShadow: generating ? "var(--glow-forge)" : "none",
      transition: "border-color 200ms",
      padding: 22,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
        <ForgeEmber active={generating} done={accepted && !generating} beat={beatTick} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700,
                          color: generating ? "var(--accent-warm-2)" : accepted ? "var(--success)" : "var(--text)" }}>
            {generating ? "Forging…" : (accepted ? "Funscript forged" : "Ready to forge")}
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 4 }}>
            {generating
              ? `${stages[idx]?.label} · ${stages[idx]?.hint} · chapter ${sweepChapter + 1}/${project.chapters.length} · ${overallPct}%`
              : (accepted
                ? `${project.funscript.actions.length.toLocaleString()} actions · ${(project.duration_ms/60_000).toFixed(2)} min · ${project.bpm} BPM`
                : `${project.chapters.length} chapters · ${(project.duration_ms/60_000).toFixed(2)} min · target ${project.bpm} BPM`)}
          </div>
        </div>
        {!generating && (
          <Button kind="primary" size="md" icon="wand-sparkles" onClick={onForge}>
            {accepted ? "Re-forge" : "Forge funscript"}
          </Button>
        )}
        {generating && (
          <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-warm-2)" }}>
            {overallPct}%
          </span>
        )}
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {stages.map((s, i) => {
          const done = generating ? i < idx : accepted;
          const cur = generating && i === idx;
          return (
            <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{
                height: 6, borderRadius: 3,
                background: done ? "var(--accent-warm)" : (cur ? "var(--accent-warm-2)" : "var(--surface-3)"),
                opacity: done ? 1 : (cur ? 1 : 0.5),
                boxShadow: cur ? "0 0 10px var(--warm-glow-strong)" : "none",
                animation: cur ? "fg-shimmer 1.6s linear infinite" : "none",
                backgroundImage: cur
                  ? "linear-gradient(90deg, var(--accent-warm-2), var(--accent-spark), var(--accent-warm-2))"
                  : undefined,
                backgroundSize: cur ? "200% 100%" : undefined,
              }} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: cur ? "var(--accent-warm-2)" : (done ? "var(--text)" : "var(--text-dim)"),
                }}>{s.label}</span>
                <span style={{ fontSize: 9.5, color: "var(--text-dim)" }}>{s.hint}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chapter sweep — each chapter's bar lights as the forger reaches it */}
      <ChapterSweep project={project} generating={generating} accepted={accepted}
                     activeIdx={sweepChapter} progress={progress} />

      {/* Ember sparks */}
      {generating && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0,
                        height: 32, pointerEvents: "none", overflow: "hidden" }}>
          {[0,1,2,3,4,5,6,7,8].map(i => (
            <div key={i} style={{
              position: "absolute", left: `${8 + i * 11}%`, bottom: 0,
              width: 4, height: 4, borderRadius: "50%",
              background: i % 2 ? "var(--accent-spark)" : "var(--accent-warm)",
              animation: `fg-spark ${1.4 + (i % 3) * 0.3}s ${i * 0.18}s ease-out infinite`,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Forge ember — pulsing brand glyph with beat-locked heartbeat ──
function ForgeEmber({ active, done, beat }) {
  return (
    <div style={{
      width: 56, height: 56, borderRadius: 12,
      display: "grid", placeItems: "center",
      background: active
        ? "radial-gradient(circle, var(--accent-warm) 0%, var(--accent-deep) 100%)"
        : done
          ? "radial-gradient(circle, var(--success) 0%, #1f6b48 100%)"
          : "var(--surface-2)",
      border: `2px solid ${active ? "var(--accent-warm-2)" : done ? "var(--success)" : "var(--border)"}`,
      boxShadow: active
        ? "0 0 24px var(--warm-glow-strong), inset 0 0 12px rgba(255,255,255,0.4)"
        : done ? "0 0 18px rgba(62,213,152,0.4)" : "none",
      animation: active ? "fg-forge-glow 0.66s infinite var(--ease-standard)" : "none",
      transition: "background 300ms, box-shadow 300ms",
      flexShrink: 0,
    }}>
      <Icon name={done && !active ? "circle-check-big" : "hammer"} size={24}
            style={{ color: "#fff", filter: active ? "drop-shadow(0 0 6px rgba(255,255,255,0.7))" : "none" }} />
      {/* Beat ripple */}
      {active && (
        <div key={beat} style={{
          position: "absolute",
          width: 56, height: 56, borderRadius: 12,
          border: "2px solid var(--accent-warm-2)",
          animation: "fg-beatpulse 0.66s var(--ease-standard) forwards",
          pointerEvents: "none",
        }} />
      )}
    </div>
  );
}

// ── Chapter sweep — colored bar with traveling highlight ────────
function ChapterSweep({ project, generating, accepted, activeIdx, progress }) {
  const total = project.duration_ms;
  const sweepP = generating ? Math.min(1, Math.max(0, (progress - 0.6) / 0.35)) : (accepted ? 1 : 0);
  return (
    <div style={{
      borderRadius: 10, overflow: "hidden",
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", height: 44, position: "relative" }}>
        {project.chapters.map((c, i) => {
          const flex = c.duration_ms / total;
          const reached = generating ? i <= activeIdx : accepted;
          const current = generating && i === activeIdx;
          return (
            <div key={c.id} style={{
              flex, minWidth: 0, position: "relative",
              background: reached
                ? `color-mix(in srgb, ${c.color} ${current ? 95 : 75}%, transparent)`
                : `color-mix(in srgb, ${c.color} 18%, var(--surface-3))`,
              borderRight: i < project.chapters.length - 1 ? "1px solid rgba(0,0,0,0.4)" : "none",
              display: "flex", alignItems: "center",
              padding: "0 10px",
              color: reached ? "#fff" : "var(--text-dim)",
              transition: "background 320ms var(--ease-emph)",
              boxShadow: current ? "inset 0 0 18px rgba(255,255,255,0.18), 0 0 12px var(--warm-glow-strong)" : "none",
            }}>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0 }}>
                <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.85 }}>
                  {String(i+1).padStart(2,"0")}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700,
                                 whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                 textShadow: reached ? "0 1px 2px rgba(0,0,0,0.5)" : "none" }}>
                  {c.name}
                </span>
              </div>
              {current && (
                <Icon name="hammer" size={12} style={{
                  marginLeft: "auto", color: "#fff",
                  filter: "drop-shadow(0 0 4px var(--accent-spark))",
                  animation: "fg-forge-glow 0.6s infinite",
                }} />
              )}
            </div>
          );
        })}
        {/* Sweep cursor */}
        {generating && (
          <div style={{
            position: "absolute", top: 0, bottom: 0, width: 3,
            background: "linear-gradient(180deg, var(--accent-spark), var(--accent-warm))",
            boxShadow: "0 0 10px var(--accent-spark), 0 0 18px var(--accent-warm)",
            left: `${sweepP * 100}%`,
            pointerEvents: "none",
            transform: "translateX(-50%)",
          }} />
        )}
      </div>
    </div>
  );
}

// ── Plan grid — recipes summary, lights up as forge sweeps ────
function PlanGrid({ project, recipes, sweepChapter, generating, accepted }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      gap: 10,
    }}>
      {project.chapters.map((c, i) => {
        const r = recipes[i] || { style: "full", density: 2, shape: "rise", emphasize: false };
        const mix = (project.influenceMix && project.influenceMix[i]) || { beat: 50, bass: 50, voice: 25, ambient: 25 };
        const reached = generating ? i <= sweepChapter : accepted;
        const current = generating && i === sweepChapter;
        return (
          <div key={c.id} style={{
            padding: 12, borderRadius: 10,
            background: "var(--surface)",
            border: `1px solid ${current ? "var(--accent-warm)" : reached ? "var(--success)" : "var(--border)"}`,
            borderLeftWidth: 4, borderLeftColor: c.color,
            display: "flex", flexDirection: "column", gap: 8,
            boxShadow: current ? "0 0 14px var(--warm-glow-strong)" : "none",
            transition: "border-color 200ms, box-shadow 200ms",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>{String(i+1).padStart(2,"0")}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1,
                               whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
              {reached && !current && <Icon name="check" size={12} style={{ color: "var(--success)" }} />}
              {current && <Icon name="hammer" size={12} style={{ color: "var(--accent-warm-2)" }} />}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Pill tone="neutral" style={{ fontSize: 9.5, padding: "1px 6px" }}>{r.style}</Pill>
              <Pill tone="neutral" style={{ fontSize: 9.5, padding: "1px 6px" }}>{r.density}×</Pill>
              <Pill tone="neutral" style={{ fontSize: 9.5, padding: "1px 6px" }}>{r.shape}</Pill>
              {r.emphasize && <Pill tone="warm" style={{ fontSize: 9.5, padding: "1px 6px" }}>emp</Pill>}
            </div>
            {/* Influence bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {FG_INFLUENCES_LIVE.map(inf => (
                <div key={inf.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-dim)",
                                   minWidth: 44, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {inf.label}
                  </span>
                  <div style={{ flex: 1, height: 4, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${mix[inf.id]}%`, height: "100%", background: inf.color }} />
                  </div>
                  <span className="mono" style={{ fontSize: 9.5, color: "var(--text)", minWidth: 18, textAlign: "right" }}>
                    {Math.round(mix[inf.id])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { GenerateTab, GENERATE_STAGES });
