# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files
from PyInstaller.utils.hooks import collect_all
from PyInstaller.utils.hooks import collect_submodules

datas = [('alembic', 'alembic'), ('alembic.ini', '.'), ('samples', 'samples'), ('templates', 'templates'), ('assets', 'assets')]
binaries = []
hiddenimports = [
    'asyncpg.pgproto.pgproto', 'uuid', 'ipaddress', 'aiosqlite', 'tiktoken_ext.openai_public', 'tiktoken_ext', 'snowflake.sqlalchemy', 'pyodbc', 'pydantic.deprecated.decorator'
]
datas += collect_data_files('jinja2')
tmp_ret = collect_all('snowflake-sqlalchemy')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('snowflake-connector-python')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]

hiddenimports += collect_submodules('pyreadstat')

block_cipher = None


a = Analysis(
    ['dataline/main.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
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
    name='dataline',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='dataline',
)
