from typing import Type
from uuid import UUID

from sqlalchemy import select

from dataline.models.connection.model import ConnectionModel
from dataline.models.conversation.model import ConversationModel
from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.message.model import MessageModel
from dataline.models.result.model import ResultModel
from dataline.models.result.schema import ResultCreate, ResultUpdate
from dataline.repositories.base import AsyncSession, BaseRepository, NotFoundError


class ResultRepository(BaseRepository[ResultModel, ResultCreate, ResultUpdate]):
    @property
    def model(self) -> Type[ResultModel]:
        return ResultModel

    async def get_dsn_from_result(self, session: AsyncSession, result_id: UUID) -> str:
        query = (
            select(ConnectionModel.dsn)
            .join(ConversationModel)
            .join(MessageModel)
            .join(ResultModel)
            .where(ResultModel.id == result_id)
        )
        result = await session.execute(query)
        dsn = result.fetchone()
        if not dsn:
            raise ValueError(f"Could not find DSN for result_id: {result_id}")

        return dsn[0]

    async def get_chart_from_sql_query(self, session: AsyncSession, sql_string_result_id: UUID) -> ResultModel:
        query = (
            select(ResultModel)
            .filter_by(linked_id=sql_string_result_id)  # Find all linked results to this result
            .filter(ResultModel.type == QueryResultType.CHART_GENERATION_RESULT.value)  # Filter on charts only
        )
        result = await session.execute(query)
        chart = result.fetchone()
        if not chart:
            raise NotFoundError(f"Could not find chart for result_id: {sql_string_result_id}")

        return chart[0]
