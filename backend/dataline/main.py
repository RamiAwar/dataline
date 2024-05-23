import json
import logging
import socket
import sys
import webbrowser
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, AsyncGenerator
from uuid import UUID

import uvicorn
from fastapi import Body, Depends, FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic.json import pydantic_encoder

from alembic import command
from alembic.config import Config
from dataline.app import App
from dataline.config import IS_BUNDLED, config
from dataline.old_models import SuccessResponse, UnsavedResult
from dataline.old_services import TempQueryService
from dataline.repositories.base import AsyncSession, NotFoundError, get_session
from dataline.services.connection import ConnectionService
from dataline.services.conversation import ConversationService
from dataline.services.result import ResultService
from dataline.old_services import request_execute, request_limit

logging.basicConfig(level=logging.DEBUG)

logger = logging.getLogger(__name__)


def run_migrations() -> None:
    pth = Path(__file__).parent / "alembic.ini"
    alembic_cfg = Config(pth)
    loc = alembic_cfg.get_main_option("script_location")
    if loc:
        loc = loc.removeprefix("./")
    else:
        raise Exception("Something went wrong - alembic config is None")

    alembic_cfg.set_main_option("script_location", f"{Path(__file__).parent}/{loc}")
    alembic_cfg.config_file_name = None  # to prevent alembic from overriding the logs
    command.upgrade(alembic_cfg, "head", sql=False)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # On startup
    # Create data directory if not exists
    Path(config.data_directory).mkdir(parents=True, exist_ok=True)

    if IS_BUNDLED:
        run_migrations()
        webbrowser.open("http://localhost:7377", new=2)

    yield
    # On shutdown


app = App(lifespan=lifespan)


@app.get("/healthcheck", response_model_exclude_none=True)
async def healthcheck() -> SuccessResponse[None]:
    return SuccessResponse()


@app.get("/execute-sql", response_model=UnsavedResult)
async def execute_sql(
    conversation_id: UUID,
    # TODO: Add query_string_id to support linking result to query here
    # query_string_id: UUID,
    sql: str,
    limit: int = 10,
    execute: bool = True,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
    connection_service: ConnectionService = Depends(ConnectionService),
) -> Response:
    request_limit.set(limit)
    request_execute.set(execute)

    # Get conversation
    # Will raise error that's auto captured by middleware if not exists
    conversation = await conversation_service.get_conversation(session, conversation_id=conversation_id)
    connection_id = conversation.connection_id
    try:
        connection = await connection_service.get_connection(session, connection_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Invalid connection_id")

    query_service = TempQueryService(connection)

    # Execute query
    data = query_service.run_sql(sql)
    if data.get("result"):
        # Convert data to list of rows
        rows = []
        rows.extend([x for x in r] for r in data["result"])

        # TODO: Try to remove custom encoding from here
        return Response(
            content=json.dumps(
                {
                    "data": {
                        "type": "SQL_QUERY_RUN_RESULT",
                        "content": {
                            "columns": data["columns"],
                            "rows": rows,
                        },
                    }
                },
                default=pydantic_encoder,
                indent=4,
            ),
            media_type="application/json",
        )
    else:
        raise HTTPException(status_code=404, detail="No results found")


@app.patch("/result/{result_id}")
async def update_result_content(
    result_id: UUID,
    content: Annotated[str, Body(embed=True)],
    session: AsyncSession = Depends(get_session),
    result_service: ResultService = Depends(ResultService),
) -> SuccessResponse[None]:
    await result_service.update_result_content(session, result_id=result_id, content=content)
    return SuccessResponse()


if IS_BUNDLED:
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
            return s.connect_ex(("localhost", port)) == 0

    if __name__ == "__main__":
        if not is_port_in_use(7377):

            class NullOutput(object):
                def write(self, _: str) -> None:
                    pass

                def isatty(self) -> bool:
                    return False

            sys.stdout = NullOutput() if sys.stdout is None else sys.stdout
            sys.stderr = NullOutput() if sys.stderr is None else sys.stderr
            uvicorn.run(app, host="localhost", port=7377)
        else:
            webbrowser.open("http://localhost:7377", new=2)
