import json
import logging
import socket
import sys
import webbrowser
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

import uvicorn
from alembic import command
from alembic.config import Config
from dataline.app import App
from dataline.config import IS_BUNDLED, config
from dataline.old_models import SuccessResponse
from dataline.sentry import maybe_init_sentry
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)


def run_migrations() -> None:
    if IS_BUNDLED:
        path = Path(__file__).parent / "alembic.ini"
    else:
        path = Path(__file__).parent.parent / "alembic.ini"

    alembic_cfg = Config(path)
    loc = alembic_cfg.get_main_option("script_location")
    if loc:
        loc = loc.removeprefix("./")
    else:
        raise Exception("Something went wrong - alembic config is None")

    if IS_BUNDLED:
        loc = Path(__file__).parent / loc

    alembic_cfg.set_main_option("script_location", str(loc))
    alembic_cfg.config_file_name = None  # to prevent alembic from overriding the logs
    command.upgrade(alembic_cfg, "head", sql=False)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # On startup
    # Create data directory if not exists
    Path(config.data_directory).mkdir(parents=True, exist_ok=True)
    if IS_BUNDLED or config.spa_mode:
        run_migrations()
        webbrowser.open("http://127.0.0.1:7377", new=2)

    await maybe_init_sentry()
    yield
    # On shutdown


app = App(lifespan=lifespan)


@app.get("/healthcheck", response_model_exclude_none=True)
async def healthcheck() -> SuccessResponse[None]:
    return SuccessResponse()


if IS_BUNDLED or config.spa_mode:
    # running in a PyInstaller bundle
    templates = Jinja2Templates(directory=config.templates_path)
    app.mount("/assets", StaticFiles(directory=config.assets_path), name="static")

    @app.get("/{rest_of_path:path}", include_in_schema=False)
    def index(request: Request, rest_of_path: str) -> Response:
        context = {"request": request}
        vite_config_path = config.assets_path / "manifest.json"
        if not vite_config_path.is_file():
            raise HTTPException(status_code=404, detail="Could not find frontend manifest")

        with vite_config_path.open("r") as f:
            vite_config = json.load(f)
            context["VITE_MANIFEST_JS"] = vite_config["index.html"]["file"]
            context["VITE_MANIFEST_CSS"] = vite_config["index.html"]["css"][0]
        return templates.TemplateResponse("index.html.jinja2", context=context)

    def is_port_in_use(port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(("0.0.0.0", port)) == 0

    if __name__ == "__main__":
        if not is_port_in_use(7377):

            class NullOutput(object):
                def write(self, _: str) -> None:
                    pass

                def isatty(self) -> bool:
                    return False

            sys.stdout = NullOutput() if sys.stdout is None else sys.stdout
            sys.stderr = NullOutput() if sys.stderr is None else sys.stderr
            uvicorn.run(app, host="0.0.0.0", port=7377)
        else:
            webbrowser.open("http://localhost:7377", new=2)
