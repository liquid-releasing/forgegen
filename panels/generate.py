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

_ENERGY_CHART_MAX_BARS = 800
_PHRASE_VLINE_MAX = 120
_ENERGY_PNG_THRESHOLD = 1500  # beats above which we skip Plotly entirely


def _energy_chart_png(beat_map, modes, *, width_px: int = 1400, height_px: int = 160) -> bytes:
    """Static-PNG energy chart for long tracks (FunscriptForge pattern).

    Plotly's Bar trace falls over on >1,000 data points in Streamlit:
    each rerun re-serialises the whole figure to JSON and the browser
    re-paints the SVG node tree. On a 26K-beat / 2-hour track that
    pushes paint time into the tens of seconds and freezes the page
    while you click strip thumbnails.

    Matplotlib drawing the same data to a PNG sidesteps both costs —
    same visual result, paints in 100-200ms, doesn't choke Streamlit.
    Same trade-off FunscriptForge made when its Plotly charts brought
    the page to its knees on long curves.
    """
    import io
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    def _mode_for(t):
        for start, end, mode in modes:
            if start <= t < end:
                return mode
        return "steady"

    n = len(beat_map.beats)
    bins = min(_ENERGY_CHART_MAX_BARS, n)
    chunk = max(1, (n + bins - 1) // bins)

    xs, ys, cs = [], [], []
    for i in range(0, n, chunk):
        seg_b = beat_map.beats[i:i + chunk]
        seg_e = beat_map.energy[i:i + chunk]
        if not seg_b:
            continue
        mid_ms = seg_b[len(seg_b) // 2]
        xs.append(mid_ms / 1000)
        ys.append(max(seg_e))
        cs.append(_MODE_COLOURS.get(_mode_for(mid_ms), "#26a69a"))

    fig, ax = plt.subplots(
        figsize=(width_px / 100, height_px / 100), dpi=100
    )
    fig.patch.set_facecolor("#0e1117")
    ax.set_facecolor("#1a1d23")

    if xs:
        # Bar widths roughly match the per-bin time span so bars fill
        # the axis without gaps on long tracks.
        bar_w = (xs[-1] - xs[0]) / max(1, len(xs)) if len(xs) > 1 else 0.5
        ax.bar(xs, ys, width=bar_w, color=cs, linewidth=0)

        # Phrase boundary tick marks — capped to avoid visual noise.
        phrases = beat_map.phrases
        if len(phrases) > _PHRASE_VLINE_MAX:
            step = (len(phrases) + _PHRASE_VLINE_MAX - 1) // _PHRASE_VLINE_MAX
            phrases = phrases[::step]
        for start_ms, _end_ms in phrases:
            ax.axvline(
                start_ms / 1000,
                color="#ffffff",
                alpha=0.18,
                linewidth=0.6,
                linestyle=":",
            )

    ax.set_xlim(left=0, right=(beat_map.duration_ms / 1000) or 1)
    ax.set_ylim(0, 1.0)
    ax.set_ylabel("energy", color="#cccccc", fontsize=8)
    ax.tick_params(colors="#cccccc", labelsize=7)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color("#2a2d33")
    ax.spines["left"].set_color("#2a2d33")

    # Format x-axis as M:SS for readability
    def _fmt(x, _pos):
        m, s = divmod(int(x), 60)
        return f"{m}:{s:02d}"
    ax.xaxis.set_major_formatter(plt.FuncFormatter(_fmt))

    buf = io.BytesIO()
    fig.savefig(
        buf, format="png",
        bbox_inches="tight", pad_inches=0.1,
        facecolor=fig.get_facecolor(),
    )
    plt.close(fig)
    return buf.getvalue()


def _energy_chart(beat_map, modes):
    """Bar chart of beat energy, coloured by phrase mode (Plotly).

    Used for short/medium tracks where Plotly's interactivity (hover
    tooltips, etc.) is worth the paint cost. Long tracks should call
    :func:`_energy_chart_png` instead — same visual, ~10× faster paint.
    """
    import plotly.graph_objects as go

    def _mode_for(t):
        for start, end, mode in modes:
            if start <= t < end:
                return mode
        return "steady"

    n = len(beat_map.beats)
    if n <= _ENERGY_CHART_MAX_BARS:
        x_vals = [b / 1000 for b in beat_map.beats]
        y_vals = list(beat_map.energy)
        colours = [
            _MODE_COLOURS.get(_mode_for(b), "#26a69a") for b in beat_map.beats
        ]
    else:
        bins = _ENERGY_CHART_MAX_BARS
        chunk = (n + bins - 1) // bins
        x_vals, y_vals, colours = [], [], []
        for i in range(0, n, chunk):
            seg_b = beat_map.beats[i:i + chunk]
            seg_e = beat_map.energy[i:i + chunk]
            if not seg_b:
                continue
            mid_ms = seg_b[len(seg_b) // 2]
            x_vals.append(mid_ms / 1000)
            y_vals.append(max(seg_e))
            colours.append(_MODE_COLOURS.get(_mode_for(mid_ms), "#26a69a"))

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=x_vals,
        y=y_vals,
        marker_color=colours,
        hovertemplate="<b>%{x:.2f}s</b><br>energy: %{y:.3f}<extra></extra>",
    ))

    phrases = beat_map.phrases
    if len(phrases) > _PHRASE_VLINE_MAX:
        step = (len(phrases) + _PHRASE_VLINE_MAX - 1) // _PHRASE_VLINE_MAX
        phrases = phrases[::step]
    for start_ms, _end_ms in phrases:
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


def _draw_window_box(
    png_bytes: bytes,
    *,
    win_start_ms: int,
    win_dur_ms: int,
    total_ms: int,
    plot_left_px: int = 50,
    plot_right_px: int = 18,
    plot_top_px: int = 6,
    plot_bottom_px: int = 22,
    outline_rgba: tuple = (255, 230, 90, 255),
    line_width: int = 3,
) -> bytes:
    """Overlay a bright outlined box on a static funscript chart PNG.

    Highlights the [win_start_ms, win_start_ms + win_dur_ms] region on
    the chart (which spans [0, total_ms]) so you can see at a glance
    where the comparison strips are previewing.

    Plot-area margins are estimated from FunscriptForge's static chart
    layout (matplotlib bbox_inches="tight" + pad_inches=0.1 + a "pos"
    y-label and time x-label). Tweak ``plot_left_px`` / ``plot_right_px``
    if alignment drifts after a chart-style change.
    """
    if total_ms <= 0:
        return png_bytes
    from io import BytesIO

    from PIL import Image, ImageDraw

    img = Image.open(BytesIO(png_bytes)).convert("RGBA")
    w, h = img.size
    plot_w = max(1, w - plot_left_px - plot_right_px)

    x_start = plot_left_px + int(win_start_ms / total_ms * plot_w)
    x_end = plot_left_px + int(
        min(total_ms, win_start_ms + win_dur_ms) / total_ms * plot_w
    )
    # Make sure the box has at least a few pixels of width on huge tracks.
    if x_end - x_start < 4:
        x_end = x_start + 4
    y_top = plot_top_px
    y_bot = h - plot_bottom_px

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle(
        [x_start, y_top, x_end, y_bot],
        outline=outline_rgba,
        width=line_width,
    )
    img = Image.alpha_composite(img, overlay)

    out = BytesIO()
    img.convert("RGB").save(out, format="PNG")
    return out.getvalue()


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
    # Knob handlers — invoked by the comparison-strip widget when a
    # thumbnail is clicked. Encode the source-change re-analysis logic
    # that used to live inline in the style-card handler.
    # -----------------------------------------------------------------------

    def _on_select_style(new_style: str) -> None:
        preset = _STYLES[new_style]
        source_changed = preset["source"] != st.session_state.source
        st.session_state.style = new_style
        st.session_state.low = preset["low"]
        st.session_state.high = preset["high"]
        st.session_state.source = preset["source"]
        st.session_state.curve = None
        st.session_state.funscript_bytes = None
        if source_changed and st.session_state.last_analysed_path:
            # Different audio source → re-detect beats with the new source.
            # Without this, a style switch would only shift the range, not
            # the actual beat grid.
            _path = st.session_state.last_analysed_path
            _name = (
                st.session_state.audio_name
                or _path.split("/")[-1].split("\\")[-1]
            )
            st.session_state.beat_map = None
            st.session_state.modes = None
            st.session_state.analysis_pending = (_path, _name, False)
            st.session_state.analysis_log = []
            st.session_state.last_error = None
        else:
            _generate_and_export()

    def _on_select_density(new_density: int) -> None:
        st.session_state.stroke_density = new_density
        _generate_and_export()

    _TONE_KEYS = {"flat", "rise", "fall", "auto"}

    def _on_select_tone(new_tone: str) -> None:
        if new_tone in _TONE_KEYS:
            st.session_state.tone = new_tone
            _generate_and_export()

    # -----------------------------------------------------------------------
    # Comparison strips — three rows of four thumbnails each (Style /
    # Density / Tone). Single ◀▶ scroll controller drives all 12 thumbs.
    # Each thumbnail varies one knob; the other two stay at their current
    # session_state value. Click a thumbnail → that knob updates.
    # -----------------------------------------------------------------------

    from panels import _comparison_strips
    _comparison_strips.render(
        bm,
        on_select_style=_on_select_style,
        on_select_density=_on_select_density,
        on_select_tone=_on_select_tone,
    )

    # Show active style description as before
    active = _STYLES[st.session_state.style]
    st.caption(active["desc"])

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

        # FF velocity-coloured position curve (same colormap as FF).
        # The comparison-strip window (set by ◀▶ + zoom) is drawn as a
        # bright box outline so you can see at a glance where the strips
        # above are previewing.
        # The energy chart is intentionally NOT rendered here — it
        # already lives in the analysis section above the tabs (per
        # user's note 2026-04-27: "energy isn't being generated, so
        # we don't need it again").
        _curve = st.session_state.curve
        _positions = [p for _, p in _curve]
        _times_s = [t / 1000 for t, _ in _curve]
        _vels: list[float] = []
        for _i in range(1, len(_curve)):
            _dt = _times_s[_i] - _times_s[_i - 1]
            if _dt > 0:
                _vels.append(abs(_positions[_i] - _positions[_i - 1]) / _dt)
        _vels_sorted = sorted(_vels)
        _p90 = (
            _vels_sorted[int(len(_vels_sorted) * 0.9) - 1]
            if _vels_sorted else 0.0
        )
        _max_v = max(_vels_sorted) if _vels_sorted else 0.0
        _mean_v = sum(_vels) / len(_vels) if _vels else 0.0
        _mean_p = sum(_positions) / len(_positions) if _positions else 0.0

        _mins = bm.duration_ms // 60_000
        _secs = (bm.duration_ms % 60_000) / 1000

        from forge_ui_components.funscript_chart.static import (
            render_vibrant_static,
        )
        _actions = [
            {"at": int(t), "pos": int(p)}
            for t, p in st.session_state.curve
        ]
        _win_start = int(
            st.session_state.get("preview_window_start_ms", 0)
        )
        _win_dur = int(
            st.session_state.get("preview_window_dur_ms", 4000)
        )
        _png = render_vibrant_static(
            _actions,
            height_px=240,
            width_px=1400,
            show_labels=False,
        )
        _png_with_box = _draw_window_box(
            _png,
            win_start_ms=_win_start,
            win_dur_ms=_win_dur,
            total_ms=bm.duration_ms,
        )
        st.image(_png_with_box, use_container_width=True)

        # ── Stats row underneath the chart (FF format) ────────────────
        # Same numbers FunscriptForge shows: Duration · Actions · Beats ·
        # Mean pos · Range · Avg vel · p90 vel · Peak vel. Use the gold-
        # standard reference (RoD: avg vel 664) to read the gap.
        _stat_cols = st.columns(8)
        _stat_cols[0].metric(
            "Duration",
            f"{int(_mins)}:{_secs:04.1f}",
            help="Track length in M:SS",
        )
        _stat_cols[1].metric("Actions", f"{len(_curve):,}")
        _stat_cols[2].metric("Beats", f"{len(bm.beats):,}")
        _stat_cols[3].metric("Mean pos", f"{_mean_p:.1f}")
        _stat_cols[4].metric(
            "Range",
            f"{min(_positions)} → {max(_positions)}"
            if _positions else "—",
        )
        _stat_cols[5].metric("Avg vel", f"{_mean_v:.0f}")
        _stat_cols[6].metric("p90 vel", f"{_p90:.0f}")
        _stat_cols[7].metric("Peak vel", f"{_max_v:.0f}")

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
