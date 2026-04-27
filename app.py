"""forgegen — Streamlit UI entry point.

Launch directly:
    streamlit run app.py
Or via the desktop launcher (preferred — gives a native window + file picker):
    python forgegen.py

Layout
------
Sidebar (left)
  • ForgeGen hero brand
  • Media file metrics (BPM / beats / phrases / duration) — only after Analyse
  • Output folder
  • 🐞 Debug — session state + event log
  • ℹ️ About / Setup — Liquid Releasing branding, copyright, license

Main pane (right)
  • Project — Browse / paste path / Analyse (always at top, mirrors the
    project-creation flow used in FunscriptForge)
  • Workflow — status block during analysis, then Generate / Details tabs
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import streamlit as st

from panels import generate as generate_panel
from panels import details as details_panel

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="forgegen",
    page_icon="🔨",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# Session state defaults
# ---------------------------------------------------------------------------

_DEFAULTS = dict(
    beat_map=None,
    curve=None,
    modes=None,
    funscript_bytes=None,
    audio_name="",
    style="rhythmic",
    low=10,
    high=90,
    center=50,               # midpoint of stroke (0-100). Centered model.
    stroke_density=2,        # actions per beat. 1=sensual (half), 2=PD-style (full),
                             # 4=dense (sub-beat), 8=saturated. Aliases "half"/"full"
                             # accepted for backward compat.
    tone="auto",             # tone = whole-shape gestalt: flat | rise | fall | auto.
                             # auto = per-phrase center swing derived from
                             # each phrase's energy slope — the smart default
                             # that adapts to whatever audio is loaded.
                             # User can override to flat / rise / fall.
    source="percussive",
    output_dir=str(Path.home() / "Downloads"),
    saved_path=None,
    last_analysed_path="",
    analysis_pending=None,   # (media_path, name, keep_tmp) tuple while analysis runs
    analysis_log=[],         # list of (HH:MM:SS, message) tuples
    last_error=None,
)


def _12h(dt) -> str:
    """Format a datetime as e.g. '2:05:15 PM' (12-hour, no leading zero)."""
    h12 = dt.hour % 12 or 12
    ampm = "PM" if dt.hour >= 12 else "AM"
    return f"{h12}:{dt.minute:02d}:{dt.second:02d} {ampm}"


def _log(msg: str) -> None:
    import datetime
    ts = _12h(datetime.datetime.now())
    st.session_state.analysis_log.append((ts, msg))


# ── Desktop bridge (native file dialog) ───────────────────────────────────
def _is_desktop() -> bool:
    """True iff we're running inside the PyWebView launcher (forgegen.py)."""
    return os.environ.get("FORGEGEN_DESKTOP") == "1"


def _bridge_port() -> str | None:
    return os.environ.get("FORGEGEN_BRIDGE_PORT")


def _pick_file_native(initial: str = "") -> str | None:
    """Open a native OS file-picker via the launcher's HTTP bridge.

    Returns the selected path (str) or None if cancelled / unavailable.
    The launcher publishes the bridge port in FORGEGEN_BRIDGE_PORT.
    """
    port = _bridge_port()
    if not port:
        return None
    import urllib.parse
    import urllib.request
    params: dict[str, str | list[str]] = {}
    if initial:
        params["initial"] = initial
    # pywebview's parse_file_type uses a strict regex:
    #   ^([\w ]+)\((\*\.\w+;)*\*\.\w+\)$
    # so the description is word-chars + spaces only (no `/`, no punctuation),
    # extensions are `*.ext` separated by semicolons, and `*.*` is invalid.
    params["filter"] = [
        "Media files (*.mp3;*.wav;*.flac;*.ogg;*.m4a;*.aac;*.mp4;*.mkv;*.mov)",
        "Audio (*.mp3;*.wav;*.flac;*.ogg;*.m4a;*.aac)",
        "Video (*.mp4;*.mkv;*.mov)",
    ]
    qs = urllib.parse.urlencode(params, doseq=True)
    url = f"http://127.0.0.1:{port}/pick-file?{qs}"
    try:
        with urllib.request.urlopen(url, timeout=300) as resp:
            if resp.status == 200:
                return resp.read().decode("utf-8")
    except Exception:
        return None
    return None


for _k, _v in _DEFAULTS.items():
    if _k not in st.session_state:
        st.session_state[_k] = _v


def _reset_analysis():
    st.session_state.beat_map = None
    st.session_state.curve = None
    st.session_state.modes = None
    st.session_state.funscript_bytes = None
    st.session_state.saved_path = None


# ---------------------------------------------------------------------------
# Sidebar — branding, media-file metrics (after analysis), output, debug, setup
# ---------------------------------------------------------------------------

with st.sidebar:
    _logo = Path(_ROOT) / "media" / "forgegen_hero.png"
    if _logo.exists():
        st.image(str(_logo), width="stretch")
    else:
        st.title("🔨 forgegen")
    st.caption("audio → funscript")

    # --- Media file metrics (only after analysis) ---
    bm = st.session_state.beat_map
    if bm is not None:
        st.divider()
        st.markdown("**Media file**")
        if st.session_state.audio_name:
            st.caption(f"📄 {st.session_state.audio_name}")
        col1, col2 = st.columns(2)
        col1.metric("BPM", f"{bm.bpm:.1f}")
        col2.metric("Beats", len(bm.beats))
        col3, col4 = st.columns(2)
        col3.metric("Phrases", len(bm.phrases))
        mins = bm.duration_ms // 60_000
        secs = (bm.duration_ms % 60_000) / 1000
        col4.metric("Duration", f"{mins}:{secs:04.1f}")
        st.caption(f"Source: {st.session_state.source}")

    # --- Output folder ---
    st.divider()
    st.markdown("**Output folder**")
    new_dir = st.text_input(
        "Save funscripts to",
        value=st.session_state.output_dir,
        label_visibility="collapsed",
        help="Funscripts are saved here when you click Save.",
    )
    if new_dir != st.session_state.output_dir:
        st.session_state.output_dir = new_dir
        st.session_state.saved_path = None

    # --- Debug ---
    st.divider()
    with st.expander("🐞 Debug", expanded=False):
        st.markdown("**Session state**")
        st.json({
            "audio_name": st.session_state.audio_name,
            "beat_map_loaded": st.session_state.beat_map is not None,
            "analysis_pending": st.session_state.analysis_pending,
            "source": st.session_state.source,
            "last_analysed_path": st.session_state.last_analysed_path,
            "last_error": st.session_state.last_error,
        })
        st.markdown("**Event log**")
        if st.session_state.analysis_log:
            for ts, msg in reversed(st.session_state.analysis_log[-20:]):
                st.text(f"{ts}  {msg}")
        else:
            st.caption("No events yet — click Analyse.")
        if st.button("Clear log", key="clear_log_btn"):
            st.session_state.analysis_log = []
            st.session_state.last_error = None
            st.rerun()

    # --- Setup (LR branding + copyright + license) ---
    st.divider()
    with st.expander("ℹ️ About / Setup", expanded=False):
        try:
            from forgegen_core.about import APP_NAME, VERSION, TAGLINE
        except ImportError:
            APP_NAME, VERSION, TAGLINE = "ForgeGen", "0.0.1", "audio → funscript"
        _lr_logo = Path(_ROOT) / "media" / "liquid-releasing-logo.svg"
        if _lr_logo.exists():
            st.image(str(_lr_logo), width=140)
        st.markdown(f"**{APP_NAME}** v{VERSION}")
        st.caption(TAGLINE)
        st.markdown("---")
        st.markdown(
            "Built by [Liquid Releasing](https://github.com/liquid-releasing).  \n"
            "© 2026 Liquid Releasing.  \n"
            "Licensed under the [MIT License]"
            "(https://github.com/liquid-releasing/forgegen/blob/main/LICENSE)."
        )
        st.markdown("---")
        st.caption(
            "Engine: [videoflow](https://github.com/liquid-releasing/videoflow) "
            "(librosa + plotly).  \n"
            "Scaffolded with [forgekit](https://github.com/xolvco/forgekit)."
        )

# ---------------------------------------------------------------------------
# Main area — Project upload (top) → analysis status → tabs (after analysis)
# ---------------------------------------------------------------------------

# --- Project upload ---
import tempfile as _tempfile
desktop = _is_desktop()
uploaded = None

st.markdown("## Project")
st.caption("🔒 Files are read locally. Nothing is uploaded or sent anywhere.")

col_pick, col_path = st.columns([1, 3])

with col_pick:
    if desktop:
        if st.button("📂 Browse…", width="stretch"):
            picked = _pick_file_native(
                initial=st.session_state.get("file_path_input", "")
            )
            if picked:
                st.session_state.file_path_input = picked
                _log(f"Picked: {picked}")
                st.rerun()
    else:
        uploaded = st.file_uploader(
            "Drop an audio or video file",
            type=["mp3", "wav", "flac", "ogg", "m4a", "aac", "mp4", "mkv", "mov"],
            label_visibility="collapsed",
            help="For desktop mode use Browse — handles any file size.",
        )

with col_path:
    if "file_path_input" not in st.session_state:
        st.session_state.file_path_input = st.session_state.last_analysed_path
    st.text_input(
        "File path",
        key="file_path_input",
        label_visibility="collapsed",
        placeholder="C:/path/to/track.mp3  or  video.mp4",
    )

# Resolve source: uploader takes priority; path input as fallback
_upload_pending = (
    uploaded is not None
    and uploaded.name != st.session_state.audio_name
)
_path_str = st.session_state.file_path_input.strip().strip('"')
file_path = Path(_path_str) if _path_str else None
_path_pending = (
    file_path is not None
    and file_path.is_file()
    and str(file_path) != st.session_state.last_analysed_path
    and uploaded is None
)

analyse_clicked = st.button("Analyse", type="primary")

# Click handler — register the analysis intent and rerun. The status block
# renders below in the same main pane so the spinner is where the eye is.
if _upload_pending and analyse_clicked:
    suffix = Path(uploaded.name).suffix or ".mp3"
    with _tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(uploaded.read())
        tmp_path = tmp.name
    _reset_analysis()
    st.session_state.analysis_log = []
    st.session_state.last_error = None
    st.session_state.analysis_pending = (tmp_path, uploaded.name, True)
    _log(f"Click Analyse — uploaded file {uploaded.name} ({uploaded.size/1024/1024:.0f} MB)")
    st.rerun()
elif _path_pending and analyse_clicked:
    _reset_analysis()
    st.session_state.analysis_log = []
    st.session_state.last_error = None
    st.session_state.analysis_pending = (str(file_path), file_path.name, False)
    size_mb = file_path.stat().st_size / 1024 / 1024
    _log(f"Click Analyse — path {file_path} ({size_mb:.0f} MB)")
    st.rerun()
elif analyse_clicked and uploaded is None and not _path_str:
    st.error("Drop a file or enter a file path first.")
elif analyse_clicked and file_path is not None and not file_path.is_file():
    st.error("File not found. Check the path and try again.")

st.divider()

# --- Workflow: status (during analysis) → tabs (after) → onboarding (before) ---
if st.session_state.analysis_pending is not None:
    media_path, name, keep_tmp = st.session_state.analysis_pending
    file_size_mb = (
        os.path.getsize(media_path) / 1024 / 1024
        if os.path.isfile(media_path) else 0
    )
    import datetime as _dt
    import time as _time
    _start_t = _time.time()
    _start_hms = _12h(_dt.datetime.now())
    with st.status(
        f"Analysing **{name}** ({file_size_mb:.0f} MB)",
        expanded=True,
    ) as status:
        status.write(f"🕒 Started at {_start_hms}")
        _stage_holder = status.empty()
        _stage_holder.write(
            "📂 Preparing… (large video files take several minutes)"
        )
        _log(f"Starting analyze_beats(source={st.session_state.source})")

        def _on_stage(label: str) -> None:
            # videoflow calls this at the start of each pipeline stage.
            # We update a single placeholder line so the user sees what's
            # happening live (instead of one opaque "Loading…" message
            # for the full 8-minute pipeline). Elapsed seconds shown so
            # the user knows the process is alive.
            _e = _time.time() - _start_t
            _stage_holder.write(f"⚙️ {label}  (elapsed {_e:.0f}s)")
            _log(label)

        try:
            from videoflow.audio import BeatError, analyze_beats
            beat_map = analyze_beats(
                media_path,
                source=st.session_state.source,
                progress_callback=_on_stage,
            )
            elapsed = _time.time() - _start_t
            st.session_state.beat_map = beat_map
            st.session_state.audio_name = name
            st.session_state.last_analysed_path = media_path if not keep_tmp else ""
            status.write(f"✅ Done in {elapsed:.1f}s")
            _log(
                f"✅ Done in {elapsed:.1f}s — {beat_map.bpm:.1f} BPM, "
                f"{len(beat_map.beats)} beats, {len(beat_map.phrases)} phrases"
            )
            status.update(
                label=(
                    f"Done in {elapsed:.0f}s — {beat_map.bpm:.1f} BPM, "
                    f"{len(beat_map.beats)} beats"
                ),
                state="complete",
                expanded=False,
            )
        except BeatError as exc:
            elapsed = _time.time() - _start_t
            cause = exc.__cause__ or exc.__context__
            lines = [str(exc)]
            if cause:
                lines.append(f"Type: {type(cause).__name__}")
                lines.append(f"Repr: {repr(cause)}")
            err_text = "\n\n".join(lines)
            st.session_state.last_error = err_text
            _log(f"❌ BeatError after {elapsed:.1f}s: {exc}")
            status.update(label=f"Failed after {elapsed:.0f}s: {exc}", state="error")
            st.error(err_text)
        except Exception as exc:
            elapsed = _time.time() - _start_t
            import traceback
            tb = traceback.format_exc()
            st.session_state.last_error = f"{exc}\n\n{tb}"
            _log(f"❌ {type(exc).__name__} after {elapsed:.1f}s: {exc}")
            status.update(label=f"Failed after {elapsed:.0f}s: {exc}", state="error")
            st.error(f"Error: {exc}\n\n```\n{tb}\n```")
        finally:
            st.session_state.analysis_pending = None
            if keep_tmp:
                try:
                    os.unlink(media_path)
                except OSError:
                    pass
    # Rerun on success so the tabs appear without needing another interaction.
    # On error the status block stays visible with the error state; user fixes
    # their input + clicks Analyse again.
    if st.session_state.beat_map is not None and st.session_state.last_error is None:
        st.rerun()
elif st.session_state.beat_map is None:
    st.markdown(
        "Pick a media file above and click **Analyse**. "
        "forgegen will detect the beat grid, analyse phrase energy, and "
        "generate a `.funscript` matched to the music."
    )
    st.caption(
        "Supports: MP3, WAV, FLAC, OGG, M4A, AAC — and MP4/MKV/MOV "
        "(audio is extracted automatically)."
    )
else:
    # --- Analysis summary panel — what we found ---
    bm = st.session_state.beat_map
    if st.session_state.modes is None:
        from videoflow.generate import classify_modes
        st.session_state.modes = classify_modes(bm)

    st.markdown("### Analysis")
    st.caption(
        f"📄 **{st.session_state.audio_name}** — "
        f"{bm.bpm:.1f} BPM · {len(bm.beats)} beats · "
        f"{len(bm.phrases)} phrases · "
        f"{bm.duration_ms/1000:.1f}s"
    )

    # Stacked analysis preview — beat energy on top, funscript intensity
    # heatmap directly underneath so the two pictures are read together.
    # The user's note 2026-04-27: "the first about minute the music is
    # softer" — that softness is visible on BOTH charts at the same x
    # position, so stacking them lets the eye link "low audio energy"
    # to "calm haptic intensity" at a glance.
    from panels.generate import (
        _energy_chart,
        _energy_chart_png,
        _ENERGY_PNG_THRESHOLD,
        _MODE_COLOURS,
    )
    st.caption("Beat energy — coloured by phrase mode")
    if len(bm.beats) > _ENERGY_PNG_THRESHOLD:
        # Long track — render as static PNG so Streamlit can paint
        # without re-serialising a 26K-bar Plotly figure on every rerun.
        st.image(
            _energy_chart_png(bm, st.session_state.modes),
            use_container_width=True,
        )
    else:
        st.plotly_chart(
            _energy_chart(bm, st.session_state.modes),
            width="stretch",
            config={"displayModeBar": False},
        )

    # Funscript intensity strip — only after Generate has produced one.
    # Rendered directly under the energy chart so the two are visually
    # linked (energy = audio drive, intensity = haptic response).
    if st.session_state.funscript_bytes:
        try:
            import json as _json
            import io as _io
            from forgegen_core.heatmap import render_heatmap as _render_heatmap
            _fs = _json.loads(st.session_state.funscript_bytes)
            _actions = _fs.get("actions", [])
            if _actions:
                _dur = int(max(int(a["at"]) for a in _actions))
                _img = _render_heatmap(_actions, _dur, width=2000, height=60)
                _buf = _io.BytesIO()
                _img.save(_buf, format="PNG")
                st.caption(
                    "Funscript intensity — blue (calm) → red (hot), "
                    "OpenFunscripter / XBVR colour convention"
                )
                st.image(_buf.getvalue(), width="stretch")
        except Exception as _exc:
            st.caption(f"Heatmap render failed: {_exc}")

    # Phrase legend (mode colour swatches — same palette as the energy
    # chart and the phrase-table row tinting).
    _active_modes = sorted({_m for _, _, _m in st.session_state.modes})
    if _active_modes:
        _legend_cols = st.columns(len(_active_modes))
        for _col, _mode in zip(_legend_cols, _active_modes):
            _colour = _MODE_COLOURS.get(_mode, "#aaa")
            _col.markdown(
                f"<span style='color:{_colour}'>■</span> {_mode}",
                unsafe_allow_html=True,
            )

    from panels.phrase_table import render_phrase_table
    render_phrase_table(bm, st.session_state.modes, _MODE_COLOURS)

    st.divider()

    # --- Generate / Details tabs ---
    tab_gen, tab_details = st.tabs(["Generate", "Details"])

    with tab_gen:
        generate_panel.render()

    with tab_details:
        details_panel.render()
