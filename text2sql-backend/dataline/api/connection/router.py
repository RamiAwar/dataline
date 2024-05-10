import logging
import re
from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, HTTPException, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

import dataline.db as db
from dataline.config import config
from dataline.models.connection.schema import (
    ConnectionOut,
    GetConnectionOut,
    SampleOut,
    TableSchemasOut,
)
from dataline.old_models import (
    SuccessListResponse,
    SuccessResponse,
    UpdateConnectionRequest,
)
from dataline.old_services import SchemaService
from dataline.repositories.base import NotFoundError, NotUniqueError
from dataline.utils.utils import (
    generate_short_uuid,
    get_sqlite_dsn,
    is_valid_sqlite_file,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["connections"])


def create_db_connection(dsn: str, name: str, is_sample: bool = False) -> SuccessResponse[ConnectionOut]:
    try:
        engine = create_engine(dsn)
        with engine.connect():
            pass
    except OperationalError as exc:
        # Try again replacing localhost with host.docker.internal to connect with DBs running in docker
        if "localhost" in dsn:
            dsn = dsn.replace("localhost", "host.docker.internal")
            try:
                engine = create_engine(dsn)
                with engine.connect():
                    pass
            except OperationalError as e:
                logger.error(e)
                raise HTTPException(status_code=500, detail="Failed to connect to database, please check your DSN.")
        else:
            logger.error(exc)
            raise HTTPException(status_code=500, detail="Failed to connect to database, please check your DSN.")

    # Check if connection with DSN already exists, then return connection_id
    try:
        existing_connection = db.get_connection_from_dsn(dsn)
        if existing_connection:
            raise NotUniqueError("Connection already exists.")
    except NotFoundError:
        pass

    # Insert connection only if success
    dialect = engine.url.get_dialect().name
    database = engine.url.database

    if not database:
        raise HTTPException(status_code=400, detail="Invalid DSN. Database name is missing, append '/DBNAME'.")

    with db.DatabaseManager() as conn:
        connection_id = db.create_connection(
            conn,
            dsn,
            database=database,
            name=name,
            dialect=dialect,
            is_sample=is_sample,
        )

        SchemaService.create_or_update_tables(conn, connection_id)
        conn.commit()  # only commit if all step were successful

    return SuccessResponse(
        data=ConnectionOut(
            id=connection_id, dsn=dsn, database=database, dialect=dialect, name=name, is_sample=is_sample
        ),
    )


class ConnectRequest(BaseModel):
    dsn: str = Field(min_length=3)
    name: str
    is_sample: bool = False

    @field_validator("dsn")
    def validate_dsn_format(cls, value: str) -> str:
        # Regular expression pattern for matching DSNs
        # Try sqlite first
        sqlite_pattern = r"^sqlite://(/.+?)(:(.+))?$"
        if re.match(sqlite_pattern, value):
            return value

        dsn_pattern = (
            r"^(?P<driver>[\w+]+):\/\/(?:(?P<username>\w+):(?P<password>\w+)@)?(?P<host>[\w\.-]+)"
            r"(?::(?P<port>\d+))?(?:\/(?P<database>[\w\.-]+))?$"
        )
        match = re.match(dsn_pattern, value)
        if match:
            # Extracting components from the DSN
            driver = match.group("driver")
            host = match.group("host")
            database = match.group("database")

            # Validating components (You can customize the validation rules as per your requirements)
            if not driver:
                raise ValueError("Missing driver in DSN")

            if not host:
                raise ValueError("Host missing from DSN")

            if not database:
                raise ValueError("DSN must specify a database name")
        else:
            # DSN doesn't match the expected pattern
            raise ValueError("Invalid DSN format")

        # Simpler way to connect to postgres even though officially deprecated
        # This mirrors psql which is a very common way to connect to postgres
        if value.startswith("postgres") and not value.startswith("postgresql"):
            # Only replace first occurrence
            value = value.replace("postgres", "postgresql", 1)

        return value


@router.post("/connect", response_model_exclude_none=True)
async def connect_db(req: ConnectRequest) -> SuccessResponse[ConnectionOut]:
    return create_db_connection(req.dsn, req.name, is_sample=req.is_sample)


@router.post("/connect/file")
async def connect_db_from_file(file: UploadFile, name: str = Body(...)) -> SuccessResponse[ConnectionOut]:
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
    return create_db_connection(dsn, name, is_sample=False)


@router.get("/connection/{connection_id}")
async def get_connection(connection_id: UUID) -> SuccessResponse[GetConnectionOut]:
    with db.DatabaseManager() as conn:
        return SuccessResponse(
            data=GetConnectionOut(
                connection=db.get_connection(conn, connection_id),
            ),
        )


class ConnectionsOut(BaseModel):
    connections: list[ConnectionOut]


@router.get("/connections")
async def get_connections() -> SuccessResponse[ConnectionsOut]:
    return SuccessResponse(
        data=ConnectionsOut(
            connections=db.get_connections(),
        ),
    )


@router.delete("/connection/{connection_id}")
async def delete_connection(connection_id: str) -> SuccessResponse[None]:
    with db.DatabaseManager() as conn:
        db.delete_connection(conn, connection_id)
    return SuccessResponse()


@router.patch("/connection/{connection_id}")
async def update_connection(connection_id: UUID, req: UpdateConnectionRequest) -> SuccessResponse[GetConnectionOut]:
    # Try to connect to provided dsn
    try:
        engine = create_engine(req.dsn)
        with engine.connect():
            pass
    except OperationalError as e:
        logger.error(e)
        raise HTTPException(status_code=400, detail="Failed to connect to database")

    # Update connection only if success
    dialect = engine.url.get_dialect().name
    database = str(engine.url.database)

    db.update_connection(
        connection_id=connection_id,
        dsn=req.dsn,
        database=database,
        name=req.name,
        dialect=dialect,
    )

    return SuccessResponse(
        data=GetConnectionOut(
            connection=ConnectionOut(
                id=connection_id,
                dsn=req.dsn,
                database=database,
                name=req.name,
                dialect=dialect,
                is_sample=False,  # Don't care, just send False
            ),
        ),
    )


@router.get("/connection/{connection_id}/schemas")
async def get_table_schemas(connection_id: UUID) -> SuccessResponse[TableSchemasOut]:
    # Check for connection existence
    with db.DatabaseManager() as conn:
        try:
            db.get_connection(conn, connection_id)
        except NotFoundError:
            raise HTTPException(status_code=404, detail="Invalid connection_id")

        return SuccessResponse(
            data=TableSchemasOut(
                tables=db.get_table_schemas_with_descriptions(connection_id),
            ),
        )


@router.patch("/schemas/table/{table_id}")
async def update_table_schema_description(
    table_id: str, description: Annotated[str, Body(embed=True)]
) -> dict[str, str]:
    with db.DatabaseManager() as conn:
        db.update_schema_table_description(conn, table_id=table_id, description=description)
        conn.commit()

    return {"status": "ok"}


@router.patch("/schemas/field/{field_id}")
async def update_table_schema_field_description(
    field_id: str, description: Annotated[str, Body(embed=True)]
) -> dict[str, str]:
    with db.DatabaseManager() as conn:
        db.update_schema_table_field_description(conn, field_id=field_id, description=description)
        conn.commit()

    return {"status": "ok"}


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


# TODO: Convert to using services and session
# @router.post("/create-sample-db")
# async def create_sample_db(
#     connection_service: ConnectionService = Depends(),
#     session: AsyncSession = Depends(get_session),
# ) -> SuccessResponse[dict[str, str]]:
#     name = "DVD Rental (Sample)"
#     dsn = get_sqlite_dsn(config.sample_postgres_path)
#     return await create_db_connection(
#         session=session, connection_service=connection_service, dsn=dsn, name=name, is_sample=True
#     )


# @router.post("/connect", response_model_exclude_none=True)
# async def connect_db(
#     req: ConnectionIn, connection_service: ConnectionService = Depends(), session: AsyncSession = Depends(get_session)
# ) -> SuccessResponse[dict[str, str]]:
#     return await create_db_connection(
#         session=session, connection_service=connection_service, dsn=req.dsn, name=req.name
#     )


# @router.get("/connection/{connection_id}")
# async def get_connection(
#     connection_id: UUID,
#     connection_service: ConnectionService = Depends(),
#     session: AsyncSession = Depends(get_session),
# ) -> SuccessResponse[GetConnectionOut]:
#     connection = await connection_service.get_connection(session, connection_id)
#     return SuccessResponse(
#         data=GetConnectionOut(
#             connection=connection,
#         ),
#     )


# @router.get("/connections")
# async def get_connections(
#     connection_service: ConnectionService = Depends(),
#     session: AsyncSession = Depends(get_session),
# ) -> SuccessResponse[GetConnectionListOut]:
#     connections = await connection_service.get_connections(session)
#     return SuccessResponse(
#         data=GetConnectionListOut(connections=connections),
#     )
