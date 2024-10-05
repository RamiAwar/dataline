from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, BackgroundTasks, HTTPException, Request
from fastapi.responses import StreamingResponse

from dataline.models.result.schema import ChartRefreshOut
from dataline.old_models import SuccessResponse
from dataline.repositories.base import AsyncSession, get_session
from dataline.services.result import ResultService
from dataline.utils.posthog import posthog_capture

router = APIRouter(tags=["results"])


@router.patch("/result/sql/{result_id}")
async def update_sql_query_result(
    result_id: UUID,
    sql: Annotated[str, Body(embed=True)],
    for_chart: Annotated[bool, Body(embed=True)],
    session: Annotated[AsyncSession, Depends(get_session)],
    result_service: Annotated[ResultService, Depends(ResultService)],
    background_tasks: BackgroundTasks,
) -> SuccessResponse[None | ChartRefreshOut]:
    background_tasks.add_task(posthog_capture, "sql_updated")

    chart_out = await result_service.update_sql_query_result_content(
        session, result_id=result_id, sql=sql, for_chart=for_chart
    )
    return SuccessResponse(data=chart_out)


@router.patch("/result/chart/{result_id}/refresh")
async def refresh_chart_result_data(
    result_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    result_service: Annotated[ResultService, Depends(ResultService)],
    background_tasks: BackgroundTasks,
) -> SuccessResponse[ChartRefreshOut]:
    background_tasks.add_task(posthog_capture, "chart_refreshed")
    chart_data = await result_service.refresh_chart_result_data(session, chart_id=result_id)
    return SuccessResponse(data=chart_data)


@router.get("/result/{result_id}/export")
async def export_results(
    result_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    result_service: Annotated[ResultService, Depends(ResultService)],
    background_tasks: BackgroundTasks,
) -> StreamingResponse:
    background_tasks.add_task(posthog_capture, "results_exported")
    try:
        return await result_service.export_results_as_csv(session, result_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/result/{result_id}/export-url")
async def export_csv_url(request: Request, result_id: UUID) -> SuccessResponse[str]:
    # TODO: Do we need URL signing in any case? Seems to be automatically working fine with cookies
    url = str(request.url_for("export_results", result_id=result_id))
    # TODO: validate that we can get the results given this result_id to prevent HTTPException in other page
    return SuccessResponse(data=url)
