"""Shared phrase / chapter table renderer.

Used by the analysis section above the tabs (showing the audio's
phrase-mode partitioning) and by the Generate panel below the colored
funscript chart (showing the same partitioning so the user can correlate
phrase numbers with curve regions). Both surfaces want identical
formatting — same M:SS times, same mode-colour tinting — so a single
helper keeps them in lock-step.

The table splits into two side-by-side columns when there are enough
phrases to warrant it (default threshold = 8). On long-form tracks
this halves the vertical scroll cost.
"""

from __future__ import annotations

import streamlit as st


def _fmt_time(ms: int) -> str:
    """Format milliseconds as M:SS.f (or H:MM:SS.f for >= 1h).

    Avoids the bare ``211.3s`` form that's easy to misread as hours.
    """
    total_s = max(0, ms) / 1000.0
    if total_s < 3600:
        m = int(total_s // 60)
        s = total_s - m * 60
        return f"{m}:{s:04.1f}"
    h = int(total_s // 3600)
    rem = total_s - h * 3600
    m = int(rem // 60)
    s = rem - m * 60
    return f"{h}:{m:02d}:{s:04.1f}"


def _build_rows(bm, modes) -> list[dict]:
    rows: list[dict] = []
    for i, (s_ms, e_ms, mode) in enumerate(modes):
        beats_in_phrase = [
            (b, e) for b, e in zip(bm.beats, bm.energy)
            if s_ms <= b < e_ms
        ]
        avg_e = (
            sum(e for _, e in beats_in_phrase) / len(beats_in_phrase)
            if beats_in_phrase else 0.0
        )
        rows.append({
            "#": i + 1,
            "Start": _fmt_time(s_ms),
            "End": _fmt_time(e_ms),
            "Duration": _fmt_time(e_ms - s_ms),
            "Beats": len(beats_in_phrase),
            "Avg energy": round(avg_e, 3),
            "Mode": mode,
        })
    return rows


_PHRASE_TABLE_MAX_ROWS = 60   # cap rows to keep page paint snappy
_TABLE_VIEWPORT_MAX_PX = 600  # never let the dataframe widget exceed this


def render_phrase_table(
    bm,
    modes,
    mode_colours: dict[str, str],
    *,
    split_threshold: int = 8,
    key_prefix: str = "",
) -> None:
    """Render a mode-coloured phrase table for *modes* covering *bm*.

    Args:
        bm: AudioBeatMap whose ``beats``/``energy``/``phrases`` we read.
        modes: List of ``(start_ms, end_ms, mode_str)`` from
            ``classify_modes``.
        mode_colours: Mapping mode-name → CSS hex colour. Each row gets
            a tinted background of its mode colour for at-a-glance
            scanning that matches the energy-chart legend above.
        split_threshold: When the phrase count exceeds this number, the
            table splits into two side-by-side columns to halve the
            vertical scroll cost. Set to a very large value to force a
            single-column layout.
        key_prefix: Optional prefix for Streamlit element keys when this
            helper is rendered more than once on a page.
    """
    import pandas as pd

    rows = _build_rows(bm, modes)
    if not rows:
        return

    def _row_colour(row):
        hex6 = mode_colours.get(row["Mode"], "#888888").lstrip("#")
        return [f"background-color: #{hex6}33; color: #eee"] * len(row)

    # Streamlit's default st.dataframe height clips at ~10 rows. Force a
    # height that fits every row so the user sees the whole table without
    # an inner scroll bar that hides the middle (rows 11-21 when split).
    _row_h = 35  # measured st.dataframe row height in dark theme
    _header_h = 38

    # Long-track guard: cap visible rows so a 2-hour track at 16-beat
    # phrases (1,652 phrases) doesn't paint a 60K-pixel-tall scroll
    # column. Honest tradeoff: the user only sees the first
    # _PHRASE_TABLE_MAX_ROWS phrases, with a caption explaining the
    # truncation. v0.0.5 chapters resolve this — chapters are 8-30
    # rows max even on a 4-hour film.
    total_rows = len(rows)
    truncated = total_rows > _PHRASE_TABLE_MAX_ROWS
    if truncated:
        rows = rows[:_PHRASE_TABLE_MAX_ROWS]

    def _render_one(df, key_suffix=""):
        h = min(
            _TABLE_VIEWPORT_MAX_PX,
            _header_h + _row_h * len(df),
        )
        st.dataframe(
            df.style.apply(_row_colour, axis=1),
            width="stretch",
            hide_index=True,
            height=h,
            key=(
                f"{key_prefix}phrase_table{key_suffix}"
                if key_prefix else None
            ),
        )

    if len(rows) <= split_threshold:
        _render_one(pd.DataFrame(rows))
    else:
        # Split roughly in half — left column first, right column next.
        mid = (len(rows) + 1) // 2
        col_l, col_r = st.columns(2)
        with col_l:
            _render_one(pd.DataFrame(rows[:mid]), key_suffix="_left")
        with col_r:
            _render_one(pd.DataFrame(rows[mid:]), key_suffix="_right")

    if truncated:
        st.caption(
            f"Showing first {_PHRASE_TABLE_MAX_ROWS} of {total_rows} "
            f"phrases. v0.0.5 chapter intent will replace this 16-beat "
            f"phrase grid with chapter-scale rows (typically 8–30 even "
            f"on multi-hour tracks)."
        )
