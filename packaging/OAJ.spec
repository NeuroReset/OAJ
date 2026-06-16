# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules


PROJECT_DIR = Path(SPECPATH).parent

datas = [
    (str(PROJECT_DIR / "web"), "web"),
    (str(PROJECT_DIR / "assets" / "data" / "tblSistema.csv"), "assets/data"),
    (str(PROJECT_DIR / "assets" / "templates" / "template.xlsx"), "assets/templates"),
    (str(PROJECT_DIR / "assets" / "templates" / "tempalte_secc.xlsx"), "assets/templates"),
    (str(PROJECT_DIR / "assets" / "images" / "image.ico"), "assets/images"),
    (str(PROJECT_DIR / "assets" / "images" / "image.png"), "assets/images"),
    (str(PROJECT_DIR / "db_config.example.json"), "."),
]

hiddenimports = (
    collect_submodules("webview")
    + collect_submodules("sqlalchemy.dialects")
    + ["pythoncom", "pywintypes", "win32timezone", "win32com", "pyodbc"]
)


a = Analysis(
    [str(PROJECT_DIR / "main.py")],
    pathex=[str(PROJECT_DIR)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="OAJ",
    icon=str(PROJECT_DIR / "assets" / "images" / "image.ico"),
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="OAJ",
)
