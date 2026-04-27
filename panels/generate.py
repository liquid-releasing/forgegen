"""Tab 1 — Generate.

Style cards → Generate → funscript curve preview → download.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import streamlit as st

# ---------------------------------------------------------------------------
# Style presets
# ---------------------------------------------------------------------------

_STYLES: dict[str, dict] = {
    "rhythmic": {
        "label": "🥁 Rhythmic",
        "desc": "Locks tightly to the beat. Best for EDM and high-energy music.",
        "low": 10,
        "high": 90,
        "source": "percussive",
    },
    "sensual": {
        "label": "🌊 Sensual",
        "desc": "Softer strokes, wider trough. Suits slower or more melodic tracks.",
        "low": 20,
        "high": 75,
        "source": "full",
    },
    "intense": {
        "label": "⚡ Intense",
        "desc": "Maximum range. Every beat drives the full stroke.",
        "low": 5,
        "high": 95,
        "source": "percussive",
    },
    "chaotic": {
        "label": "🌪 Chaotic",
        "desc": "Full mix drives the curve — voice and energy create unpredictable peaks.",
        "low": 10,
        "high": 90,
        "source": "full",
    },
}

# Mode colours for the chart
_MODE_COLOURS: dict[str, str] = {
    "break":  "#424242",
    "tease":  "#7e57c2",
    "slow":   "#42a5f5",
    "steady": "#26a69a",
    "fast":   "#ef5350",
    "edging": "#ff7043",
}


# ---------------------------------------------------------------------------
# Chart helpers
# ---------------------------------------------------------------------------

def _energy_chart(beat_map, modes):
    """Bar chart of beat energy, coloured by phrase mode."""
    import plotly.graph_objects as go

    # Build a colour per beat based on its phrase mode
    def _mode_for(t):
        for start, end, mode in modes:
            if start <= t < end:
                return mode
        return "steady"

    colours = [_MODE_COLOURS.get(_mode_for(b), "#26a69a") for b in beat_map.beats]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=[b / 1000 for b in beat_map.beats],
        y=beat_map.energy,
        marker_color=colours,
        hovertemplate="<b>%{x:.2f}s</b><br>energy: %{y:.3f}<extra></extra>",
    ))

    # Phrase boundary lines
    for start_ms, end_ms in beat_map.phrases:
        fig.add_vline(
            x=start_ms / 1000,
            line_width=1,
            line_dash="dot",
            line_color="rgba(255,255,255,0.25)",
        )

    fig.update_layout(
        height=160,
        margin=dict(l=0, r=0, t=4, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        showlegend=False,
        xaxis=dict(
            title="time (s)",
            color="#aaa",
            gridcolor="rgba(255,255,255,0.06)",
        ),
        yaxis=dict(
            title="energy",
            range=[0, 1],
            color="#aaa",
            gridcolor="rgba(255,255,255,0.06)",
        ),
    )
    return fig


def _funscript_chart(curve):
    """Position curve + velocity heatmap strip, stacked."""
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots

    if not curve:
        return go.Figure()

    times = [t / 1000 for t, _ in curve]
    positions = [p for _, p in curve]

    # --- velocity per action (units: positions / second) ---
    velocities = [0.0]
    for i in range(1, len(curve)):
        dt = (curve[i][0] - curve[i - 1][0]) / 1000  # seconds
        dp = abs(curve[i][1] - curve[i - 1][1])
        velocities.append(dp / dt if dt > 0 else 0.0)

    # Bucket the velocity into N time bins for the heatmap strip
    n_bins = min(500, len(curve))
    duration = times[-1] if times else 1
    bin_width = duration / n_bins
    bucket_vel = [0.0] * n_bins
    for t, v in zip(times, velocities):
        idx = min(int(t / bin_width), n_bins - 1)
        bucket_vel[idx] = max(bucket_vel[idx], v)

    # Colour scale: 0 pos/s = blue, 150 = teal, 300 = green, 500 = yellow, 700+ = red
    fig = make_subplots(
        rows=2, cols=1,
        row_heights=[0.18, 0.82],
        vertical_spacing=0.04,
    )

    # Heatmap strip (row 1)
    bin_centers = [(i + 0.5) * bin_width for i in range(n_bins)]
    fig.add_trace(
        go.Bar(
            x=bin_centers,
            y=[1] * n_bins,
            marker=dict(
                color=bucket_vel,
                colorscale=[
                    [0.0,  "#1565c0"],   # blue   — stopped
                    [0.15, "#00897b"],   # teal   — slow
                    [0.35, "#43a047"],   # green  — moderate
                    [0.60, "#f9a825"],   # yellow — fast
                    [1.0,  "#e53935"],   # red    — very fast
                ],
                cmin=0,
                cmax=700,
                showscale=False,
            ),
            width=bin_width,
            hovertemplate="<b>%{x:.2f}s</b><br>peak vel: %{marker.color:.0f} pos/s<extra></extra>",
        ),
        row=1, col=1,
    )

    # Position curve (row 2)
    fig.add_trace(
        go.Scatter(
            x=times,
            y=positions,
            mode="lines",
            line=dict(color="#ff7043", width=1.5),
            hovertemplate="<b>%{x:.2f}s</b><br>pos: %{y}<extra></extra>",
        ),
        row=2, col=1,
    )

    fig.update_layout(
        height=260,
        margin=dict(l=0, r=0, t=4, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        showlegend=False,
        bargap=0,
    )
    fig.update_xaxes(
        color="#aaa",
        gridcolor="rgba(255,255,255,0.06)",
        showticklabels=False,
        row=1, col=1,
    )
    fig.update_yaxes(
        showticklabels=False,
        showgrid=False,
        row=1, col=1,
    )
    fig.update_xaxes(
        title="time (s)",
        color="#aaa",
        gridcolor="rgba(255,255,255,0.06)",
        row=2, col=1,
    )
    fig.update_yaxes(
        title="position",
        range=[0, 100],
        color="#aaa",
        gridcolor="rgba(255,255,255,0.06)",
        row=2, col=1,
    )
    return fig


# ---------------------------------------------------------------------------
# Panel
# ---------------------------------------------------------------------------

def render() -> None:
    bm = st.session_state.beat_map
    if bm is None:
        return

    from videoflow.generate import beats_to_curve, classify_modes, shape_curve, export_funscript

    # Compute modes once (used for chart colouring even before generate)
    if st.session_state.modes is None:
        st.session_state.modes = classify_modes(bm)
    modes = st.session_state.modes

    _TONE_TRAJECTORIES = {
        "flat": None,           # constant center
        "rise": (30, 70),       # bottom-heavy \u2192 top-heavy
        "fall": (70, 30),       # top-heavy \u2192 bottom-heavy
    }

    def _generate_and_export() -> None:
        """Build the funscript curve from current session_state and stash bytes.

        Reused by the Generate button, style-card clicks (when source didn't
        change), the density toggle, and the tone selector \u2014 so a single
        click switches and regenerates without forcing a separate Generate.
        """
        traj = _TONE_TRAJECTORIES.get(st.session_state.tone)
        curve = beats_to_curve(
            bm,
            low=st.session_state.low,
            high=st.session_state.high,
            center=st.session_state.center,
            center_trajectory=traj,
            energy_normalize=True,
            stroke_density=st.session_state.stroke_density,
        )
        shaped = shape_curve(
            curve,
            modes,
            low=st.session_state.low,
            center=st.session_state.center,
            center_trajectory=traj,
        )
        st.session_state.curve = shaped

        with tempfile.NamedTemporaryFile(suffix=".funscript", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        try:
            title = Path(st.session_state.audio_name).stem
            export_funscript(shaped, tmp_path, title=title)
            st.session_state.funscript_bytes = tmp_path.read_bytes()
        finally:
            tmp_path.unlink(missing_ok=True)

    # Energy chart + phrase-mode legend already render in app.py's Analysis
    # panel above the tabs \u2014 don't render them here too, identical
    # plotly_chart params would collide on Streamlit's auto-generated ID.

    # -----------------------------------------------------------------------
    # Style cards
    # -----------------------------------------------------------------------

    st.markdown("**Style**")
    style_cols = st.columns(len(_STYLES))
    for col, (key, preset) in zip(style_cols, _STYLES.items()):
        selected = st.session_state.style == key
        border = "2px solid #ff7043" if selected else "1px solid #444"
        bg = "rgba(255,112,67,0.08)" if selected else "rgba(255,255,255,0.03)"
        if col.button(
            preset["label"],
            key=f"style_{key}",
            width="stretch",
            help=preset["desc"],
            type="primary" if selected else "secondary",
        ):
            _source_changed = preset["source"] != st.session_state.source
            st.session_state.style = key
            st.session_state.low = preset["low"]
            st.session_state.high = preset["high"]
            st.session_state.source = preset["source"]
            st.session_state.curve = None
            st.session_state.funscript_bytes = None
            # If the new style uses a different audio source (percussive vs
            # full mix), the existing beat_map was computed with the old
            # source — so re-detect beats. Without this, a style switch
            # would only affect curve range, not actual beat detection.
            if _source_changed and st.session_state.last_analysed_path:
                _path = st.session_state.last_analysed_path
                _name = st.session_state.audio_name or _path.split("/")[-1].split("\\")[-1]
                st.session_state.beat_map = None
                st.session_state.modes = None
                st.session_state.analysis_pending = (_path, _name, False)
                st.session_state.analysis_log = []
                st.session_state.last_error = None
            else:
                # Same source — beat_map still valid. Auto-regenerate so the
                # new range/density takes effect without a separate Generate
                # click. Was the workflow gap that made all four style outputs
                # appear identical: clicking style without re-clicking Generate.
                _generate_and_export()
            st.rerun()

    # Show active style description
    active = _STYLES[st.session_state.style]
    st.caption(active["desc"])

    # -----------------------------------------------------------------------
    # Stroke density toggle — half = sensual / longer cycle, full = PD-style
    # -----------------------------------------------------------------------

    st.markdown("**Stroke density**")
    st.caption(
        "Full = one full stroke per beat (canonical, matches PythonDancer / "
        "your hand-crafted curves). Half = preview of what FunscriptForge's "
        "halve transform would produce — quicker A/B without round-tripping."
    )
    _density_idx = 1 if st.session_state.stroke_density == "half" else 0
    _density_choice = st.radio(
        "stroke density",
        options=["Full — one stroke per beat",
                 "Half — preview FunscriptForge halve transform"],
        index=_density_idx,
        label_visibility="collapsed",
        horizontal=True,
        key="density_radio",
    )
    _new_density = "half" if _density_choice.startswith("Half") else "full"
    if _new_density != st.session_state.stroke_density:
        st.session_state.stroke_density = _new_density
        _generate_and_export()
        st.rerun()

    # -----------------------------------------------------------------------
    # Tone — whole-shape gestalt (drives the curve's macro arc)
    # -----------------------------------------------------------------------

    st.markdown("**Tone**")
    st.caption(
        "Style sets the local knobs (range, density, source). Tone shapes "
        "the *whole* arc — where the curve sits across the full track. "
        "Flat = constant 50. Rise = builds upward over time (30→70). "
        "Fall = relaxes downward (70→30)."
    )
    _tone_options = ["Flat — constant center",
                     "Rise — center drifts up over track",
                     "Fall — center drifts down over track"]
    _tone_keys = ["flat", "rise", "fall"]
    _tone_idx = _tone_keys.index(st.session_state.tone) if st.session_state.tone in _tone_keys else 0
    _tone_choice = st.radio(
        "tone",
        options=_tone_options,
        index=_tone_idx,
        label_visibility="collapsed",
        horizontal=True,
        key="tone_radio",
    )
    _new_tone = _tone_keys[_tone_options.index(_tone_choice)]
    if _new_tone != st.session_state.tone:
        st.session_state.tone = _new_tone
        _generate_and_export()
        st.rerun()

    st.divider()

    # -----------------------------------------------------------------------
    # Generate button
    # -----------------------------------------------------------------------

    if st.button("▶ Generate", type="primary", width="stretch"):
        with st.spinner("Generating funscript…"):
            _generate_and_export()

    # -----------------------------------------------------------------------
    # Funscript preview + download
    # -----------------------------------------------------------------------

    if st.session_state.curve:
        st.caption("Generated funscript")
        st.plotly_chart(
            _funscript_chart(st.session_state.curve),
            width="stretch",
        )

        action_count = len(st.session_state.curve)
        st.caption(f"{action_count} actions · {bm.duration_ms / 1000:.1f}s")

        if st.session_state.funscript_bytes:
            stem = Path(st.session_state.audio_name).stem or "output"
            filename = f"{stem}.funscript"

            col_save, col_dl = st.columns(2)

            # Save to disk
            if col_save.button("💾 Save to folder", width="stretch", type="primary"):
                out_dir = Path(st.session_state.output_dir)
                try:
                    out_dir.mkdir(parents=True, exist_ok=True)
                    out_path = out_dir / filename
                    out_path.write_bytes(st.session_state.funscript_bytes)
                    st.session_state.saved_path = str(out_path)
                except Exception as exc:
                    st.error(f"Save failed: {exc}")

            # Browser download
            col_dl.download_button(
                label="⬇ Download",
                data=st.session_state.funscript_bytes,
                file_name=filename,
                mime="application/json",
                width="stretch",
            )

            # Show saved path
            if st.session_state.saved_path:
                st.success(f"Saved → `{st.session_state.saved_path}`")
