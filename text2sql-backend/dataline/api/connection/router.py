import logging
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from dataline.config import config
from dataline.models.connection.schema import (
    ConnectionOut,
    ConnectionUpdateIn,
    ConnectRequest,
    GetConnectionOut,
    SampleOut,
)
from dataline.old_models import SuccessListResponse, SuccessResponse
from dataline.repositories.base import AsyncSession, get_session
from dataline.services.connection import ConnectionService
from dataline.utils.utils import (
    generate_short_uuid,
    get_sqlite_dsn,
    is_valid_sqlite_file,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["connections"])


@router.post("/connect", response_model_exclude_none=True)
async def connect_db(
    req: ConnectRequest,
    session: AsyncSession = Depends(get_session),
    connection_service: ConnectionService = Depends(),
) -> SuccessResponse[ConnectionOut]:
    connection = await connection_service.create_connection(
        session, dsn=req.dsn, name=req.name, is_sample=req.is_sample
    )
    return SuccessResponse(data=connection)


@router.post("/connect/file")
async def connect_db_from_file(
    file: UploadFile,
    name: str = Body(...),
    session: AsyncSession = Depends(get_session),
    connection_service: ConnectionService = Depends(),
) -> SuccessResponse[ConnectionOut]:
    # Validate file type - currently only sqlite supported
    if not is_valid_sqlite_file(file):
        raise HTTPException(status_code=400, detail="File provided must be a valid SQLite file.")

    # Create data directory if not exists
    Path(config.data_directory).mkdir(parents=True, exist_ok=True)

    # Store file in data directory
    generated_name = generate_short_uuid() + ".sqlite"
    file_path = Path(config.data_directory) / generated_name
    with file_path.open("wb") as f:
        f.write(file.file.read())

    # Create connection with the locally copied file
    dsn = get_sqlite_dsn(str(file_path.absolute()))
    connection = await connection_service.create_connection(session, dsn=dsn, name=name, is_sample=False)
    return SuccessResponse(data=connection)


@router.get("/connection/{connection_id}")
async def get_connection(
    connection_id: UUID,
    session: AsyncSession = Depends(get_session),
    connection_service: ConnectionService = Depends(),
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
    connection_service: ConnectionService = Depends(),
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
    connection_service: ConnectionService = Depends(),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[None]:
    await connection_service.delete_connection(session, connection_id)
    return SuccessResponse()


@router.patch("/connection/{connection_id}")
async def update_connection(
    connection_id: UUID,
    req: ConnectionUpdateIn,
    session: AsyncSession = Depends(get_session),
    connection_service: ConnectionService = Depends(),
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
    samples = [
        (
            "Dvd Rental",
            config.sample_dvdrental_path,
            "https://www.postgresqltutorial.com/postgresql-getting-started/postgresql-sample-database/",
        ),
        ("Netflix Shows", config.sample_netflix_path, "https://www.kaggle.com/datasets/shivamb/netflix-shows"),
        ("Titanic", config.sample_titanic_path, "https://www.kaggle.com/datasets/ibrahimelsayed182/titanic-dataset"),
    ]
    return SuccessListResponse(
        data=[SampleOut(title=sample[0], file=get_sqlite_dsn(sample[1]), link=sample[2]) for sample in samples]
    )
