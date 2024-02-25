from PyInstaller.utils.hooks import collect_all, collect_data_files, copy_metadata

datas, binaries, hiddenimports = collect_all("langchain")

datas += copy_metadata("langchain", recursive=True)

datas += collect_data_files("langchain/chains/llm_summarization_checker/prompts")
