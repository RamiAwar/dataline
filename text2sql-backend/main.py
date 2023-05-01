import argparse
import json
import logging
import os
from datetime import date
from decimal import Decimal
from uuid import uuid4

import sqlparse
import uvicorn
from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from gpt_index.indices.struct_store import SQLContextContainerBuilder
from llama_index import GPTSimpleVectorIndex, GPTSQLStructStoreIndex, SQLDatabase
from pydantic import BaseModel
from pygments import formatters, highlight, lexers
from pygments_pprint_sql import SqlFilter
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import DeclarativeMeta

import db
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
        logger.error(e)
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
    db.insert_session(session_id, dsn.dsn)
    # Create index
    create_schema_index(session_id)
    return {"status": "ok", "session_id": session_id}


# TODO: Add response model
@app.get("/sessions")
async def get_sessions():
    return {
        "status": "ok",
        "sessions": [{"session_id": x[0], "dsn": x[1]} for x in db.get_sessions()],
    }


@app.get("/query")
async def query(session_id: str, query: str, limit: int = 10, execute: bool = False):
    global loaded
    # if loaded:
    #     return loaded

    # Get dsn from session_id
    session = db.get_session(session_id)
    if not session:
        return {"status": "error", "message": "Invalid session_id"}

    request_limit.set(limit)
    request_execute.set(execute)

    # Perform query using index
    engine = create_engine(session[1])
    insp = inspect(engine)
    table_names = insp.get_table_names()
    sql_db = CustomSQLDatabase(engine, include_tables=table_names)
    context_builder = SQLContextContainerBuilder(sql_db)
    schema_index_file = db.get_schema_index(session_id)
    table_schema_index = GPTSimpleVectorIndex.load_from_disk(schema_index_file)

    query_index = GPTSQLStructStoreIndex(
        [],
        sql_database=sql_db,
        table_name=table_names,
    )

    # query the table schema index using the helper method
    # to retrieve table context
    context_builder.query_index_for_context(
        index=table_schema_index, query_str=query, store_context_str=True
    )
    context_container = context_builder.build_context_container()

    # query the SQL index with the table context
    response = query_index.query(query, sql_context_container=context_container)
    if not response.response and execute:
        # TODO: REmove
        loaded = {"status": "error", "message": "Failed to parse query"}
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
    results.append(get_selected_columns(sql_query))
    for r in response.response:
        results.append(list(r._mapping.values()))

    res = {
        "status": "ok",
        "results": results,
        "query": rendered_sql_query,
        "raw_query": sql_query,
    }
    loaded = Response(
        content=json.dumps(res, cls=AlchemyJSONEncoder), media_type="application/json"
    )
    return Response(
        content=json.dumps(res, cls=AlchemyJSONEncoder), media_type="application/json"
    )


def create_schema_index(session_id: str):
    # Get dsn from session_id
    session = db.get_session(session_id)
    if not session:
        return {"status": "error", "message": "Invalid session_id"}

    # Create index for DB schema
    engine = create_engine(session[1])
    insp = inspect(engine)
    table_names = insp.get_table_names()
    sql_db = SQLDatabase(engine, include_tables=table_names)

    # build a vector index from the table schema information
    context_builder = SQLContextContainerBuilder(sql_db)
    table_schema_index = context_builder.derive_index_from_context(GPTSimpleVectorIndex)

    # save the index to disk
    schema_index_name = f"{session_id}_schema_index.json"
    table_schema_index.save_to_disk(schema_index_name)

    # Mark session_id as indexed
    db.insert_schema_index(session_id, schema_index_name)

    return {"status": "ok"}


def sql2html(sql) -> str:
    return highlight(sql, lexer, formatters.HtmlFormatter())


def get_selected_columns(query):
    tokens = sqlparse.parse(query)[0].tokens
    found_select = False
    for token in tokens:
        if found_select:
            if isinstance(token, sqlparse.sql.IdentifierList):
                return [
                    col.value.split(" ")[-1].strip("`").rpartition(".")[-1]
                    for col in token.tokens
                    if isinstance(col, sqlparse.sql.Identifier)
                ]
        else:
            found_select = token.match(
                sqlparse.tokens.Keyword.DML, ["select", "SELECT"]
            )
    return []


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
