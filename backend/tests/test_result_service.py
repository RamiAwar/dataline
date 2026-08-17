from datetime import datetime
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.llm_flow.schema import QueryRunData, SQLQueryRunResultContent
from dataline.models.message.schema import BaseMessageType, MessageCreate, MessageOptions
from dataline.models.result.schema import ResultCreate
from dataline.models.conversation.schema import ConversationOut
from dataline.repositories.base import AsyncSession, NotFoundError
from dataline.repositories.message import MessageRepository
from dataline.repositories.result import ResultRepository
from dataline.services.result import ResultService


def query_run_data() -> QueryRunData:
    return QueryRunData(columns=["count"], rows=[[3]])


def test_run_sql_route_uses_post(client: TestClient) -> None:
    operations = client.app.openapi()["paths"]["/conversation/{conversation_id}/run-sql"]

    assert "post" in operations
    assert "get" not in operations


@pytest.mark.asyncio
async def test_upsert_sql_run_result_creates_first_persisted_run() -> None:
    conversation_id = uuid4()
    query_id = uuid4()
    message_id = uuid4()
    repository = AsyncMock(spec=ResultRepository)
    repository.get_by_uuid.return_value = Mock(
        id=query_id,
        message_id=message_id,
        type=QueryResultType.SQL_QUERY_STRING_RESULT.value,
    )
    repository.get_run_from_sql_query.side_effect = NotFoundError("missing")
    repository.get_message_from_result.return_value = Mock(
        conversation_id=conversation_id, options={"secure_data": True}
    )
    stored = Mock()
    repository.create.return_value = stored

    service = ResultService(result_repo=repository)
    result = await service.upsert_sql_run_result(  # type: ignore[arg-type]
        None, conversation_id, query_id, query_run_data()
    )

    assert result is stored
    create = repository.create.await_args.args[1]
    assert create.message_id == message_id
    assert create.linked_id == query_id
    assert create.type == QueryResultType.SQL_QUERY_RUN_RESULT.value
    content = SQLQueryRunResultContent.model_validate_json(create.content)
    assert content.data.columns == ["count"]
    assert content.data.rows == [[3]]
    assert content.is_secure is True
    assert content.for_chart is False


@pytest.mark.asyncio
async def test_upsert_sql_run_result_updates_existing_run() -> None:
    conversation_id = uuid4()
    query_id = uuid4()
    run_id = uuid4()
    repository = AsyncMock(spec=ResultRepository)
    repository.get_by_uuid.return_value = Mock(
        id=query_id,
        message_id=uuid4(),
        type=QueryResultType.SQL_QUERY_STRING_RESULT.value,
    )
    repository.get_run_from_sql_query.return_value = Mock(
        id=run_id,
        content=SQLQueryRunResultContent(
            data=QueryRunData(columns=["old"], rows=[[1]]),
            is_secure=True,
            for_chart=False,
        ).model_dump_json(),
    )
    repository.get_message_from_result.return_value = Mock(
        conversation_id=conversation_id, options={"secure_data": False}
    )
    stored = Mock()
    repository.update_by_uuid.return_value = stored

    service = ResultService(result_repo=repository)
    result = await service.upsert_sql_run_result(  # type: ignore[arg-type]
        None, conversation_id, query_id, query_run_data()
    )

    assert result is stored
    record_id = repository.update_by_uuid.await_args.args[1]
    update = repository.update_by_uuid.await_args.args[2]
    assert record_id == run_id
    assert isinstance(update.created_at, datetime)
    content = SQLQueryRunResultContent.model_validate_json(update.content)
    assert content.data.rows == [[3]]
    assert content.is_secure is True
    repository.create.assert_not_awaited()
    repository.get_message_from_result.assert_awaited_once()


@pytest.mark.asyncio
async def test_upsert_sql_run_result_rejects_non_query_parent() -> None:
    query_id = uuid4()
    repository = AsyncMock(spec=ResultRepository)
    repository.get_by_uuid.return_value = Mock(
        id=query_id,
        message_id=uuid4(),
        type=QueryResultType.CHART_GENERATION_RESULT.value,
    )

    service = ResultService(result_repo=repository)
    with pytest.raises(ValueError, match="SQL_QUERY_STRING_RESULT"):
        await service.upsert_sql_run_result(None, uuid4(), query_id, query_run_data())  # type: ignore[arg-type]

    repository.get_run_from_sql_query.assert_not_awaited()


@pytest.mark.asyncio
async def test_upsert_sql_run_result_rejects_cross_conversation_parent() -> None:
    query_id = uuid4()
    repository = AsyncMock(spec=ResultRepository)
    repository.get_by_uuid.return_value = Mock(
        id=query_id,
        message_id=uuid4(),
        type=QueryResultType.SQL_QUERY_STRING_RESULT.value,
    )
    repository.get_message_from_result.return_value = Mock(conversation_id=uuid4(), options={"secure_data": False})

    service = ResultService(result_repo=repository)
    with pytest.raises(ValueError, match="does not belong"):
        await service.upsert_sql_run_result(None, uuid4(), query_id, query_run_data())  # type: ignore[arg-type]

    repository.get_run_from_sql_query.assert_not_awaited()


@pytest.mark.asyncio
async def test_upsert_sql_run_result_is_visible_after_database_reload(
    session: AsyncSession,
    sample_conversation: ConversationOut,
) -> None:
    message_repo = MessageRepository()
    result_repo = ResultRepository()
    message = await message_repo.create(
        session,
        MessageCreate(
            role=BaseMessageType.AI.value,
            content="query",
            conversation_id=sample_conversation.id,
            options=MessageOptions(secure_data=True),
        ),
    )
    query = await result_repo.create(
        session,
        ResultCreate(
            content='{"sql":"select 2","for_chart":false}',
            type=QueryResultType.SQL_QUERY_STRING_RESULT.value,
            message_id=message.id,
        ),
    )
    old_run = await result_repo.create(
        session,
        ResultCreate(
            content=SQLQueryRunResultContent(
                data=QueryRunData(columns=["value"], rows=[[1]]),
                is_secure=True,
                for_chart=False,
            ).model_dump_json(),
            type=QueryResultType.SQL_QUERY_RUN_RESULT.value,
            message_id=message.id,
            linked_id=query.id,
        ),
    )

    service = ResultService(result_repo=result_repo)
    persisted = await service.upsert_sql_run_result(
        session,
        sample_conversation.id,
        query.id,
        QueryRunData(columns=["value"], rows=[[2]]),
    )
    old_run_id = old_run.id
    persisted_id = persisted.id
    session.expire_all()
    reloaded = await result_repo.get_by_uuid(session, old_run_id)
    content = SQLQueryRunResultContent.model_validate_json(reloaded.content)

    assert persisted_id == old_run_id
    assert content.data.rows == [[2]]
    assert content.is_secure is True
