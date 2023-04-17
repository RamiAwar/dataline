import ast
import logging
from uuid import uuid4

import sqlparse
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from gpt_index.indices.struct_store import SQLContextContainerBuilder
from llama_index import GPTSimpleVectorIndex, GPTSQLStructStoreIndex, SQLDatabase
from pydantic import BaseModel
from pygments import formatters, highlight, lexers
from pygments_pprint_sql import SqlFilter
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import OperationalError

import db

app = FastAPI()
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)
lexer = lexers.MySqlLexer()
lexer.add_filter(SqlFilter())


@app.exception_handler(Exception)
async def http_exception_handler(request, exc):
    return JSONResponse({"status": "error", "message": str(exc)})


class Dsn(BaseModel):
    dsn: str


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


loaded = None


@app.get("/query")
async def query(session_id: str, query: str):
    global loaded
    if loaded:
        return {"status": "ok", "results": loaded}

    # Get dsn from session_id
    session = db.get_session(session_id)
    if not session:
        return {"status": "error", "message": "Invalid session_id"}

    # Perform query using index
    engine = create_engine(session[1])
    insp = inspect(engine)
    table_names = insp.get_table_names()
    sql_db = SQLDatabase(engine, include_tables=table_names)
    context_builder = SQLContextContainerBuilder(sql_db)
    schema_index_file = db.get_schema_index(session_id)
    table_schema_index = GPTSimpleVectorIndex.load_from_disk(schema_index_file)

    context_builder.query_index_for_context(
        table_schema_index, query, store_context_str=True
    )
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
    results = []

    sql_query = response.extra_info["sql_query"]
    results.append(get_selected_columns(sql_query))
    parsed_results = ast.literal_eval(response.response)
    results.extend(parsed_results)

    loaded = results
    return {"status": "ok", "results": results}


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
