import logging
from uuid import UUID

from fastapi import Depends

from dataline.models.llm_flow.schema import SQLQueryStringResultContent
from dataline.models.result.schema import ResultOut, ResultUpdate
from dataline.repositories.base import AsyncSession
from dataline.repositories.result import ResultRepository

logger = logging.getLogger(__name__)


class ResultService:
    result_repo: ResultRepository

    def __init__(self, result_repo: ResultRepository = Depends(ResultRepository)) -> None:
        self.result_repo = result_repo

    async def update_sql_query_result_content(self, session: AsyncSession, result_id: UUID, sql: str) -> ResultOut:
        result = await self.result_repo.get_by_uuid(session, result_id)

        # Parse json and update content sql (Do not want to ever update for_chart)
        new_content = SQLQueryStringResultContent.model_validate_json(result.content)
        new_content.sql = sql

        # Dump json and update stored model
        content_dumps = new_content.model_dump_json()
        result = await self.result_repo.update_by_uuid(session, result_id, ResultUpdate(content=content_dumps))
        return ResultOut.model_validate(result)
