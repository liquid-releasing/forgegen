"""forgegen — Streamlit UI entry point.

Launch with:
    streamlit run app.py

Layout
------
Sidebar
  • Local file path input (primary — no upload limit)
  • Track info once loaded (BPM, duration, phrases)
  • Output folder setting

Main area (tabs)
  1. Generate  — style cards → Generate → funscript preview → save / download
  2. Details   — beat map, per-phrase mode overrides, advanced controls

Note: file upload is intentionally omitted. Files are read directly from disk.
A cloud-upload path will be added in a future web deployment.
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
    source="percussive",
    output_dir=str(Path.home() / "Downloads"),
    saved_path=None,
    last_analysed_path="",
)
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
# Sidebar
# ---------------------------------------------------------------------------

with st.sidebar:
    st.title("🔨 forgegen")
    st.caption("audio → funscript")

    st.divider()

    # --- File input ---
    st.markdown("**Media file**")
    st.caption("🔒 Files are read locally. Nothing is uploaded or sent anywhere.")

    uploaded = st.file_uploader(
        "Drop an audio or video file",
        type=["mp3", "wav", "flac", "ogg", "m4a", "aac", "mp4", "mkv", "mov"],
        help="Drag and drop or click to browse. For files over 2 GB use the path input below.",
    )

    st.caption("or paste a local file path (no size limit)")
    file_path_input = st.text_input(
        "File path",
        value=st.session_state.last_analysed_path,
        label_visibility="collapsed",
        placeholder="C:/path/to/track.mp3  or  video.mp4",
    )

    # Resolve source: uploader takes priority; path input as fallback
    import tempfile as _tempfile

    _upload_pending = (
        uploaded is not None
        and uploaded.name != st.session_state.audio_name
    )
    _path_str = file_path_input.strip().strip('"')
    file_path = Path(_path_str) if _path_str else None
    _path_pending = (
        file_path is not None
        and file_path.is_file()
        and str(file_path) != st.session_state.last_analysed_path
        and uploaded is None
    )

    analyse_clicked = st.button("Analyse", use_container_width=True, type="primary")

    def _run_analysis(media_path: str, name: str, keep_tmp: bool = False):
        _reset_analysis()
        st.session_state.audio_name = name
        st.session_state.last_analysed_path = media_path if not keep_tmp else ""
        with st.spinner("Analysing beats…"):
            try:
                from videoflow.audio import BeatError, analyze_beats
                st.session_state.beat_map = analyze_beats(
                    media_path,
                    source=st.session_state.source,
                )
            except BeatError as exc:
                cause = exc.__cause__ or exc.__context__
                lines = [str(exc)]
                if cause:
                    lines.append(f"Type: {type(cause).__name__}")
                    lines.append(f"Repr: {repr(cause)}")
                st.error("\n\n".join(lines))
            except Exception as exc:
                import traceback
                st.error(f"Error: {exc}\n\n```\n{traceback.format_exc()}\n```")

    if _upload_pending and analyse_clicked:
        suffix = Path(uploaded.name).suffix or ".mp3"
        with _tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(uploaded.read())
            tmp_path = tmp.name
        try:
            _run_analysis(tmp_path, uploaded.name, keep_tmp=True)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
    elif _path_pending and analyse_clicked:
        _run_analysis(str(file_path), file_path.name)
    elif analyse_clicked and uploaded is None and file_path is None:
        st.error("Drop a file or enter a file path first.")
    elif analyse_clicked and file_path is not None and not file_path.is_file():
        st.error("File not found. Check the path and try again.")

    # --- Track info ---
    bm = st.session_state.beat_map
    if bm is not None:
        st.divider()
        st.metric("BPM", f"{bm.bpm:.1f}")
        col1, col2 = st.columns(2)
        col1.metric("Beats", len(bm.beats))
        col2.metric("Phrases", len(bm.phrases))
        mins = bm.duration_ms // 60_000
        secs = (bm.duration_ms % 60_000) / 1000
        st.metric("Duration", f"{mins}:{secs:04.1f}")
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

# ---------------------------------------------------------------------------
# Main area — tabs
# ---------------------------------------------------------------------------

if st.session_state.beat_map is None:
    st.markdown("## Enter a file path and click Analyse")
    st.markdown(
        "Paste the full path to an audio or video file in the sidebar, then click **Analyse**. "
        "forgegen will detect the beat grid, analyse phrase energy, and generate a "
        "`.funscript` matched to the music."
    )
    st.markdown(
        "**Supports:** MP3, WAV, FLAC, OGG, M4A, AAC — and MP4/MKV/MOV "
        "(audio is extracted automatically)."
    )
else:
    tab_gen, tab_details = st.tabs(["Generate", "Details"])

    with tab_gen:
        generate_panel.render()

    with tab_details:
        details_panel.render()
