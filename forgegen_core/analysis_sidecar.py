# Copyright (c) 2026 Liquid Releasing. Licensed under the MIT License.

"""Write the canonical ``<stem>.analysis.json`` next to a generated funscript.

v0.1 scope: chapters only. Per the cross-app analysis schema (see
``docs/architecture/analysis-schema.md``) and the FunscriptForge handoff
decision (see ``docs/architecture/funscriptforge-handoff.md``), forgegen
emits a minimal v1.0 sidecar carrying just ``version``, ``generated_by``,
``source``, and ``structural.chapter_proposals``. Other top-level sections
(``audio_features``, ``video_features``, ``event_proposals``,
``generation_choices``) fill in during later phases — additive,
backwards-compatible.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from videoflow.chapters import (
    Chapter,
    read_mp4_chapters,
    read_sidecar_chapters,
)

try:
    from importlib.metadata import version as _pkg_version
except ImportError:
    _pkg_version = None  # type: ignore[assignment]


SCHEMA_VERSION = "1.0"
_HASH_WINDOW_BYTES = 1 << 20


def _videoflow_version() -> str:
    if _pkg_version is None:
        return "unknown"
    try:
        return _pkg_version("videoflow")
    except Exception:
        return "unknown"


def _utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )


def _partial_md5(path: Path) -> str:
    """MD5 over the first and last 1 MB. Cheap; sufficient for cache invalidation."""
    h = hashlib.md5()
    size = path.stat().st_size
    with path.open("rb") as f:
        h.update(f.read(min(size, _HASH_WINDOW_BYTES)))
        if size > _HASH_WINDOW_BYTES * 2:
            f.seek(size - _HASH_WINDOW_BYTES)
            h.update(f.read(_HASH_WINDOW_BYTES))
    return h.hexdigest()


def _resolve_chapters(source_path: Path) -> tuple[list[Chapter], list[str]]:
    """Read chapters and report which source provided them.

    Mirrors the priority order in ``videoflow.chapters.load_chapters`` but
    returns the evidence label ("embedded_mp4" or "chapters_json_sidecar")
    so we can populate ``chapter_proposals[].evidence`` accurately.

    Returns an empty list + empty evidence when no source has chapters.
    """
    try:
        mp4 = read_mp4_chapters(source_path)
    except Exception:
        mp4 = None
    if mp4:
        return mp4, ["embedded_mp4"]
    try:
        sidecar = read_sidecar_chapters(source_path)
    except Exception:
        sidecar = None
    if sidecar:
        return sidecar, ["chapters_json_sidecar"]
    return [], []


def _chapter_to_proposal(
    ch: Chapter,
    next_at_ms: int | None,
    duration_ms: int,
    evidence: list[str],
) -> dict[str, Any]:
    """Map ``videoflow.chapters.Chapter`` → analysis schema proposal entry."""
    if ch.end_ms is not None:
        end_ms = ch.end_ms
    elif next_at_ms is not None:
        end_ms = next_at_ms
    else:
        end_ms = duration_ms
    proposal: dict[str, Any] = {
        "start_ms": ch.at_ms,
        "end_ms": end_ms,
        "confidence": 1.0,
        "evidence": evidence,
    }
    if ch.intent:
        proposal["intent_proposal"] = ch.intent
    if ch.name:
        proposal["name"] = ch.name
    return proposal


def build_analysis_sidecar(
    *,
    source_path: Path | None,
    audio_name: str,
    duration_ms: int,
    forgegen_version: str,
) -> dict[str, Any]:
    """Build the v0.1 minimal analysis.json dict.

    ``source_path`` may be ``None`` — that's the case when the user
    uploaded a file to the Streamlit app and there is no persistent
    source on disk. In that case ``audio_md5`` is omitted and chapter
    resolution is skipped (no source to read embedded chapters from).

    ``audio_name`` is always populated for ``source.audio_path`` (filename
    only when no full path is available).
    """
    if source_path is not None and source_path.exists():
        chapters, evidence = _resolve_chapters(source_path)
        try:
            audio_md5: str | None = _partial_md5(source_path)
        except OSError:
            audio_md5 = None
    else:
        chapters, evidence = [], []
        audio_md5 = None

    starts = [c.at_ms for c in chapters]
    proposals = [
        _chapter_to_proposal(
            ch,
            starts[i + 1] if i + 1 < len(starts) else None,
            duration_ms,
            evidence,
        )
        for i, ch in enumerate(chapters)
    ]

    source: dict[str, Any] = {
        "audio_path": audio_name,
        "duration_ms": int(duration_ms),
    }
    if audio_md5 is not None:
        source["audio_md5"] = audio_md5

    return {
        "version": SCHEMA_VERSION,
        "generated_by": {
            "tool": "forgegen",
            "tool_version": forgegen_version,
            "videoflow_version": _videoflow_version(),
            "generated_at": _utc_now_iso(),
        },
        "source": source,
        "structural": {
            "chapter_proposals": proposals,
        },
    }


def write_analysis_sidecar(
    funscript_path: Path,
    *,
    source_path: Path | None,
    audio_name: str,
    duration_ms: int,
    forgegen_version: str,
) -> Path:
    """Write ``<stem>.analysis.json`` next to ``funscript_path``.

    Returns the path written. Raises ``OSError`` on filesystem failure —
    callers should treat this as non-fatal: the funscript itself is the
    primary artifact and a failed sidecar should not block the user from
    saving.
    """
    payload = build_analysis_sidecar(
        source_path=source_path,
        audio_name=audio_name,
        duration_ms=duration_ms,
        forgegen_version=forgegen_version,
    )
    out_path = funscript_path.with_suffix("")
    out_path = out_path.with_name(out_path.name + ".analysis.json")
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return out_path
