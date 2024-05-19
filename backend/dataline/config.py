import sys
from pathlib import Path

from pydantic_settings import BaseSettings

from dataline.utils.appdirs import user_data_dir

# https://pyinstaller.org/en/v6.6.0/runtime-information.html
IS_BUNDLED = bool(getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"))

USER_DATA_DIR = user_data_dir(appname="DataLine")


class Config(BaseSettings):
    # SQLite database will be mounted in the configuration directory
    # This is where all DataLine data is stored
    # Current dir / db.sqlite3
    sqlite_path: str = str(Path(USER_DATA_DIR) / "db.sqlite3")
    sqlite_echo: bool = False

    # This is where all uploaded files are stored (ex. uploaded sqlite DBs)
    data_directory: str = str(Path(USER_DATA_DIR) / "data")

    sample_dvdrental_path: str = str(Path(__file__).parent.parent / "samples" / "dvd_rental.sqlite3")
    sample_netflix_path: str = str(Path(__file__).parent.parent / "samples" / "netflix.sqlite3")
    sample_titanic_path: str = str(Path(__file__).parent.parent / "samples" / "titanic.sqlite3")

    default_model: str = "gpt-3.5-turbo"
    templates_path: Path = Path(__file__).parent.parent / "templates"
    assets_path: Path = Path(__file__).parent.parent / "assets"


config = Config()
