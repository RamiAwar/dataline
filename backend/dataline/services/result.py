import logging
from uuid import UUID

from fastapi import Depends
from langchain_community.utilities.sql_database import SQLDatabase

from dataline.models.llm_flow.schema import (
    ChartGenerationResultContent,
    SQLQueryStringResultContent,
)
from dataline.models.result.schema import ChartRefreshOut, ResultOut, ResultUpdate
from dataline.repositories.base import AsyncSession
from dataline.repositories.result import ResultRepository
from dataline.services.llm_flow.llm_calls.chart_generator import ChartType
from dataline.services.llm_flow.toolkit import (
    execute_sql_query,
    query_run_result_to_chart_json,
)

logger = logging.getLogger(__name__)


class ResultService:
    result_repo: ResultRepository

    def __init__(self, result_repo: ResultRepository = Depends(ResultRepository)) -> None:
        self.result_repo = result_repo

    async def update_sql_query_result_content(self, session: AsyncSession, result_id: UUID, sql: str) -> ResultOut:
        query_string_result = await self.result_repo.get_by_uuid(session, result_id)

        # Parse json and update content sql (Do not want to ever update for_chart)
        new_content = SQLQueryStringResultContent.model_validate_json(query_string_result.content)
        new_content.sql = sql

        # Dump json and update stored model
        content_dumps = new_content.model_dump_json()
        result = await self.result_repo.update_by_uuid(session, result_id, ResultUpdate(content=content_dumps))
        return ResultOut.model_validate(result)

    async def refresh_chart_result_data(self, session: AsyncSession, result_id: UUID) -> ChartRefreshOut:
        chart_result = await self.result_repo.get_by_uuid(session, result_id)
        chart_content = ChartGenerationResultContent.model_validate_json(chart_result.content)
        chart_type = ChartType[chart_content.chart_type]

        # Get linked SQL string result
        if not chart_result.linked_id:
            raise ValueError("Attempting to refresh a chart result without a linked_id")
        sql_query_string_result = await self.result_repo.get_by_uuid(session, chart_result.linked_id)
        sql_string = SQLQueryStringResultContent.model_validate_json(sql_query_string_result.content).sql

        # Get DSN from linked connection
        dsn = await self.result_repo.get_dsn_from_result(session, result_id)
        db = SQLDatabase.from_uri(dsn)

        # Refresh chart data
        query_run_data = execute_sql_query(db, sql_string, for_chart=True, chart_type=chart_type)
        updated_chartjs_json = query_run_result_to_chart_json(chart_content.chartjs_json, chart_type, query_run_data)

        # Store updated chart result
        updated_content = ChartGenerationResultContent(
            chartjs_json=updated_chartjs_json, chart_type=chart_content.chart_type
        )
        await self.result_repo.update_by_uuid(
            session, result_id, ResultUpdate(content=updated_content.model_dump_json())
        )

        return ChartRefreshOut(chartjs_json=updated_chartjs_json)
