import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from dataline import db
from dataline.models.conversation.schema import (
    ConversationOut,
    ConversationsOut,
    CreateConversationIn,
    UpdateConversationRequest,
)
from dataline.models.llm_flow.schema import QueryOptions
from dataline.old_models import SuccessResponse, UnsavedResult
from dataline.repositories.base import AsyncSession, get_session
from dataline.services.connection import ConnectionService
from dataline.services.conversation import ConversationService
from dataline.services.llm_flow.graph import QueryGraphService
from dataline.services.settings import SettingsService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["conversations"])


@router.get("/conversations")
async def conversations() -> SuccessResponse[ConversationsOut]:
    return SuccessResponse(
        data=ConversationsOut(
            conversations=db.get_conversations_with_messages_with_results(),
        ),
    )


@router.post("/conversation")
async def create_conversation(
    conversation_in: CreateConversationIn,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
) -> SuccessResponse[ConversationOut]:
    conversation = await conversation_service.create_conversation(
        session, connection_id=conversation_in.connection_id, name=conversation_in.name
    )
    return SuccessResponse(
        data=conversation,
    )


@router.patch("/conversation/{conversation_id}")
async def update_conversation(
    conversation_id: UUID,
    conversation_in: UpdateConversationRequest,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
) -> SuccessResponse[ConversationOut]:
    conversation = await conversation_service.update_conversation_name(
        session, conversation_id=conversation_id, name=conversation_in.name
    )
    return SuccessResponse(data=conversation)


@router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: UUID,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
) -> None:
    return await conversation_service.delete_conversation(session, conversation_id)


@router.get("/conversation/{conversation_id}")
async def get_conversation(
    conversation_id: UUID,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
) -> SuccessResponse[ConversationOut]:
    conversation = await conversation_service.get_conversation(session, conversation_id=conversation_id)
    return SuccessResponse(data=conversation)


@router.get("/conversation/{conversation_id}/query", response_model=list[UnsavedResult])
async def query(
    conversation_id: UUID,
    query: str,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
    connection_service: ConnectionService = Depends(ConnectionService),
    settings_service: SettingsService = Depends(SettingsService),
) -> Response:

    conversation = await conversation_service.get_conversation(session, conversation_id=conversation_id)
    connection = await connection_service.get_connection(session, connection_id=conversation.connection_id)

    user_with_model_details = await settings_service.get_model_details(session)
    query_service = QueryGraphService(
        dsn=connection.dsn,
    )

    query_service.query(
        query=query,
        options=QueryOptions(
            openai_api_key=user_with_model_details.openai_api_key.get_secret_value(),  # type: ignore  # Old pydantic version from LC
            model_name=user_with_model_details.preferred_openai_model,
        ),
        history=[],
    )

    # TODO: Store results and final message in database

    return Response()

    #     openai_key = await settings_service.get_openai_api_key(session)
    #     preferred_model = await settings_service.get_preferred_model(session)
    #     query_service = QueryService(connection=connection, openai_api_key=openai_key, model_name=preferred_model)
    #     response = await query_service.query(query, conversation_id=str(conversation_id))
    #     unsaved_results = results_from_query_response(response)

    #     # Save results before executing query if any (without data)
    #     saved_results: list[Result] = []
    #     for result in unsaved_results:
    #         saved_result = db.create_result(result)
    #         saved_results.append(saved_result)

    #     # Add assistant message to message history
    #     saved_message = db.add_message_to_conversation(
    #         str(conversation_id),
    #         response.text,
    #         role="assistant",
    #         results=saved_results,
    #     )

    #     # Execute query if any and fetch data result now
    #     if response.sql:
    #         data = query_service.run_sql(response.sql)
    #         if data.get("result"):
    #             # Convert data to list of rows
    #             rows = [data["columns"]]
    #             rows.extend([x for x in r] for r in data["result"])

    #             unsaved_results.append(
    #                 DataResult(
    #                     type="data",
    #                     content=rows,
    #                 )
    #             )

    #     # Replace saved results with unsaved that include data returned if any
    #     # TODO @Rami this is causing the bookmark button in the frontend to fail when the message is first created because result_id is null.
    #     # TODO maybe append DataResult to saved_message.results instead of replacing it?
    #     saved_message.results = unsaved_results

    #     return Response(
    #         content=json.dumps(
    #             {"status": "ok", "data": {"message": saved_message}},
    #             default=pydantic_encoder,
    #             indent=4,
    #         ),
    #         media_type="application/json",
    #     )
