import argparse
import json
import logging
import os
import re
from typing import Annotated, Dict, List
from uuid import uuid4

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
from models import (
    DataResult,
    Result,
    Session,
    UnsavedResult,
    UpdateConversationRequest,
    UpdateSessionRequest,
)
from services import QueryService, SchemaService
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

# Query service instances - one per db connection
query_services: Dict[str, QueryService] = {}


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


async def catch_exceptions_middleware(request: Request, call_next):
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
    def validate_dsn_format(cls, value):
        # Define a regular expression to match the DSN format
        dsn_regex = r"^[\w\+]+:\/\/\w+:\w+@[\w.-]+[:\d]*\/\w+$"

        if not re.match(dsn_regex, value):
            raise ValueError(
                'Invalid DSN format. The expected format is "driver://username:password@host:port/database".'
            )

        return value


@app.get("/healthcheck")
async def healthcheck():
    return {"status": "ok"}


@app.post("/connect")
async def connect_db(req: ConnectRequest):
    # Try to connect to provided dsn
    try:
        engine = create_engine(req.dsn)
        with engine.connect():
            pass
    except OperationalError as e:
        logger.error(e)
        return {"status": "error", "message": "Failed to connect to database"}

    # Check if session with DSN already exists, then return session_id
    res = db.get_session_from_dsn(req.dsn)
    if res:
        return {"status": "ok", "session_id": res[0]}

    # Insert session only if success
    dialect = engine.url.get_dialect().name
    database = engine.url.database

    with db.DatabaseManager() as conn:
        session_id = db.insert_session(
            conn,
            req.dsn,
            database=database,
            name=req.name,
            dialect=dialect,
        )

        SchemaService.create_or_update_tables(conn, session_id)
        conn.commit()  # only commit if all step were successful

    return {
        "status": "ok",
        "session_id": session_id,
        "database": database,
        "dialect": dialect,
    }


# TODO: Add response model
@app.get("/sessions")
async def get_sessions():
    return {
        "status": "ok",
        "sessions": db.get_sessions(),
    }


@app.get("/session/{session_id}/schemas")
async def get_table_schemas(session_id: str):
    # Check for session existence
    with db.DatabaseManager() as conn:
        session = db.get_session(conn, session_id)
        if not session:
            return {"status": "error", "message": "Invalid session_id"}

        return {
            "status": "ok",
            "tables": db.get_table_schemas_with_descriptions(session_id),
        }


@app.patch("/schemas/table/{table_id}")
async def update_table_schema_description(
    table_id: str, description: Annotated[str, Body(embed=True)]
):
    with db.DatabaseManager() as conn:
        db.update_schema_table_description(
            conn, table_id=table_id, description=description
        )
        conn.commit()

    return {"status": "ok"}


@app.patch("/schemas/field/{field_id}")
async def update_table_schema_field_description(
    field_id: str, description: Annotated[str, Body(embed=True)]
):
    with db.DatabaseManager() as conn:
        db.update_schema_table_field_description(
            conn, field_id=field_id, description=description
        )
        conn.commit()

    return {"status": "ok"}


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    with db.DatabaseManager() as conn:
        return {
            "status": "ok",
            "session": db.get_session(conn, session_id),
        }


@app.patch("/session/{session_id}")
async def update_session(session_id: str, req: UpdateSessionRequest):
    # Try to connect to provided dsn
    try:
        engine = create_engine(req.dsn)
        with engine.connect():
            pass
    except OperationalError as e:
        logger.error(e)
        return {"status": "error", "message": "Failed to connect to database"}

    # Update session only if success
    dialect = engine.url.get_dialect().name
    database = engine.url.database

    db.update_session(
        session_id=session_id,
        dsn=req.dsn,
        database=database,
        name=req.name,
        dialect=dialect,
    )
    return {
        "status": "ok",
        "connection": Session(
            session_id=session_id,
            dsn=req.dsn,
            database=database,
            name=req.name,
            dialect=dialect,
        ),
    }


@app.get("/conversations")
async def conversations():
    return {
        "status": "ok",
        "conversations": db.get_conversations_with_messages_with_results(),
    }


@app.post("/conversation")
async def create_conversation(
    session_id: Annotated[str, Body()], name: Annotated[str, Body()]
):
    conversation_id = db.create_conversation(session_id=session_id, name=name)
    return {"status": "ok", "conversation_id": conversation_id}


@app.patch("/conversation/{conversation_id}")
async def update_conversation(conversation_id: str, req: UpdateConversationRequest):
    db.update_conversation(conversation_id=conversation_id, name=req.name)
    return {"status": "ok"}


@app.delete("/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str):
    db.delete_conversation(conversation_id=conversation_id)
    return {"status": "ok"}


@app.get("/messages")
async def messages(conversation_id: str):
    return {"status": "ok", "messages": db.get_messages_with_results(conversation_id)}


@app.get("/execute-sql", response_model=UnsavedResult)
async def execute_sql(
    conversation_id: str, sql: str, limit: int = 10, execute: bool = True
):
    request_limit.set(limit)
    request_execute.set(execute)

    # Get conversation
    with db.DatabaseManager() as conn:
        conversation = db.get_conversation(conversation_id)
        session_id = conversation.session_id
        session = db.get_session(conn, session_id)
        if not session:
            return {"status": "error", "message": "Invalid session_id"}

        if session_id not in query_services:
            query_services[session_id] = QueryService(
                dsn=session.dsn, model_name="gpt-3.5-turbo"
            )

        # Execute query
        data = query_services[session_id].sql_db.run_sql(sql)[1]
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


@app.get("/query", response_model=List[UnsavedResult])
async def query(
    conversation_id: str, query: str, limit: int = 10, execute: bool = False
):
    request_limit.set(limit)
    request_execute.set(execute)

    with db.DatabaseManager() as conn:
        # Get conversation
        conversation = db.get_conversation(conversation_id)

        # Get query service instance
        session_id = conversation.session_id
        session = db.get_session(conn, session_id)
        if not session:
            return {"status": "error", "message": "Invalid session_id"}

        if session_id not in query_services:
            query_services[session_id] = QueryService(
                dsn=session.dsn, model_name="gpt-3.5-turbo"
            )

        response = query_services[session_id].query(
            query, conversation_id=conversation_id
        )
        unsaved_results = query_services[session_id].results_from_query_response(
            response
        )

        # Save results WITHOUT data (sensitive)
        saved_results: List[Result] = []
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

        # Execute query and fetch data result now
        data = query_services[session_id].sql_db.run_sql(response.sql)[1]
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

        # Replace saved results with unsaved that include data returned
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
