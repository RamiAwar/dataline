import json
import logging
from typing import Annotated
from uuid import UUID

from fastapi import Body, Depends, HTTPException, Response
from pydantic import BaseModel
from pydantic.json import pydantic_encoder
from pygments import lexers
from pygments_pprint_sql import SqlFilter

import db
from app import App
from dataline.repositories.base import AsyncSession, NotFoundError, get_session
from dataline.services.settings import SettingsService
from models import (
    ConversationWithMessagesWithResults,
    Conversation,
    DataResult,
    MessageWithResults,
    Result,
    StatusType,
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

app = App()


@app.get("/healthcheck", response_model_exclude_none=True)
async def healthcheck() -> SuccessResponse[None]:
    return SuccessResponse(status=StatusType.ok)


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


@app.get("/conversation/{conversation_id}")
async def get_conversation(conversation_id: str) -> SuccessResponse[Conversation]:
    return SuccessResponse(status=StatusType.ok, data=db.get_conversation(conversation_id))


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
        try:
            connection = db.get_connection(conn, UUID(connection_id))
        except NotFoundError:
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
        try:
            connection = db.get_connection(conn, UUID(connection_id))
        except NotFoundError:
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
