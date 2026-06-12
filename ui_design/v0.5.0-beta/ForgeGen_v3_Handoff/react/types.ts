// types.ts — shared types for the Sources feature (ForgeGen v3)

export type SourceId = "audio" | "video" | "imported";

export interface Action {
  at: number;   // ms
  pos: number;  // 0..100
}

export interface Chapter {
  id: string;
  idx: number;
  name: string;
  contentType: "intro" | "build" | "action" | "edge" | "climax" | "outro" | string;
  at_ms: number;
  end_ms: number;
  duration_ms: number;
  color: string; // CSS color (e.g. "var(--ch-1)")
}

/** Per-chapter confidence + one-line rationale for each source. */
export interface SourceConf {
  audio: number;     // 0..1
  video: number;     // 0..1
  audioWhy: string;
  videoWhy: string;
}

export interface ImportedTrack {
  name: string;      // without ".funscript"
  actions: Action[];
}

export interface Candidates {
  audio: Action[];
  video: Action[] | null;     // null until the video pass runs
  imported: Action[] | null;  // null until a file is imported
}

export interface Seam {
  at_ms: number;
  from: SourceId;
  to: SourceId;
}

export interface SourceMeta {
  id: SourceId;
  label: string;
  short: string;
  /** lucide-react icon name, resolved by the component. */
  icon: "audio-lines" | "video" | "file-down";
  /** CSS color token. */
  color: string;
  desc: string;
}
