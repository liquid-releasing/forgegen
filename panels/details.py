"""Tab 2 — Details.

Beat map table, per-phrase mode overrides, advanced controls, regenerate.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import streamlit as st

_MODE_OPTIONS = ["break", "tease", "slow", "steady", "fast", "edging"]

_MODE_COLOURS: dict[str, str] = {
    "break":  "#424242",
    "tease":  "#7e57c2",
    "slow":   "#42a5f5",
    "steady": "#26a69a",
    "fast":   "#ef5350",
    "edging": "#ff7043",
}


def render() -> None:
    bm = st.session_state.beat_map
    if bm is None:
        return

    from videoflow.generate import beats_to_curve, classify_modes, shape_curve, export_funscript

    if st.session_state.modes is None:
        st.session_state.modes = classify_modes(bm)

    # -----------------------------------------------------------------------
    # Advanced controls
    # -----------------------------------------------------------------------

    st.markdown("**Controls**")
    col1, col2, col3 = st.columns(3)

    new_low = col1.slider("Low (trough)", 0, 40, st.session_state.low, key="det_low")
    new_high = col2.slider("High (peak)", 60, 100, st.session_state.high, key="det_high")
    new_source = col3.selectbox(
        "Beat source",
        ["percussive", "full"],
        index=0 if st.session_state.source == "percussive" else 1,
        key="det_source",
        help="percussive: strips voice/melody before tracking. full: raw mix.",
    )

    if (
        new_low != st.session_state.low
        or new_high != st.session_state.high
        or new_source != st.session_state.source
    ):
        st.session_state.low = new_low
        st.session_state.high = new_high
        st.session_state.source = new_source
        st.session_state.curve = None
        st.session_state.funscript_bytes = None

    st.divider()

    # -----------------------------------------------------------------------
    # Per-phrase mode overrides
    # -----------------------------------------------------------------------

    st.markdown("**Phrase modes**")
    st.caption("Override the auto-detected mode for any phrase.")

    updated_modes = []
    for i, (start_ms, end_ms, mode) in enumerate(st.session_state.modes):
        cols = st.columns([2, 2, 3])
        cols[0].markdown(
            f"<span style='color:#aaa'>{start_ms/1000:.1f}s → {end_ms/1000:.1f}s</span>",
            unsafe_allow_html=True,
        )
        colour = _MODE_COLOURS.get(mode, "#aaa")
        cols[1].markdown(
            f"<span style='color:{colour}'>\u25a0 {mode}</span>",
            unsafe_allow_html=True,
        )
        new_mode = cols[2].selectbox(
            "override",
            ["(auto)"] + _MODE_OPTIONS,
            index=0,
            key=f"mode_override_{i}",
            label_visibility="collapsed",
        )
        final_mode = mode if new_mode == "(auto)" else new_mode
        updated_modes.append((start_ms, end_ms, final_mode))

    st.divider()

    # -----------------------------------------------------------------------
    # Regenerate
    # -----------------------------------------------------------------------

    if st.button("↺ Regenerate", type="primary", use_container_width=True):
        with st.spinner("Regenerating…"):
            st.session_state.modes = updated_modes
            curve = beats_to_curve(bm, low=st.session_state.low, high=st.session_state.high)
            shaped = shape_curve(curve, updated_modes, low=st.session_state.low)
            st.session_state.curve = shaped

            with tempfile.NamedTemporaryFile(suffix=".funscript", delete=False) as tmp:
                tmp_path = Path(tmp.name)
            try:
                title = Path(st.session_state.audio_name).stem
                export_funscript(shaped, tmp_path, title=title)
                st.session_state.funscript_bytes = tmp_path.read_bytes()
            finally:
                tmp_path.unlink(missing_ok=True)

        st.success("Done — switch to Generate tab to preview and download.")

    st.divider()

    # -----------------------------------------------------------------------
    # Beat map table
    # -----------------------------------------------------------------------

    with st.expander("Beat map", expanded=False):
        import pandas as pd

        def _mode_for(t):
            for start, end, mode in st.session_state.modes:
                if start <= t < end:
                    return mode
            return "steady"

        rows = [
            {
                "beat": i + 1,
                "time (s)": round(b / 1000, 3),
                "energy": round(e, 3),
                "mode": _mode_for(b),
            }
            for i, (b, e) in enumerate(zip(bm.beats, bm.energy))
        ]
        st.dataframe(pd.DataFrame(rows), use_container_width=True, height=300)
