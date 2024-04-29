import json
import logging
import sys
import webbrowser
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, AsyncGenerator
from uuid import UUID

import socket
import uvicorn
from fastapi import Body, Depends, FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from pydantic.json import pydantic_encoder
from pygments import lexers
from pygments_pprint_sql import SqlFilter

import db
from alembic import command
from alembic.config import Config
from app import App
from dataline.config import IS_BUNDLED, config
from dataline.repositories.base import AsyncSession, NotFoundError, get_session
from dataline.services.settings import SettingsService
from models import (
    Conversation,
    ConversationWithMessagesWithResults,
    DataResult,
    MessageWithResults,
    Result,
    SuccessResponse,
    UnsavedResult,
    UpdateConversationRequest,
)
from services import QueryService, results_from_query_response
from sql_wrapper import request_execute, request_limit

logging.basicConfig(level=logging.DEBUG)

logger = logging.getLogger(__name__)
lexer = lexers.MySqlLexer()
lexer.add_filter(SqlFilter())


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
    if IS_BUNDLED:
        run_migrations()
        webbrowser.open("http://localhost:7377", new=2)

    yield
    # On shutdown


app = App(lifespan=lifespan)


@app.get("/healthcheck", response_model_exclude_none=True)
async def healthcheck() -> SuccessResponse[None]:
    return SuccessResponse()


class ConversationsOut(BaseModel):
    conversations: list[ConversationWithMessagesWithResults]


@app.get("/conversations")
async def conversations() -> SuccessResponse[ConversationsOut]:
    return SuccessResponse(
        data=ConversationsOut(
            conversations=db.get_conversations_with_messages_with_results(),
        ),
    )


class CreateConversationIn(BaseModel):
    connection_id: str
    name: str


class CreateConversationOut(BaseModel):
    conversation_id: int


@app.post("/conversation")
async def create_conversation(
    conversation: CreateConversationIn,
) -> SuccessResponse[CreateConversationOut]:
    conversation_id = db.create_conversation(connection_id=conversation.connection_id, name=conversation.name)
    return SuccessResponse(
        data=CreateConversationOut(
            conversation_id=conversation_id,
        ),
    )


@app.patch("/conversation/{conversation_id}")
async def update_conversation(conversation_id: str, req: UpdateConversationRequest) -> dict[str, str]:
    db.update_conversation(conversation_id=conversation_id, name=req.name)
    return {"status": "ok"}


@app.delete("/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str) -> dict[str, str]:
    db.delete_conversation(conversation_id=conversation_id)
    return {"status": "ok"}


@app.get("/conversation/{conversation_id}")
async def get_conversation(conversation_id: str) -> SuccessResponse[Conversation]:
    return SuccessResponse(data=db.get_conversation(conversation_id))


class ListMessageOut(BaseModel):
    messages: list[MessageWithResults]


@app.get("/messages")
async def get_messages(conversation_id: str) -> SuccessResponse[ListMessageOut]:
    # Will raise error that's auto captured by middleware if not exists
    db.get_conversation(conversation_id)
    messages = db.get_messages_with_results(conversation_id)
    return SuccessResponse(data=ListMessageOut(messages=messages))


@app.get("/execute-sql", response_model=UnsavedResult)
async def execute_sql(
    conversation_id: str,
    sql: str,
    limit: int = 10,
    execute: bool = True,
    session: AsyncSession = Depends(get_session),
    settings_service: SettingsService = Depends(SettingsService),
) -> Response:
    request_limit.set(limit)
    request_execute.set(execute)

    # Get conversation
    with db.DatabaseManager() as conn:
        # Will raise error that's auto captured by middleware if not exists
        conversation = db.get_conversation(conversation_id)
        connection_id = conversation.connection_id
        try:
            connection = db.get_connection(conn, UUID(connection_id))
        except NotFoundError:
            raise HTTPException(status_code=404, detail="Invalid connection_id")

        openai_key = await settings_service.get_openai_api_key(session)
        preferred_model = await settings_service.get_preferred_model(session)
        query_service = QueryService(connection, openai_api_key=openai_key, model_name=preferred_model)

        # Execute query
        data = query_service.run_sql(sql)
        if data.get("result"):
            # Convert data to list of rows
            rows = [data["columns"]]
            rows.extend([x for x in r] for r in data["result"])

            # TODO: Try to remove custom encoding from here
            return Response(
                content=json.dumps(
                    {
                        "status": "ok",
                        "data": DataResult(
                            type="data",
                            content=rows,
                        ),
                    },
                    default=pydantic_encoder,
                    indent=4,
                ),
                media_type="application/json",
            )
        else:
            raise HTTPException(status_code=404, detail="No results found")


@app.get("/toggle-save-query/{result_id}")
async def toggle_save_query(result_id: str) -> SuccessResponse[None]:
    db.toggle_save_query(result_id=result_id)
    return SuccessResponse()


@app.patch("/result/{result_id}")
async def update_result_content(result_id: str, content: Annotated[str, Body(embed=True)]) -> SuccessResponse[None]:
    with db.DatabaseManager() as conn:
        db.update_result_content(conn, result_id=result_id, content=content)
        conn.commit()
        return SuccessResponse()


@app.get("/query", response_model=list[UnsavedResult])
async def query(
    conversation_id: str,
    query: str,
    limit: int = 10,
    execute: bool = False,
    session: AsyncSession = Depends(get_session),
    settings_service: SettingsService = Depends(SettingsService),
) -> Response:
    request_limit.set(limit)
    request_execute.set(execute)

    with db.DatabaseManager() as conn:
        # Get conversation
        conversation = db.get_conversation(conversation_id)

        # Create query service and generate response
        connection_id = conversation.connection_id
        try:
            connection = db.get_connection(conn, UUID(connection_id))
        except NotFoundError:
            raise HTTPException(status_code=404, detail="Invalid connection_id")

        openai_key = await settings_service.get_openai_api_key(session)
        preferred_model = await settings_service.get_preferred_model(session)
        query_service = QueryService(connection=connection, openai_api_key=openai_key, model_name=preferred_model)
        response = await query_service.query(query, conversation_id=conversation_id)
        unsaved_results = results_from_query_response(response)

        # Save results before executing query if any (without data)
        saved_results: list[Result] = []
        for result in unsaved_results:
            saved_result = db.create_result(result)
            saved_results.append(saved_result)

        # Add assistant message to message history
        saved_message = db.add_message_to_conversation(
            conversation_id,
            response.text,
            role="assistant",
            results=saved_results,
        )

        # Execute query if any and fetch data result now
        if response.sql:
            data = query_service.run_sql(response.sql)
            if data.get("result"):
                # Convert data to list of rows
                rows = [data["columns"]]
                rows.extend([x for x in r] for r in data["result"])

                unsaved_results.append(
                    DataResult(
                        type="data",
                        content=rows,
                    )
                )

        # Replace saved results with unsaved that include data returned if any
        # TODO @Rami this is causing the bookmark button in the frontend to fail when the message is first created because result_id is null.
        # TODO maybe append DataResult to saved_message.results instead of replacing it?
        saved_message.results = unsaved_results

        return Response(
            content=json.dumps(
                {"status": "ok", "data": {"message": saved_message}},
                default=pydantic_encoder,
                indent=4,
            ),
            media_type="application/json",
        )


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
                def write(self, string):
                    pass

                def isatty(self):
                    return False

            sys.stdout = NullOutput() if sys.stdout is None else sys.stdout
            sys.stderr = NullOutput() if sys.stderr is None else sys.stderr
            uvicorn.run(app, host="localhost", port=7377)
        else:
            webbrowser.open("http://localhost:7377", new=2)
