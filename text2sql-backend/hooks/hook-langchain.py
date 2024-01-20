from PyInstaller.utils.hooks import collect_all, copy_metadata

datas, binaries, hiddenimports = collect_all("langchain")

datas += copy_metadata("langchain", recursive=True)
