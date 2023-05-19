import argparse
import itertools
import json
import logging
import os
from datetime import date
from decimal import Decimal
from typing import Dict
from uuid import uuid4

import uvicorn
from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from llama_index import GPTSimpleVectorIndex
from pydantic import BaseModel
from pygments import formatters, highlight, lexers
from pygments_pprint_sql import SqlFilter
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import DeclarativeMeta
from sse_starlette.sse import EventSourceResponse

import db
from context_builder import CustomSQLContextContainerBuilder
from errors import RelatedTablesNotFoundError
from services import QueryService, StreamingQueryService
from sql_wrapper import CustomSQLDatabase, request_execute, request_limit

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


class Dsn(BaseModel):
    dsn: str


@app.get("/healthcheck")
async def healthcheck():
    return {"status": "ok"}


@app.post("/connect")
async def connect_db(dsn: Dsn):
    # Try to connect to provided dsn
    try:
        engine = create_engine(dsn.dsn)
        with engine.connect():
            pass
    except OperationalError as e:
        logger.error(e)
        return {"status": "error", "message": "Failed to connect to database"}

    # Check if session with DSN already exists, then return session_id
    res = db.get_session_from_dsn(dsn.dsn)
    if res:
        return {"status": "ok", "session_id": res[0]}

    # If new DSN, create new session and schema
    session_id = uuid4().hex

    # Create index
    create_schema_index(session_id=session_id, dsn=dsn.dsn)

    # Insert session only if success
    db.insert_session(session_id, dsn.dsn)

    return {"status": "ok", "session_id": session_id}


# TODO: Add response model
@app.get("/sessions")
async def get_sessions():
    return {
        "status": "ok",
        "sessions": [{"session_id": x[0], "dsn": x[1]} for x in db.get_sessions()],
    }


@app.get("/stream/query")
async def streamed_query(
    session_id: str, query: str, limit: int = 10, execute: bool = False
):
    # Get dsn from session_id
    session = db.get_session(session_id)
    if not session:
        return {"status": "error", "message": "Invalid session_id"}

    request_limit.set(limit)
    request_execute.set(execute)

    # Get query service instance
    if session_id not in query_services:
        schema = db.get_schema_index(session_id)
        query_services[session_id] = StreamingQueryService(
            dsn=session[1], schema_index_file=schema
        )

    # TODO: Would be nice to have our own internal response type to support other LLMs
    response = query_services[session_id].query(query)

    return EventSourceResponse(response)


@app.get("/query")
async def query(session_id: str, query: str, limit: int = 10, execute: bool = False):
    # Get dsn from session_id
    session = db.get_session(session_id)
    if not session:
        return {"status": "error", "message": "Invalid session_id"}

    request_limit.set(limit)
    request_execute.set(execute)

    # Get query service instance
    if session_id not in query_services:
        schema = db.get_schema_index(session_id)
        query_services[session_id] = QueryService(
            dsn=session[1], schema_index_file=schema
        )

    # TODO: Would be nice to have our own internal response type to support other LLMs
    try:
        response = query_services[session_id].query(query)
    except RelatedTablesNotFoundError:
        return {
            "status": "error",
            "message": "Could not find relevant tables in your database from your query",
        }

    if not response.response and execute:
        # TODO: Maybe return query here in addition to error message
        return {"status": "error", "message": "Failed to parse query"}

    sql_query = response.extra_info["sql_query"]
    rendered_sql_query = sql2html(sql_query)

    if not execute:
        return {
            "status": "ok",
            "query": rendered_sql_query,
            "raw_query": sql_query,
            "results": [],
        }

    results = []
    # Add columns as header row
    columns = response.extra_info.get("columns", [])
    results.append(columns)
    # Fill out results (we can also get those from extra_info if clearer)
    for r in response.response:
        results.append(list(r._mapping.values()))

    res = {
        "status": "ok",
        "results": results,
        "query": rendered_sql_query,
        "raw_query": sql_query,
    }
    return Response(
        content=json.dumps(res, cls=AlchemyJSONEncoder), media_type="application/json"
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
