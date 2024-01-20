import argparse
import json
import logging
import os
import re
from typing import Annotated, Any, Awaitable, Callable

import uvicorn
from fastapi import Body, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from pydantic.json import pydantic_encoder
from pygments import formatters, highlight, lexers
from pygments_pprint_sql import SqlFilter
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

import db
from errors import NotFoundError
from models import (
    Connection,
    DataResult,
    Result,
    UnsavedResult,
    UpdateConnectionRequest,
    UpdateConversationRequest,
)
from services import QueryService, SchemaService, results_from_query_response
from sql_wrapper import request_execute, request_limit

logging.basicConfig(level=logging.DEBUG)

logger = logging.getLogger(__name__)
lexer = lexers.MySqlLexer()
lexer.add_filter(SqlFilter())

app = FastAPI()
origins = ["*"]
loaded = None

_environ = os.environ.copy()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def check_secret(secret_token: str = Header(None)) -> None:
    """Dependency to check if a secret token is valid.
    This ensures only applications with the secret key specified when starting
    the server or in environment variable is able to post to the server.
    If no secret token is specified while starting or in environment variables
    this dependency does nothing.

    Args:
        secret_token (str, optional): Secret token sent with request.
            Defaults to None.

    Raises:
        HTTPException: Secret Token invalid
    """
    if _environ.get("SECRET_TOKEN") and secret_token != _environ.get("SECRET_TOKEN"):
        raise HTTPException(status_code=401, detail="Unauthorized")


async def catch_exceptions_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response | JSONResponse:
    global loaded
    try:
        return await call_next(request)
    except Exception as e:
        logger.exception("internal_server_error")
        loaded = JSONResponse({"status": "error", "message": str(e)})
        return JSONResponse({"status": "error", "message": str(e)})


app.middleware("http")(catch_exceptions_middleware)


class ConnectRequest(BaseModel):
    dsn: str = Field(min_length=3)
    name: str

    @validator("dsn")
    def validate_dsn_format(cls, value: str) -> str:
        # Define a regular expression to match the DSN format
        dsn_regex = r"^[\w\+]+:\/\/\w+:\w+@[\w.-]+[:\d]*\/\w+$"

        if not re.match(dsn_regex, value):
            raise ValueError(
                'Invalid DSN format. The expected format is "driver://username:password@host:port/database".'
            )

        return value


# TODO: Response model
@app.get("/healthcheck")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


# TODO: Add response models
@app.post("/connect")
async def connect_db(req: ConnectRequest) -> dict[str, str]:
    # Try to connect to provided dsn
    try:
        engine = create_engine(req.dsn)
        with engine.connect():
            pass
    except OperationalError as e:
        logger.error(e)
        return {"status": "error", "message": "Failed to connect to database"}

    # Check if connection with DSN already exists, then return connection_id
    try:
        existing_connection = db.get_connection_from_dsn(req.dsn)
        if existing_connection:
            return {"status": "ok", "connection_id": existing_connection.id}
    except NotFoundError:
        pass

    # Insert connection only if success
    dialect = engine.url.get_dialect().name
    database = engine.url.database

    if not database:
        raise Exception("Invalid DSN. Database name is required.")

    # TODO: Refactor to session dependency
    with db.DatabaseManager() as conn:
        connection_id = db.create_connection(
            conn,
            req.dsn,
            database=database,
            name=req.name,
            dialect=dialect,
        )

        SchemaService.create_or_update_tables(conn, connection_id)
        conn.commit()  # only commit if all step were successful

    return {
        "status": "ok",
        "connection_id": connection_id,
        "database": database,
        "dialect": dialect,
    }


# TODO: Add response model
@app.get("/connections")
async def get_connections() -> dict[str, Any]:
    return {
        "status": "ok",
        "connections": db.get_connections(),
    }


@app.get("/connection/{connection_id}/schemas")
async def get_table_schemas(connection_id: str) -> dict[str, Any]:
    # Check for connection existence
    with db.DatabaseManager() as conn:
        connection = db.get_connection(conn, connection_id)
        if not connection:
            return {"status": "error", "message": "Invalid connection_id"}

        return {
            "status": "ok",
            "tables": db.get_table_schemas_with_descriptions(connection_id),
        }


@app.patch("/schemas/table/{table_id}")
async def update_table_schema_description(
    table_id: str, description: Annotated[str, Body(embed=True)]
) -> dict[str, str]:
    with db.DatabaseManager() as conn:
        db.update_schema_table_description(
            conn, table_id=table_id, description=description
        )
        conn.commit()

    return {"status": "ok"}


@app.patch("/schemas/field/{field_id}")
async def update_table_schema_field_description(
    field_id: str, description: Annotated[str, Body(embed=True)]
) -> dict[str, str]:
    with db.DatabaseManager() as conn:
        db.update_schema_table_field_description(
            conn, field_id=field_id, description=description
        )
        conn.commit()

    return {"status": "ok"}


@app.get("/connection/{connection_id}")
async def get_connection(connection_id: str) -> dict[str, Any]:
    with db.DatabaseManager() as conn:
        return {
            "status": "ok",
            "connection": db.get_connection(conn, connection_id),
        }


@app.patch("/connection/{connection_id}")
async def update_connection(
    connection_id: str, req: UpdateConnectionRequest
) -> dict[str, Any]:
    # Try to connect to provided dsn
    try:
        engine = create_engine(req.dsn)
        with engine.connect():
            pass
    except OperationalError as e:
        logger.error(e)
        return {"status": "error", "message": "Failed to connect to database"}

    # Update connection only if success
    dialect = engine.url.get_dialect().name
    database = str(engine.url.database)

    db.update_connection(
        connection_id=connection_id,
        dsn=req.dsn,
        database=database,
        name=req.name,
        dialect=dialect,
    )
    return {
        "status": "ok",
        "connection": Connection(
            id=connection_id,
            dsn=req.dsn,
            database=database,
            name=req.name,
            dialect=dialect,
        ),
    }


@app.get("/conversations")
async def conversations() -> dict[str, Any]:
    return {
        "status": "ok",
        "conversations": db.get_conversations_with_messages_with_results(),
    }


@app.post("/conversation")
async def create_conversation(
    connection_id: Annotated[str, Body()], name: Annotated[str, Body()]
) -> dict[str, Any]:
    conversation_id = db.create_conversation(connection_id=connection_id, name=name)
    return {"status": "ok", "conversation_id": conversation_id}


@app.patch("/conversation/{conversation_id}")
async def update_conversation(
    conversation_id: str, req: UpdateConversationRequest
) -> dict[str, str]:
    db.update_conversation(conversation_id=conversation_id, name=req.name)
    return {"status": "ok"}


@app.delete("/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str) -> dict[str, str]:
    db.delete_conversation(conversation_id=conversation_id)
    return {"status": "ok"}


@app.get("/messages")
async def messages(conversation_id: str) -> dict[str, Any]:
    return {"status": "ok", "messages": db.get_messages_with_results(conversation_id)}


@app.get("/execute-sql", response_model=UnsavedResult)
async def execute_sql(
    conversation_id: str, sql: str, limit: int = 10, execute: bool = True
) -> dict[str, str] | Response:
    request_limit.set(limit)
    request_execute.set(execute)

    # Get conversation
    with db.DatabaseManager() as conn:
        conversation = db.get_conversation(conversation_id)
        connection_id = conversation.connection_id
        connection = db.get_connection(conn, connection_id)
        if not connection:
            return {"status": "error", "message": "Invalid connection_id"}

        query_service = QueryService(connection)

        # Execute query
        data = query_service.run_sql(sql)
        if data.get("result"):
            # Convert data to list of rows
            rows = [data["columns"]]
            rows.extend([x for x in r] for r in data["result"])

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
            return Response(
                content=json.dumps({"status": "error", "message": "No results found"}),
                media_type="application/json",
            )


@app.get("/toggle-save-query/{result_id}")
async def toggle_save_query(result_id: str) -> dict[str, str]:
    db.toggle_save_query(result_id=result_id)
    return {"status": "ok"}


@app.get("/query", response_model=list[UnsavedResult])
async def query(
    conversation_id: str, query: str, limit: int = 10, execute: bool = False
) -> dict[str, str] | Response:
    request_limit.set(limit)
    request_execute.set(execute)

    with db.DatabaseManager() as conn:
        # Get conversation
        conversation = db.get_conversation(conversation_id)

        # Create query service and generate response
        connection_id = conversation.connection_id
        connection = db.get_connection(conn, connection_id)
        if not connection:
            return {"status": "error", "message": "Invalid connection_id"}

        query_service = QueryService(connection=connection, model_name="gpt-3.5-turbo")
        response = query_service.query(query, conversation_id=conversation_id)
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
                {"status": "ok", "message": saved_message},
                default=pydantic_encoder,
                indent=4,
            ),
            media_type="application/json",
        )


def sql2html(sql) -> str:
    return highlight(sql, lexer, formatters.HtmlFormatter())


def init_argparse() -> argparse.ArgumentParser:
    """Initialises argparse and returns an argument parser

    Returns:
        argparse.ArgumentParser: Object for parsing CLI arguments
    """
    parser = argparse.ArgumentParser(
        description="Launches the Python API",
    )
    parser.add_argument(
        "--host",
        dest="host",
        default="127.0.0.1",
        help="Bind socket to host. [default: %(default)s]",
    )
    parser.add_argument(
        "--port",
        dest="port",
        default=7377,
        type=int,
        help="Bind socket to port. [default: %(default)s]",
    )
    parser.add_argument(
        "--log-level",
        dest="log_level",
        default="info",
        choices=["critical", "error", "warning", "info", "debug", "trace"],
        help="Log level. [default: %(default)s]",
    )
    parser.add_argument(
        "--secret",
        dest="secret",
        default=None,
        help="Server secret token. [default: %(default)s]",
    )
    return parser


if __name__ == "__main__":
    parser = init_argparse()
    args = parser.parse_args()

    if args.secret:
        _environ["SECRET_TOKEN"] = args.secret

    uvicorn.run(app, host=args.host, port=args.port, log_level=args.log_level)
