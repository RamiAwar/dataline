import logging
from uuid import uuid4

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from gpt_index import GPTSimpleVectorIndex, GPTSQLStructStoreIndex, SQLDatabase
from gpt_index.indices.struct_store import SQLContextContainerBuilder
from llama_index import SQLDatabase
from pydantic import BaseModel
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import OperationalError

import db

app = FastAPI()

logger = logging.getLogger(__name__)


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

    # If connection is successful, return a session hash
    session_id = uuid4().hex
    db.insert_session(session_id, dsn.dsn)

    # DO NOT create index yet, let's wait for first query

    return {"status": "ok", "session_id": session_id}


@app.get("/sessions")
async def get_sessions():
    return {"status": "ok", "sessions": db.get_sessions()}


@app.get("/query")
async def query(session_id: str, query: str):
    # Get dsn from session_id
    session = db.get_session(session_id)
    if not session:
        return {"status": "error", "message": "Invalid session_id"}

    # Check if session_id already has DB schema index
    if not db.session_is_indexed(session_id):
        create_schema_index(session_id)

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

    return {"status": "ok", "result": response}


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
