import logging
import re
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

import db
from dataline.config import config
from dataline.models.connection.schema import (
    ConnectionOut,
    GetConnectionOut,
    TableSchemasOut,
)
from dataline.repositories.base import NotFoundError
from dataline.utils import get_sqlite_dsn
from models import StatusType, SuccessResponse, UpdateConnectionRequest
from services import SchemaService

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
                raise HTTPException(status_code=404, detail="Failed to connect to database")
        else:
            logger.error(exc)
            raise HTTPException(status_code=404, detail="Failed to connect to database")

    # Check if connection with DSN already exists, then return connection_id
    try:
        existing_connection = db.get_connection_from_dsn(dsn)
        if existing_connection:
            return SuccessResponse(status=StatusType.ok, data=existing_connection)
    except NotFoundError:
        pass

    # Insert connection only if success
    dialect = engine.url.get_dialect().name
    database = engine.url.database

    if not database:
        raise Exception("Invalid DSN. Database name is required.")

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
        status=StatusType.ok,
        data=ConnectionOut(
            id=connection_id, dsn=dsn, database=database, dialect=dialect, name=name, is_sample=is_sample
        ),
    )


class ConnectRequest(BaseModel):
    dsn: str = Field(min_length=3)
    name: str

    @field_validator("dsn")
    def validate_dsn_format(cls, value: str) -> str:
        # Define a regular expression to match the DSN format
        # Relaxed to allow for many kinds of DSNs
        dsn_regex = r"^[\w\+]+:\/\/[\/\w-]+.*$"

        if not re.match(dsn_regex, value):
            raise ValueError(
                'Invalid DSN format. The expected format is "driver://username:password@host:port/database".'
            )

        return value


@router.post("/create-sample-db")
async def create_sample_db() -> SuccessResponse[ConnectionOut]:
    name = "DVD Rental (Sample)"
    dsn = get_sqlite_dsn(config.sample_postgres_path)
    return create_db_connection(dsn, name, is_sample=True)


@router.post("/connect", response_model_exclude_none=True)
async def connect_db(req: ConnectRequest) -> SuccessResponse[ConnectionOut]:
    return create_db_connection(req.dsn, req.name)


@router.get("/connection/{connection_id}")
async def get_connection(connection_id: UUID) -> SuccessResponse[GetConnectionOut]:
    with db.DatabaseManager() as conn:
        return SuccessResponse(
            status=StatusType.ok,
            data=GetConnectionOut(
                connection=db.get_connection(conn, connection_id),
            ),
        )


class ConnectionsOut(BaseModel):
    connections: list[ConnectionOut]


@router.get("/connections")
async def get_connections() -> SuccessResponse[ConnectionsOut]:
    return SuccessResponse(
        status=StatusType.ok,
        data=ConnectionsOut(
            connections=db.get_connections(),
        ),
    )


@router.delete("/connection/{connection_id}")
async def delete_connection(connection_id: str) -> SuccessResponse[None]:
    with db.DatabaseManager() as conn:
        db.delete_connection(conn, connection_id)
    return SuccessResponse(status=StatusType.ok)


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
        status=StatusType.ok,
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
            status=StatusType.ok,
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
#         status=StatusType.ok,
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
#         status=StatusType.ok,
#         data=GetConnectionListOut(connections=connections),
#     )
