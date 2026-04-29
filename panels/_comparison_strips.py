"""Comparison-strip widget for the Generate panel.

Shows three rows of four thumbnails — Style, Stroke density, Tone — so
the user can SEE what each knob does at a glance, holding the other two
knobs at their current setting. Click a thumbnail to swap that knob.

A single ◀ ▶ scroll controller drives all 12 thumbnails so they always
show the same musical content (same time window) — only the chosen knob
varies. Default window starts on the loudest beat; persists in
``session_state.preview_window_start_ms``.

Thumbnails reuse :func:`videoflow.generate.beats_to_curve` for curve
generation and FunscriptForge's
:func:`forge_ui_components.funscript_chart.static.render_vibrant_static`
for rendering — no plotly involved (per the FF performance lesson).
PNGs are cached per (style, density, tone, low, high, source,
window_start, beat_map_id).

The thumbnail-render function is named so it can be lifted to videoflow
in v0.0.5 when chapter intent makes per-chapter comparison strips a
real concern.
"""

from __future__ import annotations

import base64
import hashlib

import streamlit as st

from videoflow.audio import AudioBeatMap
from videoflow.generate import beats_to_curve, compute_auto_tone

import subprocess
import sys
from pathlib import Path

_VIDEO_SUFFIXES = {".mp4", ".mkv", ".mov", ".avi", ".webm", ".m4v"}
_NO_WINDOW = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

THUMB_WIDTH_PX = 280
THUMB_HEIGHT_PX = 80
DEFAULT_WINDOW_MS = 4000  # 4 seconds = ~8 beats at 120 BPM (tightest zoom)

# Zoom-out ladder. Each level shows progressively more of the track in
# the strip thumbnails. Picked to roughly double per step so the user
# can step from "single phrase" to "section" to "full track" without
# overshooting.
ZOOM_LEVELS_MS: tuple[int, ...] = (
    4_000,    # 4 s   — single phrase / ~8 beats
    16_000,   # 16 s  — multi-phrase
    60_000,   # 1 min — short chapter
    180_000,  # 3 min — chapter / sub-section
    600_000,  # 10 min — long chapter on a feature
)

_TONE_TRAJECTORIES: dict[str, tuple[int, int] | None] = {
    "flat": None,
    "rise": (30, 70),
    "fall": (70, 30),
}


# ---------------------------------------------------------------------------
# Thumbnail rendering — pure function, cached
# ---------------------------------------------------------------------------

@st.cache_data(show_spinner=False, max_entries=128)
def _render_thumbnail_bytes(
    beat_map_key: str,
    beats_tuple: tuple,
    energy_tuple: tuple,
    phrases_tuple: tuple,
    duration_ms: int,
    bpm: float,
    *,
    low: int,
    high: int,
    center: int | None,
    tone: str,
    stroke_density,
    energy_normalize: bool,
    window_start_ms: int,
    window_dur_ms: int,
) -> bytes:
    """Render one thumbnail PNG.

    All inputs are hashable so Streamlit can cache by tuple. *beat_map_key*
    is a stable id of the beat-map content so cache invalidates on track
    change without re-hashing the whole beats list.
    """
    from forge_ui_components.funscript_chart.static import render_vibrant_static

    bm = AudioBeatMap(
        bpm=bpm,
        beats=list(beats_tuple),
        downbeats=list(beats_tuple)[::4],
        phrases=[(s, e) for s, e in phrases_tuple],
        energy=list(energy_tuple),
        duration_ms=duration_ms,
    )

    traj = _TONE_TRAJECTORIES.get(tone)
    auto_tone = compute_auto_tone(bm) if tone == "auto" else None

    curve = beats_to_curve(
        bm,
        low=low, high=high, center=center,
        center_trajectory=traj,
        tone_per_phrase=auto_tone,
        energy_normalize=energy_normalize,
        stroke_density=stroke_density,
    )

    window_end = window_start_ms + window_dur_ms
    actions = [
        {"at": int(t), "pos": int(pos)}
        for t, pos in curve
        if window_start_ms <= t <= window_end
    ]

    if not actions:
        # No beats fell in the window — render a blank tile so layout
        # stays stable. Avoids matplotlib edge cases on empty input.
        from io import BytesIO

        from PIL import Image, ImageDraw

        img = Image.new("RGB", (THUMB_WIDTH_PX, THUMB_HEIGHT_PX), (30, 30, 30))
        draw = ImageDraw.Draw(img)
        draw.text((6, THUMB_HEIGHT_PX // 2 - 6), "no beats", fill=(160, 160, 160))
        buf = BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    return render_vibrant_static(
        actions,
        height_px=THUMB_HEIGHT_PX,
        width_px=THUMB_WIDTH_PX,
        show_labels=False,
    )


def _beat_map_key(bm: AudioBeatMap) -> str:
    """Stable short id for a beat map (used as a cache-segregation key)."""
    h = hashlib.sha1()
    h.update(str(bm.duration_ms).encode())
    h.update(str(round(bm.bpm, 3)).encode())
    h.update(str(len(bm.beats)).encode())
    if bm.beats:
        h.update(str(bm.beats[0]).encode())
        h.update(str(bm.beats[-1]).encode())
    return h.hexdigest()[:12]


def _loudest_beat_ms(bm: AudioBeatMap) -> int:
    if not bm.energy or not bm.beats:
        return 0
    idx = max(range(len(bm.energy)), key=lambda i: bm.energy[i])
    return int(bm.beats[idx])


@st.cache_data(show_spinner=False, max_entries=64)
def _extract_video_frame(video_path: str, time_ms: int) -> bytes | None:
    """Extract one frame from *video_path* at *time_ms* via ffmpeg.

    Returns PNG bytes, or ``None`` when the file is not a video, when
    ffmpeg is unavailable, or when extraction fails. Cached per
    ``(video_path, time_ms)`` so scrolling through windows is fast
    after the first pass.
    """
    p = Path(video_path)
    if p.suffix.lower() not in _VIDEO_SUFFIXES or not p.exists():
        return None
    seek_s = max(0, time_ms) / 1000.0
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-ss", f"{seek_s:.3f}",
                "-i", str(p),
                "-frames:v", "1",
                "-vf", "scale=320:-1",
                "-f", "image2pipe",
                "-c:v", "png",
                "-",
            ],
            check=True,
            capture_output=True,
            timeout=10,
            creationflags=_NO_WINDOW,
        )
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None
    return result.stdout or None


# ---------------------------------------------------------------------------
# Style preset access — re-imported from generate.py to avoid circulars
# ---------------------------------------------------------------------------

def _styles() -> dict[str, dict]:
    from panels.generate import _STYLES
    return _STYLES


# ---------------------------------------------------------------------------
# Strip rendering
# ---------------------------------------------------------------------------

def _normalise_density(value) -> int:
    """Map any accepted density form to its int (matches videoflow internals)."""
    aliases = {"half": 1, "1": 1, 1: 1,
               "full": 2, "2": 2, 2: 2,
               "4": 4, 4: 4,
               "8": 8, 8: 8}
    return aliases.get(value, 2)


def _thumb_kwargs(
    bm: AudioBeatMap,
    *,
    style: str,
    density,
    tone: str,
    energy_normalize: bool,
    center: int | None,
    window_start_ms: int,
    window_dur_ms: int,
) -> dict:
    """Resolve a style preset + knobs to a thumbnail kwargs dict."""
    preset = _styles()[style]
    return dict(
        beat_map_key=st.session_state.get("_beat_map_key", "")
        or _beat_map_key(bm),
        beats_tuple=tuple(bm.beats),
        energy_tuple=tuple(round(e, 6) for e in bm.energy),
        phrases_tuple=tuple(bm.phrases),
        duration_ms=bm.duration_ms,
        bpm=round(bm.bpm, 3),
        low=preset["low"],
        high=preset["high"],
        center=center,
        tone=tone,
        stroke_density=density,
        energy_normalize=energy_normalize,
        window_start_ms=window_start_ms,
        window_dur_ms=window_dur_ms,
    )


def _fmt_window_dur(ms: int) -> str:
    """Render a window-duration ms as 'NNs' or 'NNm' for the zoom label."""
    if ms < 60_000:
        return f"{ms // 1000} s"
    if ms < 3_600_000:
        return f"{ms // 60_000} min"
    return f"{ms // 3_600_000} h"


def _png_data_uri(png_bytes: bytes) -> str:
    return "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")


def _render_strip(
    bm: AudioBeatMap,
    *,
    title: str,
    options: list[tuple[str, str]],   # [(value, label), ...]
    selected_value,
    on_select,                         # callable(new_value) -> None
    thumb_kwargs_for,                  # callable(option_value) -> kwargs
    key_prefix: str,
) -> None:
    """Render one comparison strip — title row + four thumbnails + click select."""
    st.markdown(f"**{title}**")
    cols = st.columns(len(options))
    for col, (value, label) in zip(cols, options):
        is_selected = (value == selected_value)
        png = _render_thumbnail_bytes(**thumb_kwargs_for(value))

        # Render the thumbnail as an HTML img inside a styled div so we
        # can show selection state without a button frame around the
        # image. The button below the image carries the click semantics.
        border = "2px solid #ff7043" if is_selected else "1px solid #333"
        col.markdown(
            f"""
            <div style='border:{border}; border-radius:6px; padding:2px;
                        background:rgba(255,255,255,0.02);'>
                <img src='{_png_data_uri(png)}'
                     style='display:block; width:100%; height:auto;
                            border-radius:4px;' />
            </div>
            """,
            unsafe_allow_html=True,
        )
        if col.button(
            label,
            key=f"{key_prefix}_{value}",
            width="stretch",
            type="primary" if is_selected else "secondary",
        ):
            if value != selected_value:
                on_select(value)
                st.rerun()


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def render(
    bm: AudioBeatMap,
    *,
    on_select_style,
    on_select_density,
    on_select_tone,
) -> None:
    """Render the three comparison strips above the main preview.

    Each strip is purely visual — when the user clicks a thumbnail, the
    matching ``on_select_*`` callback is invoked and the host panel
    decides what to do (update session state, re-analyse, regenerate, …).
    The widget never mutates audio-source-coupled state itself.

    Args:
        bm: The current beat map.
        on_select_style: ``f(new_style: str) -> None``
        on_select_density: ``f(new_density: int) -> None`` (1, 2, 4, 8)
        on_select_tone: ``f(new_tone: str) -> None``
    """
    if bm is None or not bm.beats:
        return

    # Initialise / migrate window state when the beat map identity changes.
    bm_key = _beat_map_key(bm)
    if st.session_state.get("_beat_map_key") != bm_key:
        st.session_state._beat_map_key = bm_key
        st.session_state.preview_window_dur_ms = DEFAULT_WINDOW_MS
        st.session_state.preview_window_start_ms = max(
            0, _loudest_beat_ms(bm) - DEFAULT_WINDOW_MS // 4
        )

    win_dur = int(
        st.session_state.get("preview_window_dur_ms", DEFAULT_WINDOW_MS)
    )
    # Clamp window to track length (zoom-out shouldn't exceed track)
    win_dur = min(win_dur, max(1000, bm.duration_ms))
    scroll_step = max(1000, win_dur)  # scroll one window-width per click

    win_start = int(st.session_state.preview_window_start_ms)
    win_start = max(0, min(win_start, max(0, bm.duration_ms - win_dur)))
    win_end = win_start + win_dur

    st.markdown("**Compare options** (click any thumbnail to switch)")

    # ── zoom controls ───────────────────────────────────────────────────
    zoom_l, zoom_lbl, zoom_r = st.columns([1, 6, 1])
    cur_zoom_idx = (
        ZOOM_LEVELS_MS.index(win_dur)
        if win_dur in ZOOM_LEVELS_MS
        else min(
            range(len(ZOOM_LEVELS_MS)),
            key=lambda i: abs(ZOOM_LEVELS_MS[i] - win_dur),
        )
    )
    if zoom_l.button(
        "🔍−", key="cmp_zoom_in",
        help="Zoom in (smaller window — more detail per thumbnail)",
        disabled=cur_zoom_idx == 0,
    ):
        st.session_state.preview_window_dur_ms = ZOOM_LEVELS_MS[
            max(0, cur_zoom_idx - 1)
        ]
        st.rerun()
    zoom_lbl.markdown(
        f"<div style='text-align:center; padding-top:6px; color:#bbb;'>"
        f"zoom: <b>{_fmt_window_dur(win_dur)}</b> per thumbnail"
        f"</div>",
        unsafe_allow_html=True,
    )
    if zoom_r.button(
        "🔍+", key="cmp_zoom_out",
        help="Zoom out (larger window — see more of the track at once)",
        disabled=cur_zoom_idx == len(ZOOM_LEVELS_MS) - 1,
    ):
        st.session_state.preview_window_dur_ms = ZOOM_LEVELS_MS[
            min(len(ZOOM_LEVELS_MS) - 1, cur_zoom_idx + 1)
        ]
        st.rerun()

    # ── window scroll controls ──────────────────────────────────────────
    nav_l, nav_label, nav_r = st.columns([1, 6, 1])
    if nav_l.button("◀", key="cmp_scroll_back", help="Earlier in the track"):
        st.session_state.preview_window_start_ms = max(
            0, win_start - scroll_step
        )
        st.rerun()
    def _fmt_time(_ms: int) -> str:
        _total_s = max(0, _ms) / 1000.0
        if _total_s < 3600:
            _m = int(_total_s // 60)
            _s = _total_s - _m * 60
            return f"{_m}:{_s:04.1f}"
        _h = int(_total_s // 3600)
        _rem = _total_s - _h * 3600
        _m = int(_rem // 60)
        _s = _rem - _m * 60
        return f"{_h}:{_m:02d}:{_s:04.1f}"

    nav_label.markdown(
        f"<div style='text-align:center; padding-top:6px; color:#bbb;'>"
        f"window: {_fmt_time(win_start)} — {_fmt_time(win_end)} "
        f"of {_fmt_time(bm.duration_ms)}</div>",
        unsafe_allow_html=True,
    )
    if nav_r.button("▶", key="cmp_scroll_fwd", help="Later in the track"):
        max_start = max(0, bm.duration_ms - win_dur)
        st.session_state.preview_window_start_ms = min(
            max_start, win_start + scroll_step
        )
        st.rerun()

    # ── video frame at window start (helps you see WHAT in the video the
    #    strips are previewing). Only rendered when the analysed source
    #    is a video file; audio-only sources skip silently. ────────────
    src_path = st.session_state.get("last_analysed_path")
    if src_path:
        frame_png = _extract_video_frame(str(src_path), win_start)
        if frame_png:
            frame_uri = _png_data_uri(frame_png)
            st.markdown(
                f"""
                <div style='text-align:center; margin: 4px 0 12px 0;'>
                    <img src='{frame_uri}'
                         style='max-height:140px; border-radius:6px;
                                border:1px solid #333;' />
                    <div style='color:#888; font-size:0.85em; margin-top:2px;'>
                        frame at {win_start/1000:.2f}s
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    # Snapshot current selection (held constant when varying the OTHER knob)
    cur_style = st.session_state.style
    cur_density_norm = _normalise_density(st.session_state.stroke_density)
    cur_tone = st.session_state.tone
    cur_center = st.session_state.center

    common = dict(
        center=cur_center,
        energy_normalize=True,  # matches existing _generate_and_export
        window_start_ms=win_start,
        window_dur_ms=win_dur,
    )

    # ── Style strip ─────────────────────────────────────────────────────
    style_options = [
        (key, preset["label"]) for key, preset in _styles().items()
    ]
    _render_strip(
        bm,
        title="Style",
        options=style_options,
        selected_value=cur_style,
        on_select=on_select_style,
        thumb_kwargs_for=lambda v: _thumb_kwargs(
            bm, style=v, density=cur_density_norm, tone=cur_tone, **common
        ),
        key_prefix="cmp_style",
    )

    # ── Density strip ───────────────────────────────────────────────────
    density_options = [
        (1, "1 — sensual"),
        (2, "2 — canonical"),
        (4, "4 — dense"),
        (8, "8 — saturated"),
    ]
    _render_strip(
        bm,
        title="Stroke density",
        options=density_options,
        selected_value=cur_density_norm,
        on_select=on_select_density,
        thumb_kwargs_for=lambda v: _thumb_kwargs(
            bm, style=cur_style, density=v, tone=cur_tone, **common
        ),
        key_prefix="cmp_density",
    )

    # ── Tone strip ──────────────────────────────────────────────────────
    tone_options = [
        ("flat", "Flat"),
        ("rise", "Rise"),
        ("fall", "Fall"),
        ("auto", "Auto"),
    ]
    _render_strip(
        bm,
        title="Tone",
        options=tone_options,
        selected_value=cur_tone,
        on_select=on_select_tone,
        thumb_kwargs_for=lambda v: _thumb_kwargs(
            bm, style=cur_style, density=cur_density_norm, tone=v, **common
        ),
        key_prefix="cmp_tone",
    )
