# -*- mode: python ; coding: utf-8 -*-
#
# PyInstaller spec for ForgeGen desktop app.
#
# Build with:
#     pyinstaller ForgeGen.spec --clean
#
# Output:
#   Windows: dist/ForgeGen/ForgeGen.exe
#   macOS:   dist/ForgeGen/ForgeGen.app
#   Linux:   dist/ForgeGen/ForgeGen

import sys
from pathlib import Path
from PyInstaller.utils.hooks import (
    collect_all,
    collect_data_files,
    collect_submodules,
    copy_metadata,
)

SPEC_DIR = Path(SPECPATH).resolve()

# Streamlit collection (runtime-discovered dist-info, data files, etc.)
streamlit_datas, streamlit_binaries, streamlit_hiddenimports = collect_all("streamlit")
streamlit_datas += copy_metadata("streamlit")

# Other packages that use importlib.metadata at runtime
extra_metadata = []
for pkg in (
    "streamlit",
    "altair",
    "pyarrow",
    "numpy",
    "pandas",
    "plotly",
    "tornado",
    "click",
    "rich",
    "requests",
    "videoflow",
):
    try:
        extra_metadata += copy_metadata(pkg)
    except Exception:
        pass

hidden_imports = (
    list(streamlit_hiddenimports)
    + [
        "streamlit.web.cli",
        "streamlit.runtime.scriptrunner.magic_funcs",
        "streamlit.runtime.caching",
        "streamlit.runtime.state",
        "streamlit.components.v1",
        "altair",
        "pyarrow",
        "pydeck",
        "watchdog",
        "importlib_metadata",
        "numpy",
        "pandas",
        "plotly",
        "requests",
        # ForgeGen's own packages — extend as the project grows.
        "forgegen_core",
        "forgegen_core.about",
        "panels",
        "panels.generate",
        "panels.details",
        # videoflow is the engine that does the actual audio→funscript work.
        "videoflow",
    ]
)

# ── Data files ─────────────────────────────────────────────────────────
datas = (
    list(streamlit_datas)
    + list(extra_metadata)
)

# ForgeGen's own source package + UI glue
datas += [
    (str(SPEC_DIR / "forgegen_core"), "forgegen_core"),
    (str(SPEC_DIR / "panels"), "panels"),
    (str(SPEC_DIR / "app.py"), "."),
    (str(SPEC_DIR / "media"), "media"),
    (str(SPEC_DIR / ".streamlit" / "config.toml"), ".streamlit"),
]

# License files — ship ours + the third-party list next to the exe
datas += [
    (str(SPEC_DIR / "LICENSE"), "."),
    (str(SPEC_DIR / "THIRD_PARTY_LICENSES.md"), "."),
    (str(SPEC_DIR / "README.md"), "."),
]

# Platform-specific app icon. Each platform falls back to None if the
# expected asset is missing — that lets a freshly scaffolded project
# build immediately, even before brand assets land. PyInstaller will
# emit a default-icon executable in that case.
if sys.platform == "win32":
    _ico = SPEC_DIR / "media" / "forgegen.ico"
    _icon = str(_ico) if _ico.exists() else None
elif sys.platform == "darwin":
    _icns = SPEC_DIR / "media" / "forgegen.icns"
    _icon = str(_icns) if _icns.exists() else None
else:
    _icon = None

binaries = list(streamlit_binaries)

block_cipher = None

a = Analysis(
    ["forgegen.py"],
    pathex=[str(SPEC_DIR)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter",
        "PyQt5",
        "PyQt6",
        "PySide2",
        "PySide6",
        "notebook",
        "jupyter",
        "IPython",
        "pytest",
        "sphinx",
        "scipy",
        "sklearn",
        "tensorflow",
        "torch",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="ForgeGen",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=_icon,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="ForgeGen",
)

if sys.platform == "darwin":
    app = BUNDLE(
        coll,
        name="ForgeGen.app",
        icon=_icon,
        bundle_identifier="com.liquidreleasing.forgegen",
    )
