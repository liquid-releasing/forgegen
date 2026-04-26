# Copyright (c) 2026 Liquid Releasing. Licensed under the MIT License.

"""About metadata for ForgeGen.

Single source of truth for version, credits, and license content shown in:
  - Sidebar About expander
  - PyWebView Help -> About menu (desktop mode)
  - `forgegen --version`
"""

from __future__ import annotations

__all__ = [
    "APP_NAME",
    "ABOUT_MARKDOWN",
    "TAGLINE",
    "VERSION",
    "about_title",
    "about_text",
]

VERSION = "0.0.1"
APP_NAME = "ForgeGen"
TAGLINE = "Generate funscripts from audio in seconds — a local desktop app."


ABOUT_MARKDOWN = f"""
### {APP_NAME} {VERSION}

{TAGLINE}

---

#### Open source credits

- **[FFmpeg](https://ffmpeg.org)** — video and audio processing. LGPL 2.1+ / GPL 2+.
- **[Streamlit](https://streamlit.io)** — application UI framework. Apache 2.0.
- **[PyWebView](https://pywebview.flowrl.com)** — native desktop window
  wrapper. BSD 3-Clause.

Full third-party license text is bundled with the release under `LICENSES/`.

#### AI assistance

Written by human and Claude AI (Anthropic).

---

#### License

**{APP_NAME}(TM)** is a trademark of Liquid Releasing.

(c) 2026 [Liquid Releasing](https://github.com/liquid-releasing/forgegen).
Licensed under the [MIT License](https://github.com/liquid-releasing/forgegen/blob/main/LICENSE).
"""


def about_title() -> str:
    return f"{APP_NAME} {VERSION}"


def about_text() -> str:
    return (
        f"{APP_NAME} {VERSION}\n"
        f"{TAGLINE}\n\n"
        "Open source credits:\n"
        "  - FFmpeg (LGPL/GPL)\n"
        "  - Streamlit (Apache 2.0)\n"
        "  - PyWebView (BSD 3-Clause)\n\n"
        "Written by human and Claude AI (Anthropic).\n\n"
        f"{APP_NAME} is a trademark of Liquid Releasing.\n"
        f"(c) 2026 Liquid Releasing. MIT License."
    )
