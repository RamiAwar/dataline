import logging
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from dataline.config import config
from dataline.models.connection.schema import (
    DB_SAMPLES,
    ConnectionOut,
    ConnectionUpdateIn,
    ConnectRequest,
    ConnectSampleIn,
    FileConnectionType,
    GetConnectionOut,
    SampleOut,
)
from dataline.old_models import SuccessListResponse, SuccessResponse
from dataline.repositories.base import AsyncSession, get_session
from dataline.services.connection import ConnectionService
from dataline.utils.utils import get_sqlite_dsn, is_valid_sqlite_file

logger = logging.getLogger(__name__)

router = APIRouter(tags=["connections"])


@router.post("/connect", response_model_exclude_none=True)
async def connect_db(
    req: ConnectRequest,
    session: AsyncSession = Depends(get_session),
    connection_service: ConnectionService = Depends(ConnectionService),
) -> SuccessResponse[ConnectionOut]:
    connection = await connection_service.create_connection(session, dsn=req.dsn, name=req.name, is_sample=False)
    return SuccessResponse(data=connection)


@router.post("/connect/sample", response_model_exclude_none=True)
async def connect_sample_db(
    req: ConnectSampleIn,
    session: AsyncSession = Depends(get_session),
    connection_service: ConnectionService = Depends(ConnectionService),
) -> SuccessResponse[ConnectionOut]:
    # Identify sample, copy file in, then create connection
    sample = DB_SAMPLES[req.sample_name.value]

    # Copy file to user data directory and create connection
    sample_path = sample[1]
    with open(sample_path, "rb") as f:
        connection = await connection_service.create_sqlite_connection(
            session, file=f, name=req.connection_name, is_sample=True
        )
    return SuccessResponse(data=connection)


@router.post("/connect/file")
async def connect_db_from_file(
    file: UploadFile,
    type: FileConnectionType = Body(...),
    name: str = Body(...),
    session: AsyncSession = Depends(get_session),
    connection_service: ConnectionService = Depends(ConnectionService),
) -> SuccessResponse[ConnectionOut]:
    # Validate file type - currently only sqlite supported
    if type == FileConnectionType.sqlite:
        if not is_valid_sqlite_file(file):
            raise HTTPException(status_code=400, detail="File provided must be a valid SQLite file.")

        connection = await connection_service.create_sqlite_connection(session, file.file, name)
        return SuccessResponse(data=connection)

    elif type == FileConnectionType.csv:
        # Convert CSV to SQLite and create connection
        # TODO: Handle pandas invalid CSV error and forward to user
        connection = await connection_service.create_csv_connection(session, file, name)
        return SuccessResponse(data=connection)

    elif type == FileConnectionType.sas7bdat:
        # Convert sas7bdat to SQLite and create connection
        # TODO: Handle pandas invalid sas7bdat error and forward to user
        connection = await connection_service.create_sas7bdat_connection(session, file, name)
        return SuccessResponse(data=connection)

    elif type == FileConnectionType.excel:
        # Convert Excel to SQLite and create connection
        # TODO: Handle possible errors and forward
        connection = await connection_service.create_excel_connection(session, file, name)
        return SuccessResponse(data=connection)


@router.get("/connection/{connection_id}")
async def get_connection(
    connection_id: UUID,
    session: AsyncSession = Depends(get_session),
    connection_service: ConnectionService = Depends(ConnectionService),
) -> SuccessResponse[ConnectionOut]:
    connection = await connection_service.get_connection(session, connection_id)
    return SuccessResponse(
        data=connection,
    )


class ConnectionsOut(BaseModel):
    connections: list[ConnectionOut]


# TODO: Simplify output structure
@router.get("/connections")
async def get_connections(
    session: AsyncSession = Depends(get_session),
    connection_service: ConnectionService = Depends(ConnectionService),
) -> SuccessResponse[ConnectionsOut]:
    connections = await connection_service.get_connections(session)
    return SuccessResponse(
        data=ConnectionsOut(
            connections=connections,
        ),
    )


@router.delete("/connection/{connection_id}")
async def delete_connection(
    connection_id: UUID,
    connection_service: ConnectionService = Depends(ConnectionService),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[None]:
    await connection_service.delete_connection(session, connection_id)
    return SuccessResponse()


@router.patch("/connection/{connection_id}")
async def update_connection(
    connection_id: UUID,
    req: ConnectionUpdateIn,
    session: AsyncSession = Depends(get_session),
    connection_service: ConnectionService = Depends(ConnectionService),
) -> SuccessResponse[GetConnectionOut]:
    updated_connection = await connection_service.update_connection(session, connection_id, req)

    # TODO: Simplify output structure here and on FE
    return SuccessResponse(
        data=GetConnectionOut(
            connection=updated_connection,
        ),
    )


@router.get("/samples")
async def get_sample_connections() -> SuccessListResponse[SampleOut]:
    return SuccessListResponse(
        data=[
            SampleOut(key=key, title=sample[0], file=get_sqlite_dsn(sample[1]), link=sample[2])
            for key, sample in DB_SAMPLES.items()
        ]
    )
