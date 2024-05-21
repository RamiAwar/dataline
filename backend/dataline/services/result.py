import logging
from uuid import UUID

from fastapi import Depends


from dataline.repositories.base import AsyncSession

from dataline.repositories.result import ResultRepository
from dataline.models.result.schema import ResultOut, ResultUpdate

logger = logging.getLogger(__name__)


class ResultService:
    result_repo: ResultRepository

    def __init__(self, result_repo: ResultRepository = Depends(ResultRepository)) -> None:
        self.result_repo = result_repo

    async def update_result_content(self, session: AsyncSession, result_id: UUID, content: str) -> ResultOut:
        result = await self.result_repo.update_by_uuid(session, result_id, ResultUpdate(content=content))
        return ResultOut.model_validate(result)
