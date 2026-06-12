// SourcesTab.tsx — ForgeGen v3 "Sources" stage (React + Tauri).
//
// Controlled / props-driven: the parent owns `sources` (the per-chapter
// selection) and all the async flags. This component renders the compare
// surface and calls back on every choice. Styling: sources.css + tokens.css.
//
// Icons use lucide-react. The source engine lives in sourceEngine.ts.

import React from "react";
import {
  AudioLines, Video, FileDown, Check, BadgeCheck, GitBranch,
  Loader2, WandSparkles,
} from "lucide-react";
import type {
  Action, Candidates, Chapter, ImportedTrack, SourceConf, SourceId,
} from "./types";
import { SOURCES, sourceMix } from "./sourceEngine";
import "./sources.css";

const ICON = { "audio-lines": AudioLines, "video": Video, "file-down": FileDown } as const;
function SourceIcon({ id, size = 12 }: { id: SourceId; size?: number }) {
  const Cmp = ICON[SOURCES[id].icon];
  return <Cmp size={size} />;
}

// CSS custom properties typed loosely so we can pass --src / --ch.
type Vars = React.CSSProperties & Record<`--${string}`, string>;

export interface SourcesTabProps {
  chapters: Chapter[];
  durationMs: number;
  candidates: Candidates;
  conf: SourceConf[];            // per chapter
  sources: SourceId[];          // per chapter (controlled)
  suggested: SourceId[];        // per chapter
  videoAnalyzed: boolean;
  analyzing: boolean;
  analyzeProgress: number;      // 0..1
  imported: ImportedTrack | null;
  focusedIdx: number;
  onFocus: (i: number) => void;
  onSelect: (i: number, s: SourceId) => void;
  onUseSuggested: () => void;
  onSetAll: (s: SourceId) => void;
  onAnalyzeVideo: () => void;
  onImport: () => void;
}

// ── Mini funscript curve — one chapter slice ─────────────────
function MiniChart({ actions, chapter, srcId, faded }:
  { actions: Action[] | null; chapter: Chapter; srcId: SourceId; faded?: boolean }) {
  const slice = React.useMemo(() => {
    const s = actions ? actions.filter(a => a.at >= chapter.at_ms && a.at < chapter.end_ms) : [];
    if (s.length <= 160) return s;
    const stride = Math.ceil(s.length / 160);
    return s.filter((_, i) => i % stride === 0);
  }, [actions, chapter.at_ms, chapter.end_ms]);

  if (!slice.length) {
    return <div className="fg-mini fg-mini--empty"><span>no track</span></div>;
  }
  const span = Math.max(1, chapter.end_ms - chapter.at_ms);
  const pts = slice.map(a => {
    const x = ((a.at - chapter.at_ms) / span) * 100;
    const y = 100 - a.pos;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  const style: Vars = { "--src": SOURCES[srcId].color, opacity: faded ? 0.45 : 1 };
  return (
    <div className="fg-mini" style={style}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
        <line className="fg-mini__base" x1="0" y1="50" x2="100" y2="50" />
        <polyline className="fg-mini__line" points={pts} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function ConfBar({ score, srcId }: { score: number; srcId: SourceId }) {
  const pct = Math.round(score * 100);
  return (
    <div className="fg-conf" style={{ "--src": SOURCES[srcId].color } as Vars}>
      <div className="fg-conf__track"><div className="fg-conf__fill" style={{ width: `${pct}%` }} /></div>
      <span className="fg-conf__pct">{pct}%</span>
    </div>
  );
}

// ── Candidate panel ──────────────────────────────────────────
function CandidatePanel({ srcId, chapter, actions, score, rationale, selected, suggested, trust, onSelect }:
  {
    srcId: SourceId; chapter: Chapter; actions: Action[] | null;
    score: number; rationale: string; selected: boolean; suggested: boolean;
    trust?: boolean; onSelect: (e: React.MouseEvent) => void;
  }) {
  const meta = SOURCES[srcId];
  const cls = ["fg-cand", selected && "fg-cand--selected", !selected && !suggested && "fg-cand--dim"]
    .filter(Boolean).join(" ");
  return (
    <button className={cls} style={{ "--src": meta.color } as Vars} onClick={onSelect}>
      <div className="fg-cand__head">
        <span className="fg-cand__icon"><SourceIcon id={srcId} /></span>
        <span className="fg-cand__label">{meta.label}</span>
        {suggested && <span className="fg-badge">SUGGESTED</span>}
        <span className="fg-cand__check">{selected && <Check size={11} />}</span>
      </div>
      <MiniChart actions={actions} chapter={chapter} srcId={srcId} faded={!selected && !suggested} />
      {trust
        ? <div className="fg-cand__trust"><BadgeCheck size={12} /> User-provided <span>· trusted</span></div>
        : <ConfBar score={score} srcId={srcId} />}
      <p className="fg-cand__why">{rationale}</p>
    </button>
  );
}

// ── Compare card ─────────────────────────────────────────────
function CompareCard({ chapter, idx, candidates, conf, source, suggested, imported, focused, onSelect, onFocus }:
  {
    chapter: Chapter; idx: number; candidates: Candidates; conf: SourceConf;
    source: SourceId; suggested: SourceId; imported: ImportedTrack | null;
    focused: boolean; onSelect: (i: number, s: SourceId) => void; onFocus: (i: number) => void;
  }) {
  const meta = SOURCES[source];
  const available: SourceId[] = (["audio", "video", imported ? "imported" : null] as (SourceId | null)[])
    .filter((s): s is SourceId => !!s && !!candidates[s]);
  const style: Vars = { "--ch": chapter.color, "--src": meta.color };
  return (
    <div className={`fg-card${focused ? " fg-card--focused" : ""}`} style={style} onClick={() => onFocus(idx)}>
      <div className="fg-card__head">
        <span className="fg-card__num">{String(idx + 1).padStart(2, "0")}</span>
        <span className="fg-card__name">{chapter.name}</span>
        <span className="fg-card__using"><SourceIcon id={source} size={11} /> {meta.label}</span>
      </div>
      <div className="fg-card__panels">
        {available.map(s => {
          const isImported = s === "imported";
          return (
            <CandidatePanel
              key={s}
              srcId={s}
              chapter={chapter}
              actions={candidates[s]}
              score={isImported ? 1 : s === "audio" ? conf.audio : conf.video}
              rationale={isImported ? `Imported from ${imported!.name}.` : s === "audio" ? conf.audioWhy : conf.videoWhy}
              trust={isImported}
              selected={source === s}
              suggested={!isImported && suggested === s}
              onSelect={(e) => { e.stopPropagation(); onFocus(idx); onSelect(idx, s); }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Source-mix ribbon ────────────────────────────────────────
function Ribbon({ chapters, durationMs, sources }:
  { chapters: Chapter[]; durationMs: number; sources: SourceId[] }) {
  return (
    <div className="fg-ribbon">
      <div className="fg-ribbon__row">
        {chapters.map((c, i) => {
          const src = sources[i] ?? "audio";
          const changed = i > 0 && (sources[i - 1] ?? "audio") !== src;
          const style: Vars = { "--src": SOURCES[src].color, flex: `${c.duration_ms / durationMs}` };
          return (
            <div key={c.id} className="fg-ribbon__seg" style={style} title={`${c.name} · ${SOURCES[src].label}`}>
              <SourceIcon id={src} size={11} />
              {changed && <div className="fg-ribbon__seam" title="seam — blended on generate" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Acquire banner ───────────────────────────────────────────
function AcquireBanner({ analyzing, progress, onAnalyze }:
  { analyzing: boolean; progress: number; onAnalyze: () => void }) {
  return (
    <div className="fg-acquire">
      <div className="fg-acquire__icon">
        {analyzing ? <Loader2 size={18} className="fg-spin" /> : <Video size={18} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fg-acquire__title">{analyzing ? "Analysing video motion…" : "Only one source so far"}</div>
        <div className="fg-acquire__body">
          {analyzing
            ? "Funscript-Flow is tracking optical flow per chapter — this is the batch pass, run once."
            : <>Run the bundled <b style={{ color: "var(--info)" }}>Video-CV</b> generator to get a second candidate track per chapter, then compare. Audio always runs; video is opt-in.</>}
        </div>
        {analyzing && (
          <div className="fg-acquire__bar"><div className="fg-acquire__fill" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        )}
      </div>
      {!analyzing && (
        <button className="fg-btn fg-btn--primary" style={{ background: "var(--info)", borderColor: "var(--info)" }} onClick={onAnalyze}>
          <Video size={14} /> Analyze video motion
        </button>
      )}
    </div>
  );
}

// ── Inspector ────────────────────────────────────────────────
function Inspector({ chapters, idx, sources, conf, suggested, imported, onFocus, onSelect, onImport }:
  {
    chapters: Chapter[]; idx: number; sources: SourceId[]; conf: SourceConf; suggested: SourceId;
    imported: ImportedTrack | null; onFocus: (i: number) => void;
    onSelect: (i: number, s: SourceId) => void; onImport: () => void;
  }) {
  const c = chapters[idx];
  const src = sources[idx] ?? "audio";
  const meta = SOURCES[src];
  const downstream = src === "video"
    ? "Stamped source=video — FunscriptForge applies CV-refine defaults (smoothing, de-jitter)."
    : src === "imported"
      ? "Stamped source=imported — FunscriptForge treats it as a trusted hand track, refine off by default."
      : "Stamped source=audio — FunscriptForge applies the standard refine defaults.";
  const rows: [SourceId, number, string][] = [
    ["audio", conf.audio, conf.audioWhy],
    ["video", conf.video, conf.videoWhy],
  ];
  return (
    <aside className="fg-insp" style={{ "--ch": c.color, "--src": meta.color } as Vars}>
      <div className="fg-insp__head">
        <div className="fg-insp__eyebrow">Inspector · chapter {String(idx + 1).padStart(2, "0")}</div>
        <div className="fg-insp__title">
          <span className="fg-insp__swatch" />
          <h3 className="fg-insp__name">{c.name}</h3>
        </div>
        <div className="fg-insp__chip">
          <SourceIcon id={src} size={14} />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{meta.label}</div>
            <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{meta.desc}</div>
          </div>
        </div>
      </div>

      <div className="fg-insp__body">
        <section>
          <div className="fg-insp__section-label">Source confidence</div>
          {rows.map(([s, score, why]) => (
            <div key={s} style={{ marginBottom: 12, ["--src" as any]: SOURCES[s].color }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <SourceIcon id={s} size={11} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>{SOURCES[s].label}</span>
                {suggested === s && <span className="fg-badge">SUGGESTED</span>}
                <span style={{ flex: 1 }} />
                {src === s && <span style={{ fontSize: 9, color: "var(--success)", fontWeight: 700 }}>● chosen</span>}
              </div>
              <ConfBar score={score} srcId={s} />
              <p style={{ margin: "5px 0 0", fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{why}</p>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button className={`fg-btn${src === "audio" ? " fg-btn--primary" : ""}`} style={{ flex: 1 }} onClick={() => onSelect(idx, "audio")}>
              <AudioLines size={13} /> Audio
            </button>
            <button className={`fg-btn${src === "video" ? " fg-btn--primary" : ""}`} style={{ flex: 1 }} onClick={() => onSelect(idx, "video")}>
              <Video size={13} /> Video
            </button>
          </div>
        </section>

        <section>
          <div className="fg-insp__section-label">Downstream</div>
          <div className="fg-insp__downstream">
            <GitBranch size={13} style={{ color: "var(--text-dim)", flexShrink: 0, marginTop: 1 }} />
            <span>{downstream}</span>
          </div>
        </section>

        <section>
          <div className="fg-insp__section-label">Imported tracks</div>
          {imported
            ? <div className="fg-insp__downstream" style={{ borderColor: "var(--mode-chaotic)" }}>
                <FileDown size={13} style={{ color: "var(--mode-chaotic)" }} />
                <span style={{ fontFamily: "var(--font-mono)" }}>{imported.name}.funscript · {imported.actions.length.toLocaleString()} actions</span>
              </div>
            : <button className="fg-btn" style={{ width: "100%" }} onClick={onImport}><FileDown size={13} /> Import a .funscript…</button>}
        </section>

        <section>
          <div className="fg-insp__section-label">Jump to chapter</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {chapters.map((cc, i) => (
              <button key={cc.id} className="fg-btn fg-btn--ghost" style={{ justifyContent: "flex-start", gap: 8 }} onClick={() => onFocus(i)}>
                <span style={{ width: 4, height: 16, borderRadius: 2, background: cc.color }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cc.name}</span>
                <span style={{ color: SOURCES[sources[i] ?? "audio"].color }}><SourceIcon id={sources[i] ?? "audio"} size={11} /></span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

// ── Main component ───────────────────────────────────────────
export default function SourcesTab(props: SourcesTabProps) {
  const {
    chapters, durationMs, candidates, conf, sources, suggested,
    videoAnalyzed, analyzing, analyzeProgress, imported,
    focusedIdx, onFocus, onSelect, onUseSuggested, onSetAll, onAnalyzeVideo, onImport,
  } = props;
  const mix = sourceMix(sources);
  const mixText = [
    mix.audio && `${mix.audio} audio`,
    mix.video && `${mix.video} video`,
    mix.imported && `${mix.imported} imported`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="fg-sources">
      <div className="fg-sources__main">
        <div className="fg-sources__inner">
          {(!videoAnalyzed || analyzing) && (
            <AcquireBanner analyzing={analyzing} progress={analyzeProgress} onAnalyze={onAnalyzeVideo} />
          )}

          <div className="fg-seclabel">
            <span>Source mix · whole track</span>
            <span className="fg-seclabel__hint">dashed marks = blended seams</span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Ribbon chapters={chapters} durationMs={durationMs} sources={sources} />
          </div>

          <div className="fg-bulk">
            <span className="fg-bulk__label">Set all</span>
            <button className="fg-btn" onClick={onUseSuggested}><WandSparkles size={13} /> Use suggested</button>
            <button className="fg-btn fg-btn--ghost" onClick={() => onSetAll("audio")}><AudioLines size={13} /> All audio</button>
            <button className="fg-btn fg-btn--ghost" onClick={() => onSetAll("video")} disabled={!videoAnalyzed}><Video size={13} /> All video</button>
            <span className="fg-bulk__divider" />
            <button className="fg-btn fg-btn--ghost" onClick={onImport}><FileDown size={13} /> {imported ? "Replace import…" : "Import a .funscript…"}</button>
            <span className="fg-bulk__mix">{mixText}</span>
          </div>

          <div className="fg-seclabel">
            <span>Per-chapter comparison</span>
            <span className="fg-seclabel__hint">click a panel to choose its source</span>
          </div>
          {chapters.map((c, i) => (
            <CompareCard
              key={c.id}
              chapter={c}
              idx={i}
              candidates={candidates}
              conf={conf[i]}
              source={sources[i] ?? "audio"}
              suggested={suggested[i]}
              imported={imported}
              focused={i === focusedIdx}
              onSelect={onSelect}
              onFocus={onFocus}
            />
          ))}
        </div>
      </div>

      <Inspector
        chapters={chapters}
        idx={focusedIdx}
        sources={sources}
        conf={conf[focusedIdx]}
        suggested={suggested[focusedIdx]}
        imported={imported}
        onFocus={onFocus}
        onSelect={onSelect}
        onImport={onImport}
      />
    </div>
  );
}
