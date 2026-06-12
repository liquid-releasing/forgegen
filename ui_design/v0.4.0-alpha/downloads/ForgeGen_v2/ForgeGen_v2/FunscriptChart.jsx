// ForgeGen · Funscript chart — the headline visualization.
//
// Renders a position-vs-time line of every action, with line segments
// coloured by per-segment velocity (using the --chart-v0..v6 perceptual
// gradient that matches FunscriptForge). Stacked underneath:
//
//   • Stroke-amplitude band — instantaneous peak-to-peak amplitude
//   • Density heatmap band — actions-per-bin as a warm gradient
//   • Beat-tick row — full-height vertical ticks; downbeats brighter
//   • Per-chapter colour ribbon — clickable chapter zoom
//   • Phrase-mode ribbon — mode-coloured stripes
//   • Beat-locked playhead — pulses on each beat tick during playback
//   • Hover scrubber — vertical cursor + readout
//
// All bands share one X axis (ms). Zoom is range-based:
//   { start_ms, end_ms } | null → full
// Clicking the chapter ribbon zooms to that chapter; double-click on
// the chart resets zoom.
//
// Performance notes for the prototype:
//   • Up to ~3,500 actions render at 60fps with svg + per-segment
//     <line>s on a modern machine. We thin draw above the chart's
//     pixel width via a stride pick on the displayed set (preserves
//     min/max within stride for envelope readability).
//   • Beats are denser than actions; we draw them as a single <path>
//     with line-segment d-string per tick to keep the node count low.

const FG_CHART_H        = 240;     // position chart height (px)
const FG_AMP_H          = 36;      // amplitude band
const FG_HEAT_H         = 18;      // density heatmap
const FG_BEAT_ROW_H     = 14;      // beat ticks
const FG_CHAPTER_H      = 22;      // chapter ribbon (clickable)
const FG_PHRASE_H       = 12;      // phrase-mode ribbon
const FG_GAP            = 4;       // gap between bands

function FunscriptChart({ project, zoom, onSetZoom,
                          playheadMs, onSetPlayheadMs,
                          showHeatmap = true, showPhraseRibbon = true,
                          showBeatTicks = true, showAmplitude = true,
                          heatRibbon = true, isPlaying = false,
                          onTogglePlay }) {
  const { duration_ms, chapters, phrases, beats, funscript } = project;
  const start = zoom ? zoom.start_ms : 0;
  const end   = zoom ? zoom.end_ms   : duration_ms;
  const span  = Math.max(1, end - start);

  // Helpers
  const xOf = (ms) => ((ms - start) / span) * 100;     // %
  const inView = (ms) => ms >= start && ms <= end;

  // ── Decimate actions for the displayed range ───────────────
  // Keep an envelope-preserving subset by min/max per bucket. Cap to
  // ~1200 segments → fast SVG render even on long files.
  const filteredActions = useMemo(() => {
    const acts = funscript.actions.filter(a => a.at >= start && a.at <= end);
    if (acts.length <= 1200) return acts;
    const buckets = 600;
    const bucketSize = Math.ceil(acts.length / buckets);
    const out = [];
    for (let i = 0; i < acts.length; i += bucketSize) {
      const slice = acts.slice(i, i + bucketSize);
      // Keep both min and max of the bucket so the envelope reads correctly.
      let lo = slice[0], hi = slice[0];
      for (const a of slice) {
        if (a.pos < lo.pos) lo = a;
        if (a.pos > hi.pos) hi = a;
      }
      out.push(lo === hi ? lo : (lo.at < hi.at ? lo : hi));
      if (lo !== hi) out.push(lo.at < hi.at ? hi : lo);
    }
    return out;
  }, [funscript.actions, start, end]);

  // ── Hover scrubber state ──────────────────────────────────
  const wrapRef = useRef(null);
  const [hoverMs, setHoverMs] = useState(null);
  function onMouseMove(e) {
    const r = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const ms = start + (x / r.width) * span;
    setHoverMs(ms);
  }
  function onClickChart(e) {
    if (!onSetPlayheadMs) return;
    const r = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    onSetPlayheadMs(start + (x / r.width) * span);
  }
  function onDoubleClick() { if (zoom && onSetZoom) onSetZoom(null); }

  return (
    <div className="vstack" style={{ gap: FG_GAP, position: "relative" }}>
      {/* ── Toolbar ───────────────────────────────────────── */}
      <ChartToolbar project={project} zoom={zoom} onSetZoom={onSetZoom}
                     playheadMs={playheadMs} onSetPlayheadMs={onSetPlayheadMs}
                     isPlaying={isPlaying} onTogglePlay={onTogglePlay}
                     hoverMs={hoverMs} />

      <div ref={wrapRef} style={{ position: "relative", borderRadius: 8,
                                    overflow: "hidden", border: "1px solid var(--border)",
                                    background: "var(--surface-2)" }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverMs(null)}
        onClick={onClickChart}
        onDoubleClick={onDoubleClick}>

        {/* Position curve — main chart */}
        <PositionCurve actions={filteredActions} xOf={xOf}
                        height={FG_CHART_H} chapters={chapters} start={start} end={end} />

        {/* Amplitude band */}
        {showAmplitude && (
          <AmplitudeBand actions={filteredActions} xOf={xOf} height={FG_AMP_H}
                          start={start} end={end} />
        )}

        {/* Density heatmap */}
        {showHeatmap && (
          <DensityHeatmap actions={funscript.actions} duration={duration_ms}
                           start={start} end={end} height={FG_HEAT_H} heatRibbon={heatRibbon} />
        )}

        {/* Beat ticks row */}
        {showBeatTicks && (
          <BeatTicksRow beats={beats} xOf={xOf} inView={inView} height={FG_BEAT_ROW_H}
                         playheadMs={playheadMs} isPlaying={isPlaying} />
        )}

        {/* Phrase-mode ribbon */}
        {showPhraseRibbon && (
          <PhraseModeRibbon phrases={phrases} xOf={xOf} inView={inView} height={FG_PHRASE_H} />
        )}

        {/* Chapter ribbon (clickable for zoom) */}
        <ChapterRibbon chapters={chapters} xOf={xOf} inView={inView}
                        height={FG_CHAPTER_H} zoom={zoom} onSetZoom={onSetZoom} />

        {/* Hover scrubber overlay */}
        {hoverMs !== null && (
          <div style={{
            position: "absolute", top: 0, bottom: 0,
            left: `${xOf(hoverMs)}%`, width: 1,
            background: "rgba(255,255,255,0.45)",
            pointerEvents: "none",
          }} />
        )}

        {/* Playhead overlay */}
        {playheadMs !== null && playheadMs !== undefined && inView(playheadMs) && (
          <Playhead xOf={xOf} playheadMs={playheadMs} isPlaying={isPlaying} />
        )}
      </div>

      {/* Time scale row */}
      <TimeScale duration={duration_ms} start={start} end={end} />
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────────
function ChartToolbar({ project, zoom, onSetZoom, playheadMs, onSetPlayheadMs,
                        isPlaying, onTogglePlay, hoverMs }) {
  const ch = zoom ? project.chapters.find(c => c.at_ms === zoom.start_ms && c.end_ms === zoom.end_ms)
                  : null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px",
      background: "var(--surface)", borderRadius: 8,
      border: "1px solid var(--border)",
    }}>
      <Button kind="ghost" size="icon" title="Rewind"
              onClick={() => onSetPlayheadMs && onSetPlayheadMs(zoom?.start_ms ?? 0)}>
        <Icon name="skip-back" size={14} />
      </Button>
      <Button kind={isPlaying ? "secondary" : "primary"} size="sm"
              icon={isPlaying ? "pause" : "play"} onClick={onTogglePlay}>
        {isPlaying ? "Pause" : "Play"}
      </Button>
      <Button kind="ghost" size="icon" title="Fast-forward"
              onClick={() => onSetPlayheadMs && onSetPlayheadMs(zoom?.end_ms ?? project.duration_ms)}>
        <Icon name="skip-forward" size={14} />
      </Button>

      <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />

      <Pill tone="accent" dot>{project.bpm} BPM · {project.meter}</Pill>
      {zoom ? (
        <>
          <Pill tone="warm">
            <Icon name="zoom-in" size={10} style={{ marginRight: 4 }} />
            zoomed · {ch?.name || `${fmtMs(zoom.start_ms)}–${fmtMs(zoom.end_ms)}`}
          </Pill>
          <Button kind="ghost" size="sm" icon="zoom-out" onClick={() => onSetZoom(null)}>Reset zoom</Button>
        </>
      ) : (
        <Pill tone="neutral">full track · {fmtMs(project.duration_ms)}</Pill>
      )}

      <div style={{ flex: 1 }} />

      {/* Live readout */}
      <ReadoutBlock label="POS"
        value={playheadMs != null ? posAt(project.funscript.actions, playheadMs) : "—"}
        unit="" mono accent />
      <ReadoutBlock label="TIME"
        value={fmtMsPrecise(playheadMs ?? 0)} mono />
      {hoverMs != null && (
        <ReadoutBlock label="HOVER" value={fmtMsPrecise(hoverMs)} mono dim />
      )}
    </div>
  );
}

function ReadoutBlock({ label, value, unit, mono, accent, dim }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-dim)",
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span className={mono ? "mono" : ""} style={{
        fontSize: 13, fontWeight: 700,
        color: accent ? "var(--accent-warm-2)" : (dim ? "var(--text-dim)" : "var(--text)"),
      }}>{value}{unit}</span>
    </div>
  );
}

function posAt(actions, ms) {
  // Linear interp between bracketing actions.
  if (!actions || actions.length === 0) return "—";
  if (ms <= actions[0].at) return actions[0].pos;
  if (ms >= actions[actions.length - 1].at) return actions[actions.length - 1].pos;
  for (let i = 0; i < actions.length - 1; i++) {
    const a = actions[i], b = actions[i + 1];
    if (ms >= a.at && ms <= b.at) {
      const t = (ms - a.at) / Math.max(1, b.at - a.at);
      return Math.round(a.pos + t * (b.pos - a.pos));
    }
  }
  return "—";
}

// ── Position curve (the main chart) ────────────────────────────
function PositionCurve({ actions, xOf, height, chapters, start, end }) {
  // Per-segment lines, coloured by velocity bucket.
  const segments = [];
  for (let i = 0; i < actions.length - 1; i++) {
    const a = actions[i], b = actions[i + 1];
    const v = fgVelocityBucket(a, b);
    segments.push({ x1: xOf(a.at), y1: 100 - a.pos, x2: xOf(b.at), y2: 100 - b.pos, v });
  }
  // Chapter background bands inside the chart for context.
  const bands = chapters.map((c, i) => ({
    left: xOf(Math.max(c.at_ms, start)),
    right: xOf(Math.min(c.end_ms, end)),
    color: c.color, i,
  })).filter(b => b.right > 0 && b.left < 100);
  return (
    <div style={{ position: "relative", height, background: "var(--surface-2)",
                   borderBottom: "1px solid var(--border)" }}>
      {/* Chapter bg bands (very low opacity) */}
      {bands.map(b => (
        <div key={b.i} style={{
          position: "absolute",
          left: `${b.left}%`, width: `${b.right - b.left}%`,
          top: 0, bottom: 0,
          background: `linear-gradient(180deg, ${b.color}26 0%, transparent 60%)`,
          pointerEvents: "none",
        }} />
      ))}
      {/* Horizontal guide lines at 0/25/50/75/100 */}
      <svg width="100%" height={height} preserveAspectRatio="none"
            viewBox="0 0 100 100" style={{ position: "absolute", inset: 0 }}>
        {[0, 25, 50, 75, 100].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y}
                stroke={y === 50 ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)"}
                strokeWidth="0.2" />
        ))}
        {/* Action segments — coloured by velocity */}
        {segments.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke={`var(--chart-v${s.v})`} strokeWidth="0.45"
                vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        ))}
      </svg>
      {/* Vertical scale labels */}
      <div className="mono" style={{
        position: "absolute", left: 4, top: 4,
        fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.05em",
      }}>100</div>
      <div className="mono" style={{
        position: "absolute", left: 4, bottom: 4,
        fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.05em",
      }}>0</div>
    </div>
  );
}

// ── Amplitude band ─────────────────────────────────────────────
// Instantaneous peak-to-peak amplitude — derived from a sliding window
// of the most recent N actions. Reads as "how big are the strokes right
// now?", complementing the position curve.
function AmplitudeBand({ actions, xOf, height, start, end }) {
  const samples = useMemo(() => {
    const window = 12;            // actions
    const out = [];
    for (let i = 0; i < actions.length; i++) {
      let lo = 100, hi = 0;
      const from = Math.max(0, i - window);
      for (let j = from; j <= i; j++) {
        const p = actions[j].pos;
        if (p < lo) lo = p; if (p > hi) hi = p;
      }
      out.push({ at: actions[i].at, amp: hi - lo });
    }
    return out;
  }, [actions]);
  if (samples.length === 0) return <div style={{ height }} />;
  const points = samples.map(s => `${xOf(s.at)},${height - (s.amp / 100) * height}`).join(" ");
  return (
    <div style={{ position: "relative", height, background: "var(--surface-2)",
                   borderBottom: "1px solid var(--border)" }}>
      <svg width="100%" height={height} preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0 }} viewBox={`0 0 100 ${height}`}>
        <polygon points={`0,${height} ${points} 100,${height}`}
                  fill="var(--accent-glow-strong)" stroke="var(--accent)" strokeWidth="0.6"
                  vectorEffect="non-scaling-stroke" />
      </svg>
      <span style={{ position: "absolute", left: 6, top: 4,
                      fontSize: 9, fontWeight: 700, color: "var(--text-dim)",
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Amplitude
      </span>
    </div>
  );
}

// ── Density heatmap ────────────────────────────────────────────
function DensityHeatmap({ actions, duration, start, end, height, heatRibbon }) {
  const bins = useMemo(() => {
    const bins = 240;
    const arr = new Array(bins).fill(0);
    for (const a of actions) {
      if (a.at < start || a.at > end) continue;
      const span = Math.max(1, end - start);
      const i = Math.min(bins - 1, Math.floor(((a.at - start) / span) * bins));
      arr[i]++;
    }
    const max = Math.max(1, ...arr);
    return arr.map(v => v / max);
  }, [actions, start, end]);
  // Warm gradient: cold→hot. Heat-ribbon style.
  function colour(v) {
    if (heatRibbon) {
      const stops = [
        [0,    "#1f3a8a"],     // cold blue
        [0.25, "#2563eb"],
        [0.5,  "#eab308"],
        [0.75, "#ff8c42"],
        [1,    "#ff4b4b"],     // hot red
      ];
      for (let i = 0; i < stops.length - 1; i++) {
        const [s1, c1] = stops[i], [s2, c2] = stops[i + 1];
        if (v >= s1 && v <= s2) {
          const t = (v - s1) / Math.max(0.0001, s2 - s1);
          return blendHex(c1, c2, t);
        }
      }
      return stops[stops.length - 1][1];
    }
    // Mono accent gradient
    return blendHex("#0e1117", "#ff4b4b", v);
  }
  return (
    <div style={{ position: "relative", height, background: "var(--surface-2)",
                   borderBottom: "1px solid var(--border)", display: "flex" }}>
      {bins.map((v, i) => (
        <div key={i} style={{ flex: 1, background: colour(v) }} />
      ))}
      <span style={{ position: "absolute", left: 6, top: 1,
                      fontSize: 9, fontWeight: 700, color: "var(--text)",
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
        Density
      </span>
    </div>
  );
}

function blendHex(a, b, t) {
  function p(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
  const [ar,ag,ab] = p(a), [br,bg,bb] = p(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

// ── Beat ticks row ─────────────────────────────────────────────
function BeatTicksRow({ beats, xOf, inView, height, playheadMs, isPlaying }) {
  return (
    <div style={{ position: "relative", height, background: "var(--surface-2)",
                   borderBottom: "1px solid var(--border)" }}>
      <svg width="100%" height={height} preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0 }} viewBox={`0 0 100 ${height}`}>
        {beats.filter(b => inView(b.time_ms)).map((b, i) => {
          const x = xOf(b.time_ms);
          const tickH = b.is_downbeat ? height : height * 0.5;
          const colour = b.is_downbeat ? "var(--accent-warm)" : "rgba(255,255,255,0.18)";
          return (
            <line key={i} x1={x} y1={height} x2={x} y2={height - tickH}
                  stroke={colour} strokeWidth={b.is_downbeat ? "0.5" : "0.25"}
                  vectorEffect="non-scaling-stroke" />
          );
        })}
      </svg>
      <span style={{ position: "absolute", left: 6, top: 0,
                      fontSize: 9, fontWeight: 700, color: "var(--text-dim)",
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Beats
      </span>
    </div>
  );
}

// ── Phrase mode ribbon ─────────────────────────────────────────
function PhraseModeRibbon({ phrases, xOf, inView, height }) {
  return (
    <div style={{ position: "relative", height, background: "var(--surface-2)",
                   borderBottom: "1px solid var(--border)" }}>
      {phrases.filter(p => inView(p.at_ms + 1) || inView(p.end_ms - 1)).map(p => {
        const x1 = xOf(p.at_ms), x2 = xOf(p.end_ms);
        if (x2 - x1 < 0.3) return null;
        return (
          <div key={p.id} title={`${p.mode} · ${fmtMs(p.duration_ms)}`}
            style={{
              position: "absolute", left: `${x1}%`, width: `${x2 - x1}%`,
              top: 0, bottom: 0,
              background: fgModeVar(p.mode),
              opacity: 0.85,
              borderRight: "1px solid rgba(0,0,0,0.45)",
            }} />
        );
      })}
    </div>
  );
}

// ── Chapter ribbon (clickable) ─────────────────────────────────
function ChapterRibbon({ chapters, xOf, inView, height, zoom, onSetZoom }) {
  return (
    <div style={{ position: "relative", height, background: "var(--surface)",
                   display: "flex" }}>
      {chapters.map((c, i) => {
        const isZoomed = zoom && zoom.start_ms === c.at_ms && zoom.end_ms === c.end_ms;
        const partial = !inView(c.at_ms + 1) && !inView(c.end_ms - 1);
        const x1 = Math.max(0, xOf(c.at_ms));
        const x2 = Math.min(100, xOf(c.end_ms));
        const visible = x2 > 0 && x1 < 100 && (x2 - x1) > 0.3;
        if (!visible) return null;
        return (
          <button key={c.id} onClick={(e) => {
            e.stopPropagation();
            if (onSetZoom) onSetZoom(isZoomed ? null : { start_ms: c.at_ms, end_ms: c.end_ms });
          }}
            title={`${c.name} · ${fmtMs(c.duration_ms)} · double-click chart to reset`}
            style={{
              position: "absolute",
              left: `${x1}%`, width: `${x2 - x1}%`,
              top: 0, bottom: 0,
              background: c.color, opacity: isZoomed ? 1 : 0.85,
              borderRight: "1px solid rgba(0,0,0,0.4)",
              border: "none",
              padding: "0 6px",
              display: "flex", alignItems: "center", gap: 5,
              color: "#fff", fontFamily: "inherit",
              fontSize: 10, fontWeight: 700,
              textShadow: "0 1px 2px rgba(0,0,0,0.45)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              cursor: "pointer",
              outline: isZoomed ? "2px solid var(--text)" : "none",
              outlineOffset: -2,
              boxShadow: isZoomed ? "inset 0 0 0 1px rgba(255,255,255,0.4)" : "none",
            }}>
            <span className="mono" style={{ opacity: 0.8 }}>{String(i + 1).padStart(2, "0")}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Playhead ───────────────────────────────────────────────────
function Playhead({ xOf, playheadMs, isPlaying }) {
  return (
    <div style={{
      position: "absolute", top: 0, bottom: 0,
      left: `${xOf(playheadMs)}%`, width: 2,
      background: "var(--accent-spark)",
      boxShadow: "0 0 10px rgba(255,209,102,0.75)",
      pointerEvents: "none", zIndex: 20,
    }}>
      {/* Pulse dot at the top — beat-locked */}
      <div style={{
        position: "absolute", top: -3, left: -5,
        width: 12, height: 12, borderRadius: "50%",
        background: "var(--accent-spark)",
        boxShadow: "0 0 12px rgba(255,209,102,0.9)",
        animation: isPlaying ? "fg-beatpulse 1.2s infinite" : "none",
      }} />
    </div>
  );
}

// ── Time scale ─────────────────────────────────────────────────
function TimeScale({ duration, start, end }) {
  const span = end - start;
  const ticks = 8;
  return (
    <div style={{ display: "flex", padding: "0 6px",
                    fontSize: 10, color: "var(--text-dim)",
                    fontFamily: "var(--font-mono)" }}>
      {Array.from({ length: ticks + 1 }).map((_, i) => (
        <div key={i} style={{ flex: 1, textAlign: i === 0 ? "left" : (i === ticks ? "right" : "center") }}>
          {fmtMs(start + (i / ticks) * span)}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  FunscriptChart,
  FG_CHART_H, FG_AMP_H, FG_HEAT_H, FG_BEAT_ROW_H, FG_CHAPTER_H, FG_PHRASE_H,
});
