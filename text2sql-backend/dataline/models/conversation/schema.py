from datetime import datetime
from typing import TYPE_CHECKING, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.llm_flow.schema import SelectedTablesResult, SQLQueryStringResult
from dataline.models.message.schema import MessageOut, MessageWithResultsOut
from dataline.models.result.model import ResultModel
from dataline.models.result.schema import ResultOut
from dataline.old_models import ConversationWithMessagesWithResults

if TYPE_CHECKING:
    from dataline.models.conversation.model import ConversationModel


class ConversationsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    conversations: list[ConversationWithMessagesWithResults]


class CreateConversationIn(BaseModel):
    connection_id: UUID
    name: str


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    connection_id: UUID
    name: str
    created_at: datetime


class UpdateConversationRequest(BaseModel):
    name: str


def render_stored_results(results: list[ResultModel]) -> list[ResultOut]:
    rendered_results = []
    for result in results:
        if result.type not in QueryResultType.__members__:
            raise ValueError(f"Invalid result type found in DB: {result.type}")

        if QueryResultType(result.type) == QueryResultType.SQL_QUERY_STRING_RESULT:
            rendered_results.append(SQLQueryStringResult.deserialize(result).serialize_result())
        elif QueryResultType(result.type) == QueryResultType.SELECTED_TABLES:
            rendered_results.append(SelectedTablesResult.deserialize(result).serialize_result())

    return rendered_results


class ConversationWithMessagesWithResultsOut(ConversationOut):
    model_config = ConfigDict(from_attributes=True)

    messages: list[MessageWithResultsOut]

    @classmethod
    def from_conversation(cls, conversation: "ConversationModel") -> Self:
        messages: list[MessageWithResultsOut] = []
        for message in conversation.messages:
            results = render_stored_results(message.results)
            messages.append(MessageWithResultsOut(message=MessageOut.model_validate(message), results=results))

        return cls(
            id=conversation.id,
            connection_id=conversation.connection_id,
            name=conversation.name,
            created_at=conversation.created_at,
            messages=messages,
        )
