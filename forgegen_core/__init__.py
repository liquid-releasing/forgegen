# Copyright (c) 2026 Liquid Releasing. Licensed under the MIT License.

"""ForgeGen core package.

Add your application's modules here. The launcher and PyInstaller spec already
import this package — extend it as your product grows.
"""

from forgegen_core.about import (
    ABOUT_MARKDOWN,
    APP_NAME,
    TAGLINE,
    VERSION,
    about_text,
    about_title,
)

__all__ = [
    "ABOUT_MARKDOWN",
    "APP_NAME",
    "TAGLINE",
    "VERSION",
    "about_text",
    "about_title",
]
