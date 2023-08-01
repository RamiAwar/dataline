import argparse
import json
import logging
import os
from datetime import date
from decimal import Decimal
from typing import Annotated, Dict, List, Union
from uuid import uuid4

import uvicorn
from fastapi import Body, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from llama_index import GPTSimpleVectorIndex
from pydantic import BaseModel
from pydantic.json import pydantic_encoder
from pygments import formatters, highlight, lexers
from pygments_pprint_sql import SqlFilter
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import DeclarativeMeta

import db
from context_builder import CustomSQLContextContainerBuilder
from models import Result, UnsavedResult
from services import QueryService
from sql_wrapper import CustomSQLDatabase, request_execute, request_limit

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
    dsn: str
    name: str


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

    # If new DSN, create new session and schema
    session_id = uuid4().hex

    # Create index
    create_schema_index(session_id=session_id, dsn=req.dsn)

    # Insert session only if success
    dialect = engine.url.get_dialect().name
    database = engine.url.database
    db.insert_session(
        session_id,
        req.dsn,
        database=database,
        name=req.name,
        dialect=dialect,
    )

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


# @app.get("/stream/query")
# async def streamed_query(
#     conversation_id: str, query: str, limit: int = 10, execute: bool = False
# ):
#     # Get conversation
#     conversation = db.get_conversation(conversation_id)

#     # Add user message to conversation
#     db.add_message_to_conversation(conversation_id, content=query, role="user")

#     # Get dsn from session_id
#     session_id = conversation.session_id
#     session = db.get_session(session_id)
#     if not session:
#         return {"status": "error", "message": "Invalid session_id"}

#     request_limit.set(limit)
#     request_execute.set(execute)

#     # Get streaming query service instance
#     if session_id not in query_services:
#         schema = db.get_schema_index(session_id)
#         query_services[session_id] = StreamingQueryService(
#             dsn=session[1], schema_index_file=schema
#         )

#     # Streaming query service handles updating conversation
#     response = query_services[session_id].query(query, conversation_id=conversation_id)
#     return EventSourceResponse(response)


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


@app.delete("/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str):
    db.delete_conversation(conversation_id=conversation_id)
    return {"status": "ok"}


@app.get("/messages")
async def messages(conversation_id: str):
    return {"status": "ok", "messages": db.get_messages_with_results(conversation_id)}


@app.post("/message")
async def add_message(
    conversation_id: Annotated[str, Body()], content: Annotated[str, Body()]
):
    db.add_message_to_conversation(
        conversation_id, content=content, role="user", results=[]
    )
    return {"status": "ok"}


@app.get("/execute-sql", response_model=UnsavedResult)
async def execute_sql(
    conversation_id: str, sql: str, limit: int = 10, execute: bool = True
):
    request_limit.set(limit)
    request_execute.set(execute)

    # Get conversation
    conversation = db.get_conversation(conversation_id)
    session_id = conversation.session_id
    session = db.get_session(session_id)
    if not session:
        return {"status": "error", "message": "Invalid session_id"}

    if session_id not in query_services:
        schema = db.get_schema_index(session_id)
        query_services[session_id] = QueryService(
            dsn=session[1], schema_index_file=schema
        )

    # Execute query
    data = query_services[session_id].sql_db.run_sql(sql)[1]
    print(data)
    if data.get("result"):
        # Convert data to list of rows
        rows = [data["columns"]]
        rows.extend([x for x in r] for r in data["result"])

        return Response(
            content=json.dumps(
                {
                    "status": "ok",
                    "data": UnsavedResult(
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

    # Get conversation
    conversation = db.get_conversation(conversation_id)

    # Add user message to message history
    db.add_message_to_conversation(conversation_id, content=query, role="user")

    # Get query service instance
    session_id = conversation.session_id
    session = db.get_session(session_id)
    if not session:
        return {"status": "error", "message": "Invalid session_id"}

    if session_id not in query_services:
        schema = db.get_schema_index(session_id)
        query_services[session_id] = QueryService(
            dsn=session[1], schema_index_file=schema
        )

    response = query_services[session_id].query(query, conversation_id=conversation_id)
    unsaved_results = query_services[session_id].results_from_query_response(response)

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
            UnsavedResult(
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


def create_schema_index(session_id: str, dsn: str):
    # Create index for DB schema
    engine = create_engine(dsn)
    insp = inspect(engine)
    table_names = insp.get_table_names()
    sql_db = CustomSQLDatabase(engine, include_tables=table_names)

    # build a vector index from the table schema information
    context_builder = CustomSQLContextContainerBuilder(sql_db)
    table_schema_index = context_builder.derive_index_from_context(GPTSimpleVectorIndex)

    # save the index to disk
    schema_index_name = f"{session_id}_schema_index.json"
    table_schema_index.save_to_disk(schema_index_name)

    # Mark session_id as indexed
    db.insert_schema_index(session_id, schema_index_name)

    return True


def sql2html(sql) -> str:
    return highlight(sql, lexer, formatters.HtmlFormatter())


class AlchemyJSONEncoder(json.JSONEncoder):
    def default(self, o):
        # check if object `o` is of custom declared model instance
        if isinstance(o.__class__, DeclarativeMeta):
            data = {}
            fields = o.__json__() if hasattr(o, "__json__") else dir(o)
            for field in [
                f
                for f in fields
                if not f.startswith("_")
                and f not in ["metadata", "query", "query_class"]
            ]:
                value = o.__getattribute__(field)
                try:
                    if json.dumps(value):
                        data[field] = value
                except TypeError:
                    data[field] = None
            return data
        # check if object `o` is of Decimal instance
        elif isinstance(o, Decimal):
            return o.to_eng_string()
        # check if object `o` is of date instance
        elif isinstance(o, date):
            return o.isoformat()
        # rest of objects are handled by default JSONEncoder like 'Datetime',
        # 'UUID', 'Markdown' and various others
        return json.JSONEncoder.default(self, o)


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
