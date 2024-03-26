import json
import logging
import re
from typing import Annotated, Awaitable, Callable

from fastapi import (
    Body,
    Depends,
    FastAPI,
    HTTPException,
    Request,
    Response,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from pydantic.json import pydantic_encoder
from pygments import lexers
from pygments_pprint_sql import SqlFilter
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

import db
from dataline.api.settings.router import router as settings_router
from dataline.config import config
from dataline.repositories.base import AsyncSession, NotFoundError, get_session
from dataline.services.settings import SettingsService
from dataline.utils import get_sqlite_dsn
from models import (
    Connection,
    ConversationWithMessagesWithResults,
    DataResult,
    MessageWithResults,
    Result,
    StatusType,
    SuccessResponse,
    TableSchema,
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


async def catch_exceptions_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    try:
        return await call_next(request)
    except NotFoundError as e:
        # No need to log these, expected errors
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"message": e.message})
    except Exception as e:
        # Log for collection
        logger.exception(e)
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"message": str(e)})


app.middleware("http")(catch_exceptions_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectRequest(BaseModel):
    dsn: str = Field(min_length=3)
    name: str

    @validator("dsn")
    def validate_dsn_format(cls, value: str) -> str:
        # Define a regular expression to match the DSN format
        dsn_regex = r"^[\w\+]+:\/\/[\w-]+:\w+@[\w.-]+[:\d]*\/\w+$"

        if not re.match(dsn_regex, value):
            raise ValueError(
                'Invalid DSN format. The expected format is "driver://username:password@host:port/database".'
            )

        return value


app.include_router(settings_router)


@app.get("/healthcheck", response_model_exclude_none=True)
async def healthcheck() -> SuccessResponse[None]:
    return SuccessResponse(status=StatusType.ok)


def create_db_connection(dsn: str, name: str) -> SuccessResponse[dict[str, str]]:
    try:
        engine = create_engine(dsn)
        with engine.connect():
            pass
    except OperationalError as exc:
        # Try again replacing localhost with host.docker.internal to connect with DBs running in docker
        if "localhost" in dsn:
            dsn = dsn.replace("localhost", "host.docker.internal")
            try:
                engine = create_engine(dsn)
                with engine.connect():
                    pass
            except OperationalError as e:
                logger.error(e)
                raise HTTPException(status_code=404, detail="Failed to connect to database")
        else:
            logger.error(exc)
            raise HTTPException(status_code=404, detail="Failed to connect to database")

    # Check if connection with DSN already exists, then return connection_id
    try:
        existing_connection = db.get_connection_from_dsn(dsn)
        if existing_connection:
            return SuccessResponse(
                status=StatusType.ok,
                data={
                    "connection_id": existing_connection.id,
                },
            )

    except NotFoundError:
        pass

    # Insert connection only if success
    dialect = engine.url.get_dialect().name
    database = engine.url.database

    if not database:
        raise Exception("Invalid DSN. Database name is required.")

    with db.DatabaseManager() as conn:
        connection_id = db.create_connection(
            conn,
            dsn,
            database=database,
            name=name,
            dialect=dialect,
        )

        SchemaService.create_or_update_tables(conn, connection_id)
        conn.commit()  # only commit if all step were successful

    return SuccessResponse(
        status=StatusType.ok,
        data={
            "connection_id": connection_id,
            "database": database,
            "dialect": dialect,
        },
    )


@app.post("/create-sample-db")
async def create_sample_db() -> SuccessResponse[dict[str, str]]:
    name = "DVD Rental (Sample)"
    dsn = get_sqlite_dsn(config.sample_postgres_path)
    return create_db_connection(dsn, name)


@app.post("/connect", response_model_exclude_none=True)
async def connect_db(req: ConnectRequest) -> SuccessResponse[dict[str, str]]:
    return create_db_connection(req.dsn, req.name)


class ConnectionsOut(BaseModel):
    connections: list[Connection]


@app.get("/connections")
async def get_connections() -> SuccessResponse[ConnectionsOut]:
    return SuccessResponse(
        status=StatusType.ok,
        data=ConnectionsOut(
            connections=db.get_connections(),
        ),
    )


class TableSchemasOut(BaseModel):
    tables: list[TableSchema]


@app.get("/connection/{connection_id}/schemas")
async def get_table_schemas(connection_id: str) -> SuccessResponse[TableSchemasOut]:
    # Check for connection existence
    with db.DatabaseManager() as conn:
        connection = db.get_connection(conn, connection_id)
        if not connection:
            raise HTTPException(status_code=404, detail="Invalid connection_id")

        return SuccessResponse(
            status=StatusType.ok,
            data=TableSchemasOut(
                tables=db.get_table_schemas_with_descriptions(connection_id),
            ),
        )


@app.patch("/schemas/table/{table_id}")
async def update_table_schema_description(
    table_id: str, description: Annotated[str, Body(embed=True)]
) -> dict[str, str]:
    with db.DatabaseManager() as conn:
        db.update_schema_table_description(conn, table_id=table_id, description=description)
        conn.commit()

    return {"status": "ok"}


@app.patch("/schemas/field/{field_id}")
async def update_table_schema_field_description(
    field_id: str, description: Annotated[str, Body(embed=True)]
) -> dict[str, str]:
    with db.DatabaseManager() as conn:
        db.update_schema_table_field_description(conn, field_id=field_id, description=description)
        conn.commit()

    return {"status": "ok"}


class ConnectionOut(BaseModel):
    connection: Connection


@app.get("/connection/{connection_id}")
async def get_connection(connection_id: str) -> SuccessResponse[ConnectionOut]:
    with db.DatabaseManager() as conn:
        return SuccessResponse(
            status=StatusType.ok,
            data=ConnectionOut(
                connection=db.get_connection(conn, connection_id),
            ),
        )


@app.patch("/connection/{connection_id}")
async def update_connection(connection_id: str, req: UpdateConnectionRequest) -> SuccessResponse[ConnectionOut]:
    # Try to connect to provided dsn
    try:
        engine = create_engine(req.dsn)
        with engine.connect():
            pass
    except OperationalError as e:
        logger.error(e)
        raise HTTPException(status_code=400, detail="Failed to connect to database")

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

    return SuccessResponse(
        status=StatusType.ok,
        data=ConnectionOut(
            connection=Connection(
                id=connection_id,
                dsn=req.dsn,
                database=database,
                name=req.name,
                dialect=dialect,
            ),
        ),
    )


class ConversationsOut(BaseModel):
    conversations: list[ConversationWithMessagesWithResults]


@app.get("/conversations")
async def conversations() -> SuccessResponse[ConversationsOut]:
    return SuccessResponse(
        status=StatusType.ok,
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
        status=StatusType.ok,
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


class ListMessageOut(BaseModel):
    messages: list[MessageWithResults]


@app.get("/messages")
async def messages(conversation_id: str) -> SuccessResponse[ListMessageOut]:
    # Will raise error that's auto captured by middleware if not exists
    db.get_conversation(conversation_id)

    return SuccessResponse(
        status=StatusType.ok,
        data=ListMessageOut(
            messages=db.get_messages_with_results(conversation_id),
        ),
    )


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
        connection = db.get_connection(conn, connection_id)
        if not connection:
            raise HTTPException(status_code=404, detail="Invalid connection_id")

        openai_key = await settings_service.get_openai_api_key(session)
        query_service = QueryService(connection, openai_api_key=openai_key)

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
        connection = db.get_connection(conn, connection_id)
        if not connection:
            raise HTTPException(status_code=404, detail="Invalid connection_id")

        openai_key = await settings_service.get_openai_api_key(session)
        query_service = QueryService(connection=connection, openai_api_key=openai_key, model_name="gpt-3.5-turbo")
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
