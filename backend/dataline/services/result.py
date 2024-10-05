import csv
import logging
from datetime import datetime
from io import StringIO
from uuid import UUID

from fastapi import Depends
from fastapi.responses import StreamingResponse

from dataline.errors import ValidationError
from dataline.models.connection.schema import Connection
from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.llm_flow.schema import ChartGenerationResultContent, SQLQueryStringResultContent
from dataline.models.result.schema import ChartRefreshOut, ResultUpdate
from dataline.repositories.base import AsyncSession, NotFoundError
from dataline.repositories.result import ResultRepository
from dataline.services.llm_flow.llm_calls.chart_generator import ChartType
from dataline.services.llm_flow.toolkit import RunException, execute_sql_query, query_run_result_to_chart_json
from dataline.services.llm_flow.utils import DatalineSQLDatabase as SQLDatabase


logger = logging.getLogger(__name__)


class ResultService:
    result_repo: ResultRepository

    def __init__(self, result_repo: ResultRepository = Depends(ResultRepository)) -> None:
        self.result_repo = result_repo

    async def update_sql_query_result_content(
        self, session: AsyncSession, result_id: UUID, sql: str, for_chart: bool
    ) -> ChartRefreshOut | None:
        # Need to validate the SQL run output to ensure it's compatible with the linked chart
        if for_chart:
            try:
                chart_id = await self._validate_chart_sql(session, result_id, sql)
                await self._update_sql(session, result_id, sql)
                return await self.refresh_chart_result_data(session, chart_id)
            except NotFoundError:
                # TODO: Deal with faulty chart generation in a better way
                # Chart generation probably failed, let's let it slide
                pass
        else:
            # Just update sql, no chart involved
            await self._update_sql(session, result_id, sql)

    async def _validate_chart_sql(
        self,
        session: AsyncSession,
        sql_query_string_id: UUID,
        sql: str,
    ) -> UUID:
        linked_chart = await self.result_repo.get_chart_from_sql_query(session, sql_query_string_id)
        chart_content = ChartGenerationResultContent.model_validate_json(linked_chart.content)
        await self.validate_sql_query_result_for_chart(
            session, sql_query_string_id, sql, ChartType[chart_content.chart_type]
        )
        return linked_chart.id

    async def _update_sql(self, session, result_id: UUID, sql: str):
        query_string_result = await self.result_repo.get_by_uuid(session, result_id)

        # Parse json and update content sql (Do not want to ever update for_chart)
        new_content = SQLQueryStringResultContent.model_validate_json(query_string_result.content)
        new_content.sql = sql

        # Dump json and update stored model
        content_dumps = new_content.model_dump_json()
        await self.result_repo.update_by_uuid(session, result_id, ResultUpdate(content=content_dumps))

    async def refresh_chart_result_data(self, session: AsyncSession, chart_id: UUID) -> ChartRefreshOut:
        chart_result = await self.result_repo.get_by_uuid(session, chart_id)
        chart_content = ChartGenerationResultContent.model_validate_json(chart_result.content)
        chart_type = ChartType[chart_content.chart_type]

        # Get linked SQL string result
        if not chart_result.linked_id:
            raise ValueError("Attempting to refresh a chart result without a linked_id")
        sql_query_string_result = await self.result_repo.get_by_uuid(session, chart_result.linked_id)
        sql_string = SQLQueryStringResultContent.model_validate_json(sql_query_string_result.content).sql

        # Get DSN from linked connection
        connection = await self.result_repo.get_connection_from_result(session, chart_id)
        db = SQLDatabase.from_dataline_connection(Connection.model_validate(connection))

        # Refresh chart data
        query_run_data = execute_sql_query(db, sql_string, for_chart=True, chart_type=chart_type)
        updated_chartjs_json = query_run_result_to_chart_json(chart_content.chartjs_json, chart_type, query_run_data)

        # Store updated chart result
        updated_content = ChartGenerationResultContent(
            chartjs_json=updated_chartjs_json, chart_type=chart_content.chart_type
        )
        updated_date = datetime.now()
        await self.result_repo.update_by_uuid(
            session, chart_id, ResultUpdate(created_at=updated_date, content=updated_content.model_dump_json())
        )

        return ChartRefreshOut(chartjs_json=updated_chartjs_json, created_at=updated_date)

    async def validate_sql_query_result_for_chart(
        self, session: AsyncSession, result_id: UUID, sql: str, chart_type: ChartType
    ) -> None:
        # Get DSN from linked connection
        connection = await self.result_repo.get_connection_from_result(session, result_id)
        db = SQLDatabase.from_dataline_connection(Connection.model_validate(connection))

        # Run query to ensure it's compatible with the linked chart
        try:
            execute_sql_query(db, sql, for_chart=True, chart_type=chart_type)
        except RunException:
            # TODO: Modify this based on chart type
            raise ValidationError(
                "New SQL query is not compatible with chart! "
                "Make sure to specify 2 columns, first for labels and second for values."
            )

    async def export_results_as_csv(self, session: AsyncSession, result_id: UUID) -> StreamingResponse:
        # Fetch the SQL_QUERY_STRING_RESULT
        query_string_result = await self.result_repo.get_by_uuid(session, result_id)
        if query_string_result.type != QueryResultType.SQL_QUERY_STRING_RESULT.value:
            raise ValueError("The provided result_id does not belong to an SQL_QUERY_STRING_RESULT")

        # Parse the SQL query from the content
        query_content = SQLQueryStringResultContent.model_validate_json(query_string_result.content)
        sql_query = query_content.sql

        # Get the connection for the result
        connection = await self.result_repo.get_connection_from_result(session, result_id)
        db = SQLDatabase.from_dataline_connection(Connection.model_validate(connection))

        # Create a generator function to stream the results
        async def generate_csv():
            buffer = StringIO()
            writer = csv.writer(buffer)

            # TODO: Figure out how to stream the sql results
            # Execute the query and write results to CSV
            columns, rows = db.custom_run_sql(sql_query)

            # Write header
            writer.writerow(columns)
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)

            # Write data rows
            for row in rows:
                writer.writerow(row)
                if buffer.tell() > 1024 * 1024:  # Yield every ~1MB
                    yield buffer.getvalue()
                    buffer.seek(0)
                    buffer.truncate(0)

            yield buffer.getvalue()  # Yield any remaining data

        # Create and return the StreamingResponse
        response = StreamingResponse(generate_csv(), media_type="text/csv")
        response.headers["Content-Disposition"] = f"attachment; filename=export_{str(result_id)[:5]}.csv"
        return response
