// ForgeGen v2 · Output tab — inspect the result + export.
//
// What changed in v2:
//   • Export targets expanded — Audio · Beat track audio · Funscript ·
//     Haptic script · Forge metadata. Each is a card with a checkbox,
//     summary stats, and per-format actions. The "export bundle" button
//     downloads everything ticked at once.
//   • Auto-zoom playhead — as the playhead crosses a chapter boundary
//     the chart auto-snaps to that chapter (toggleable).
//   • Beat-locked pulse cue on the play button.
//
// Sub-chapter editing remains FunscriptForge's job — the "Open in FFP"
// button hands off the funscript + chapter sidecar.

const { useState: useStateO, useEffect: useEffectO, useMemo: useMemoO } = React;

function OutputTab({ project, recipes,
                     zoom, onSetZoom, autoZoom, onSetAutoZoom,
                     playheadMs, onSetPlayheadMs,
                     isPlaying, onTogglePlay,
                     onSaveAs, onReveal, onExportToFFP }) {
  // Selected export targets (checked by default for sensible bundle).
  const [selected, setSelected] = useStateO({
    audio:       false,
    beatTrack:   true,
    funscript:   true,
    haptic:      false,
    forgeMeta:   true,
  });
  const toggle = (k) => setSelected(s => ({ ...s, [k]: !s[k] }));
  const selectedCount = Object.values(selected).filter(Boolean).length;

  // Destinations — where the bundle goes.
  const [destinations, setDestinations] = useStateO({
    disk: true,
    mega: false,
  });
  const toggleDest = (k) => setDestinations(d => ({ ...d, [k]: !d[k] }));
  const destCount = Object.values(destinations).filter(Boolean).length;

  // Mock Mega account state.
  const [megaAccount, setMegaAccount] = useStateO({
    connected: true,
    email: "liquid.releasing@mega.nz",
    storageUsedGb: 8.3,
    storageTotalGb: 50,
    folder: "/ForgeGen/bundles",
  });

  return (
    <FGTabBody>
      <FGTabHeader
        eyebrow="Stage 05 · Output"
        title="Inspect & export"
        subtitle={<>The funscript is hot. Inspect the curve, scrub through chapters, then export any combination of <b>audio</b>, <b>beat-track audio</b>, <b>funscript</b>, <b>haptic script</b>, or the new <b>forge metadata</b> sidecar.</>}
        right={
          <div style={{ display: "flex", gap: 6 }}>
            <Pill tone="success" dot>forged</Pill>
            <Pill tone="neutral">{project.funscript.actions.length.toLocaleString()} actions</Pill>
          </div>
        }
      />

      {/* Summary card */}
      <SummaryCard project={project} recipes={recipes} />

      {/* The funscript chart — main event */}
      <div style={{ marginTop: 18 }}>
        <FGSectionLabel right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11,
                              color: "var(--text-muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={autoZoom}
                     onChange={() => onSetAutoZoom(!autoZoom)}
                     style={{ accentColor: "var(--accent)" }} />
              auto-zoom to current chapter
            </label>
            <span style={{ color: "var(--text-dim)" }}>
              {zoom ? "zoomed · double-click chart to reset" : "click any chapter to zoom"}
            </span>
          </div>
        }>
          Funscript visualization
        </FGSectionLabel>
        <FunscriptChart project={project} zoom={zoom} onSetZoom={onSetZoom}
                        playheadMs={playheadMs} onSetPlayheadMs={onSetPlayheadMs}
                        isPlaying={isPlaying} onTogglePlay={onTogglePlay}
                        showHeatmap showPhraseRibbon showBeatTicks
                        showAmplitude heatRibbon />
      </div>

      {/* Export targets */}
      <div style={{ marginTop: 18 }}>
        <FGSectionLabel right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--text-dim)" }}>
              {selectedCount === 0
                ? "nothing selected"
                : `${selectedCount} ${selectedCount === 1 ? "target" : "targets"} selected`}
            </span>
          </div>
        }>
          Export targets
        </FGSectionLabel>
        <ExportGrid project={project} recipes={recipes}
                    selected={selected} toggle={toggle} />
      </div>

      {/* Destinations */}
      <div style={{ marginTop: 18 }}>
        <FGSectionLabel right={
          <span style={{ color: "var(--text-dim)" }}>
            {destCount === 0 ? "no destination—pick at least one" : `${destCount} ${destCount === 1 ? "destination" : "destinations"}`}
          </span>
        }>Destinations</FGSectionLabel>
        <DestinationsGrid destinations={destinations} toggle={toggleDest}
                          megaAccount={megaAccount} setMegaAccount={setMegaAccount}
                          bundleCount={selectedCount} />
      </div>

      {/* Per-chapter breakdown */}
      <div style={{ marginTop: 18 }}>
        <FGSectionLabel>Per-chapter breakdown</FGSectionLabel>
        <PerChapterBreakdown project={project} recipes={recipes}
                              zoom={zoom} onSetZoom={onSetZoom} />
      </div>

      {/* Actions */}
      <div style={{ marginTop: 18, marginBottom: 4 }}>
        <FGSectionLabel>Actions</FGSectionLabel>
        <div style={{ display: "flex", gap: 8 }}>
          <Button kind="secondary" icon="folder-open" onClick={onReveal}>Reveal in finder</Button>
          <Button kind="secondary" icon="copy" onClick={onSaveAs}>Save copy as…</Button>
          <div style={{ flex: 1 }} />
          <Button kind="secondary" icon="package"
                  disabled={selectedCount === 0 || destCount === 0}
                  onClick={onSaveAs}>
            Export bundle ({selectedCount} → {destCount})
          </Button>
          <Button kind="primary" icon="hand-coins" onClick={onExportToFFP}>
            Open in FunscriptForge →
          </Button>
        </div>
      </div>
    </FGTabBody>
  );
}

// ── Export grid ──────────────────────────────────────────────
const EXPORT_TARGETS = [
  { id: "audio",     label: "Audio",            icon: "music",            color: "var(--accent-elec)",
    ext: ".mp4", purpose: "Passthrough of the source media — included so the bundle is self-contained for archival or re-analysis." },
  { id: "beatTrack", label: "Beat-track audio", icon: "audio-waveform",   color: "var(--accent-warm)",
    ext: ".beat.wav", purpose: "Source audio with a click track and downbeat accents mixed in. Useful for monitoring sync during playback." },
  { id: "funscript", label: "Funscript",        icon: "wand-sparkles",    color: "var(--accent)",
    ext: ".funscript", purpose: "The canonical haptic script — compatible with every major player and editor (FunscriptForge, OFS, ScriptPlayer)." },
  { id: "haptic",    label: "Haptic script",    icon: "vibrate",          color: "var(--mode-chaotic)",
    ext: ".haptic.json", purpose: "Device-agnostic intent format. Includes per-event intensity + duration + body-zone target — usable by bHaptics, OSR rigs, custom hardware." },
  { id: "forgeMeta", label: "Forge metadata",   icon: "file-cog",         color: "var(--accent-warm-2)",
    ext: ".forge.json", purpose: "NEW. Captures the chapter sidecar + influence mix + recipes + provenance. The single sidecar that lets ForgeGen reproduce this exact output later." },
];

function ExportGrid({ project, recipes, selected, toggle }) {
  return (
    <div style={{ display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
      {EXPORT_TARGETS.map(t => {
        const stat = computeExportStat(t, project, recipes);
        const isChecked = !!selected[t.id];
        return (
          <ExportCard key={t.id} target={t} stat={stat}
                      checked={isChecked} onToggle={() => toggle(t.id)} />
        );
      })}
    </div>
  );
}

function ExportCard({ target, stat, checked, onToggle }) {
  const t = target;
  return (
    <div role="button" tabIndex={0}
         onClick={onToggle}
         onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggle(); } }}
         style={{
           position: "relative",
           padding: 14, borderRadius: 10,
           background: checked ? "var(--surface)" : "var(--surface-2)",
           border: `1px solid ${checked ? t.color : "var(--border)"}`,
           borderLeftWidth: 4, borderLeftColor: t.color,
           cursor: "pointer", fontFamily: "inherit", textAlign: "left",
           display: "flex", flexDirection: "column", gap: 8,
           boxShadow: checked ? `0 0 0 1px ${t.color}40` : "none",
           transition: "background 150ms, border-color 150ms, box-shadow 150ms",
         }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          display: "grid", placeItems: "center",
          background: `color-mix(in srgb, ${t.color} 15%, transparent)`,
          border: `1px solid color-mix(in srgb, ${t.color} 35%, transparent)`,
          flexShrink: 0,
        }}>
          <Icon name={t.icon} size={13} style={{ color: t.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</span>
            {t.id === "forgeMeta" && (
              <span className="mono" style={{
                fontSize: 8.5, padding: "1px 5px", borderRadius: 3,
                background: "var(--warm-glow)", color: "var(--accent-warm-2)",
                border: "1px solid var(--accent-warm)",
              }}>NEW</span>
            )}
          </div>
          <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>{t.ext}</span>
        </div>
        <CheckboxSquare checked={checked} color={t.color} />
      </div>

      <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
        {t.purpose}
      </p>

      <div style={{ display: "flex", gap: 10, paddingTop: 6,
                      borderTop: "1px dashed var(--border)" }}>
        {stat.map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-dim)",
                             textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--text)", fontWeight: 700 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckboxSquare({ checked, color }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: 5,
      border: `1.5px solid ${checked ? color : "var(--border-strong)"}`,
      background: checked ? color : "transparent",
      display: "grid", placeItems: "center", flexShrink: 0,
      transition: "background 150ms, border-color 150ms",
    }}>
      {checked && <Icon name="check" size={12} style={{ color: "#fff" }} />}
    </div>
  );
}

function computeExportStat(target, project, recipes) {
  const fs = project.funscript;
  if (target.id === "audio") {
    return [
      { label: "duration", value: fmtMs(project.duration_ms) },
      { label: "size",     value: "~94 MB" },
    ];
  }
  if (target.id === "beatTrack") {
    return [
      { label: "downbeats", value: project.beats.filter(b => b.is_downbeat).length },
      { label: "bpm",       value: `${project.bpm} · ${project.meter}` },
    ];
  }
  if (target.id === "funscript") {
    return [
      { label: "actions", value: fs.actions.length.toLocaleString() },
      { label: "range",   value: `${fs.range}%` },
    ];
  }
  if (target.id === "haptic") {
    return [
      { label: "events",   value: Math.round(fs.actions.length * 0.7).toLocaleString() },
      { label: "channels", value: "stroke · pulse" },
    ];
  }
  if (target.id === "forgeMeta") {
    return [
      { label: "chapters",  value: project.chapters.length },
      { label: "recipes",   value: recipes?.length || 0 },
      { label: "influences",value: 4 },
    ];
  }
  return [];
}

// ── Destinations grid ────────────────────────────────────────
function DestinationsGrid({ destinations, toggle, megaAccount, setMegaAccount, bundleCount }) {
  const dests = [
    { id: "disk", label: "Local disk", icon: "hard-drive", color: "var(--text-muted)",
      summary: "Save to ~/Downloads/ — chooses a folder per file, or zips the bundle." },
    { id: "mega", label: "Mega cloud", icon: "cloud-upload", color: "var(--info)",
      summary: "Encrypted upload to your Mega.nz account. Bundle uploads as a zipped folder." },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {dests.map(d => {
        const checked = destinations[d.id];
        return (
          <div key={d.id} role="button" tabIndex={0}
               onClick={() => toggle(d.id)}
               onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(d.id); } }}
               style={{
                 padding: 14, borderRadius: 10,
                 background: checked ? "var(--surface)" : "var(--surface-2)",
                 border: `1px solid ${checked ? d.color : "var(--border)"}`,
                 borderLeftWidth: 4, borderLeftColor: d.color,
                 cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                 display: "flex", flexDirection: "column", gap: 10,
                 boxShadow: checked ? `0 0 0 1px ${d.color}40` : "none",
                 transition: "background 150ms, border-color 150ms",
               }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                display: "grid", placeItems: "center",
                background: `color-mix(in srgb, ${d.color} 15%, transparent)`,
                border: `1px solid color-mix(in srgb, ${d.color} 35%, transparent)`,
                flexShrink: 0,
              }}>
                <Icon name={d.icon} size={13} style={{ color: d.color }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{d.label}</span>
              {d.id === "mega" && megaAccount.connected && (
                <Pill tone="info" dot style={{ fontSize: 9.5, padding: "1px 7px" }}>connected</Pill>
              )}
              {d.id === "mega" && !megaAccount.connected && (
                <Pill tone="warn" style={{ fontSize: 9.5, padding: "1px 7px" }}>not connected</Pill>
              )}
              <CheckboxSquare checked={checked} color={d.color} />
            </div>

            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
              {d.summary}
            </p>

            {d.id === "mega" && (
              <MegaPanel account={megaAccount} setAccount={setMegaAccount} bundleCount={bundleCount} />
            )}
            {d.id === "disk" && (
              <div style={{ paddingTop: 6, borderTop: "1px dashed var(--border)",
                              display: "flex", gap: 14, alignItems: "center" }}>
                <Icon name="folder" size={11} style={{ color: "var(--text-dim)" }} />
                <span className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                  ~/Downloads/forgegen/
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={(e) => e.stopPropagation()} style={{
                  fontSize: 10.5, fontFamily: "inherit", fontWeight: 600,
                  background: "transparent", border: "none", color: "var(--accent-2)",
                  cursor: "pointer", padding: 0,
                }}>Change…</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MegaPanel({ account, setAccount, bundleCount }) {
  if (!account.connected) {
    return (
      <div style={{ paddingTop: 8, borderTop: "1px dashed var(--border)",
                      display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="key-round" size={12} style={{ color: "var(--info)" }} />
        <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>
          Sign in to your Mega account to enable uploads.
        </span>
        <button onClick={(e) => { e.stopPropagation(); setAccount(a => ({ ...a, connected: true })); }}
                style={{
                  padding: "5px 10px", borderRadius: 5,
                  background: "var(--info)", color: "#fff", border: "none",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>Connect to Mega</button>
      </div>
    );
  }
  const pct = (account.storageUsedGb / account.storageTotalGb) * 100;
  return (
    <div style={{ paddingTop: 8, borderTop: "1px dashed var(--border)",
                    display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="user-round" size={11} style={{ color: "var(--info)" }} />
        <span className="mono" style={{ fontSize: 10.5, color: "var(--text)" }}>
          {account.email}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={(e) => { e.stopPropagation(); setAccount(a => ({ ...a, connected: false })); }}
                style={{
                  fontSize: 10, fontFamily: "inherit", fontWeight: 600,
                  background: "transparent", border: "none", color: "var(--text-dim)",
                  cursor: "pointer", padding: 0,
                }}>Sign out</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "var(--text-dim)", minWidth: 60 }}>storage</span>
        <div style={{ flex: 1, height: 4, background: "var(--surface-3)",
                        borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%",
                          background: pct > 80 ? "var(--accent-warm)" : "var(--info)" }} />
        </div>
        <span className="mono" style={{ fontSize: 10, color: "var(--text)" }}>
          {account.storageUsedGb.toFixed(1)} / {account.storageTotalGb} GB
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="folder" size={11} style={{ color: "var(--text-dim)" }} />
        <span className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)", flex: 1 }}>
          {account.folder}
        </span>
        <button onClick={(e) => e.stopPropagation()} style={{
          fontSize: 10.5, fontFamily: "inherit", fontWeight: 600,
          background: "transparent", border: "none", color: "var(--accent-2)",
          cursor: "pointer", padding: 0,
        }}>Change…</button>
      </div>
      {bundleCount > 0 && (
        <div className="mono" style={{ fontSize: 9.5, color: "var(--text-dim)",
                                          padding: "4px 6px", borderRadius: 4,
                                          background: "var(--surface-2)" }}>
          ↑ on export, {bundleCount} {bundleCount === 1 ? "file" : "files"} will upload as <span style={{ color: "var(--accent-2)" }}>big_buck_bunny.forge.zip</span>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ project, recipes }) {
  const fs = project.funscript;
  const md5 = fs.metadata.generated_from.source.partial_md5;
  const tool = `${fs.metadata.generated_from.tool} ${fs.metadata.generated_from.tool_version}`;
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: "var(--surface)", border: "1px solid var(--accent)",
      boxShadow: "var(--glow-accent)",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="circle-check-big" size={14} style={{ color: "var(--success)" }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--success)",
                        textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Funscript ready to inspect
        </span>
        <Pill tone="neutral">{tool}</Pill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8 }}>
        <SummaryRow label="path"     value={`${project.source_path.replace(/\.[^.]+$/, "")}.funscript`} mono />
        <SummaryRow label="actions"  value={`${fs.actions.length.toLocaleString()} · ${project.bpm} BPM · ${fmtMs(project.duration_ms)}`} />
        <SummaryRow label="recipes"  value={recipesSummary(recipes, project)} />
        <SummaryRow label="source"   value={`md5 ${md5}`} mono />
      </div>
    </div>
  );
}

function SummaryRow({ label, value, mono }) {
  return (<>
    <span style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase",
                    letterSpacing: "0.08em", fontWeight: 700, minWidth: 80 }}>{label}</span>
    <span className={mono ? "mono" : ""} style={{ fontSize: 12.5,
                    color: "var(--text)", wordBreak: "break-all" }}>{value}</span>
  </>);
}

function recipesSummary(recipes, project) {
  if (!recipes?.length) return "—";
  const styles  = new Set(recipes.map(r => r.style));
  const dens    = new Set(recipes.map(r => r.density));
  const shapes  = new Set(recipes.map(r => r.shape));
  const mix     = project?.influenceMix;
  const dom = mix ? dominantInfluenceSummary(mix) : null;
  return [
    `style ${styles.size === 1 ? [...styles][0] : "mixed"}`,
    `density ${dens.size === 1 ? `${[...dens][0]}×` : "mixed"}`,
    `shape ${shapes.size === 1 ? [...shapes][0] : "mixed"}`,
    dom && `dominant ${dom}`,
  ].filter(Boolean).join(" · ");
}

function dominantInfluenceSummary(mix) {
  const sum = { beat: 0, bass: 0, voice: 0, ambient: 0 };
  for (const m of mix) { sum.beat += m.beat; sum.bass += m.bass; sum.voice += m.voice; sum.ambient += m.ambient; }
  return Object.entries(sum).sort((a, b) => b[1] - a[1])[0][0];
}

// ── Per-chapter breakdown table ──────────────────────────────
function PerChapterBreakdown({ project, recipes, zoom, onSetZoom }) {
  const rows = project.chapters.map((c, i) => {
    const acts = project.funscript.actions.filter(a => a.at >= c.at_ms && a.at < c.end_ms);
    let totalV = 0, n = 0;
    for (let j = 0; j < acts.length - 1; j++) {
      const dp = Math.abs(acts[j + 1].pos - acts[j].pos);
      const dt = Math.max(1, acts[j + 1].at - acts[j].at);
      totalV += (dp / dt) * 1000;
      n++;
    }
    const meanV = n ? totalV / n : 0;
    return { ch: c, idx: i, actions: acts.length, meanV, recipe: recipes[i] };
  });
  return (
    <div style={{ borderRadius: 10, overflow: "hidden",
                    border: "1px solid var(--border)", background: "var(--surface)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--surface-2)", fontSize: 10, fontWeight: 700,
                         color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            <Th2>#</Th2>
            <Th2 align="left">Chapter</Th2>
            <Th2>Style</Th2>
            <Th2>Density</Th2>
            <Th2>Shape</Th2>
            <Th2>Actions</Th2>
            <Th2>Mean velocity</Th2>
            <Th2></Th2>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isZoomed = zoom && zoom.start_ms === r.ch.at_ms && zoom.end_ms === r.ch.end_ms;
            const vBucket = Math.min(6, Math.floor(r.meanV / 100));
            return (
              <tr key={r.ch.id} style={{ borderTop: "1px solid var(--border)",
                                            background: isZoomed ? "var(--accent-glow)" : "transparent" }}>
                <Td2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 4, height: 22, borderRadius: 2, background: r.ch.color }} />
                    <span className="mono" style={{ color: "var(--text-dim)" }}>{String(r.idx + 1).padStart(2, "0")}</span>
                  </div>
                </Td2>
                <Td2 align="left">
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.ch.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>{fmtMs(r.ch.duration_ms)}</div>
                </Td2>
                <Td2><Pill tone="neutral">{r.recipe.style}</Pill></Td2>
                <Td2><span className="mono" style={{ color: "var(--text)" }}>{r.recipe.density}×</span></Td2>
                <Td2><Pill tone="neutral">{r.recipe.shape}</Pill></Td2>
                <Td2><span className="mono">{r.actions.toLocaleString()}</span></Td2>
                <Td2>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    <span className="mono" style={{ color: `var(--chart-v${vBucket})`, fontWeight: 700 }}>
                      {Math.round(r.meanV)}
                    </span>
                    <span style={{ width: 40, height: 4, background: "var(--surface-2)", borderRadius: 999 }}>
                      <span style={{
                        display: "block", width: `${Math.min(100, r.meanV / 6)}%`, height: "100%",
                        borderRadius: 999, background: `var(--chart-v${vBucket})`,
                      }} />
                    </span>
                  </div>
                </Td2>
                <Td2>
                  <Button kind={isZoomed ? "secondary" : "ghost"} size="sm"
                          icon={isZoomed ? "zoom-out" : "zoom-in"}
                          onClick={() => onSetZoom(isZoomed ? null : { start_ms: r.ch.at_ms, end_ms: r.ch.end_ms })}>
                    {isZoomed ? "Reset" : "Zoom"}
                  </Button>
                </Td2>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th2({ children, align = "center" }) {
  return <th style={{ padding: "10px 12px", fontSize: 10, fontWeight: 700, textAlign: align }}>{children}</th>;
}
function Td2({ children, align = "center" }) {
  return <td style={{ padding: "10px 12px", textAlign: align, verticalAlign: "middle" }}>{children}</td>;
}

Object.assign(window, { OutputTab, EXPORT_TARGETS });
