from typing import Type
from uuid import UUID

from sqlalchemy import select

from dataline.models.connection.model import ConnectionModel
from dataline.models.conversation.model import ConversationModel
from dataline.models.message.model import MessageModel
from dataline.models.result.model import ResultModel
from dataline.models.result.schema import ResultCreate, ResultUpdate
from dataline.repositories.base import AsyncSession, BaseRepository


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
