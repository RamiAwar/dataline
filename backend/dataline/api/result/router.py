from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends

from dataline.models.result.schema import ChartRefreshOut
from dataline.old_models import SuccessResponse
from dataline.repositories.base import AsyncSession, get_session
from dataline.services.result import ResultService

router = APIRouter(tags=["results"])


@router.patch("/result/sql/{result_id}")
async def update_sql_query_result(
    result_id: UUID,
    sql: Annotated[str, Body(embed=True)],
    for_chart: Annotated[bool, Body(embed=True)],
    session: AsyncSession = Depends(get_session),
    result_service: ResultService = Depends(ResultService),
) -> SuccessResponse[None | ChartRefreshOut]:
    chart_out = await result_service.update_sql_query_result_content(
        session, result_id=result_id, sql=sql, for_chart=for_chart
    )
    return SuccessResponse(data=chart_out)


@router.patch("/result/chart/{result_id}/refresh")
async def refresh_chart_result_data(
    result_id: UUID,
    session: AsyncSession = Depends(get_session),
    result_service: ResultService = Depends(ResultService),
) -> SuccessResponse[ChartRefreshOut]:
    chart_data = await result_service.refresh_chart_result_data(session, chart_id=result_id)
    return SuccessResponse(data=chart_data)
