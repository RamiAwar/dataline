import logging
from uuid import UUID

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

from dataline.errors import ValidationError
from dataline.models.connection.model import ConnectionModel
from dataline.models.connection.schema import ConnectionOut, ConnectionUpdateIn
from dataline.repositories.base import AsyncSession, NotFoundError, NotUniqueError
from dataline.repositories.connection import (
    ConnectionCreate,
    ConnectionRepository,
    ConnectionUpdate,
)

logger = logging.getLogger(__name__)


class ConnectionService:
    connection_repo: ConnectionRepository

    def __init__(self, connection_repo: ConnectionRepository = Depends(ConnectionRepository)) -> None:
        self.connection_repo = connection_repo

    async def create_connection(
        self,
        session: AsyncSession,
        dsn: str,
        name: str,
        is_sample: bool = False,
    ) -> ConnectionOut:
        # Check if connection can be established before saving it
        dialect, database = await self.get_connection_details(dsn)

        # Check if connection already exists
        await self.check_dsn_already_exists(session, dsn)

        connection = await self.connection_repo.create(
            session, ConnectionCreate(dsn=dsn, database=database, name=name, dialect=dialect, is_sample=is_sample)
        )
        return ConnectionOut.model_validate(connection)

    async def get_connection(self, session: AsyncSession, connection_id: UUID) -> ConnectionOut:
        connection = await self.connection_repo.get_by_uuid(session, connection_id)
        return ConnectionOut.model_validate(connection)

    async def get_connection_from_dsn(self, session: AsyncSession, dsn: str) -> ConnectionOut:
        connection = await self.connection_repo.get_by_dsn(session, dsn=dsn)
        return ConnectionOut.model_validate(connection)

    async def get_connections(self, session: AsyncSession) -> list[ConnectionOut]:
        connections = await self.connection_repo.list_all(session)
        return [ConnectionOut.model_validate(connection) for connection in connections]

    async def delete_connection(self, session: AsyncSession, connection_id: UUID) -> None:
        await self.connection_repo.delete_by_uuid(session, connection_id)

    async def get_connection_details(self, dsn: str) -> tuple[str, str]:
        # Check if connection can be established before saving it
        try:
            engine = create_engine(dsn)
            with engine.connect():
                pass

            dialect = engine.url.get_dialect().name
            database = engine.url.database

            if not database:
                raise ValidationError("Invalid DSN. Database name is missing, append '/DBNAME'.")

            return dialect, database

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
                    raise ValidationError("Failed to connect to database, please check your DSN.")

            logger.error(exc)
            raise ValidationError("Failed to connect to database, please check your DSN.")

    async def check_dsn_already_exists(self, session: AsyncSession, dsn: str) -> None:
        try:
            existing_connection = await self.connection_repo.get_by_dsn(session, dsn=dsn)
            if existing_connection:
                raise NotUniqueError("Connection already exists.")
        except NotFoundError:
            pass

    async def check_dsn_already_exists_or_none(self, session: AsyncSession, dsn: str) -> ConnectionModel | None:
        try:
            return await self.connection_repo.get_by_dsn(session, dsn=dsn)
        except NotFoundError:
            return None

    async def update_connection(
        self, session: AsyncSession, connection_uuid: UUID, data: ConnectionUpdateIn
    ) -> ConnectionOut:
        update = ConnectionUpdate()
        if data.dsn:
            # Check if connection already exists and is different from the current one
            existing_connection = await self.check_dsn_already_exists_or_none(session, data.dsn)
            if existing_connection is not None and existing_connection.id != connection_uuid:
                raise NotUniqueError("Connection DSN already exists.")

            # Check if connection can be established before saving it
            dialect, database = await self.get_connection_details(data.dsn)
            update.dsn = data.dsn
            update.database = database
            update.dialect = dialect

        if data.name:
            update.name = data.name

        updated_connection = await self.connection_repo.update_by_uuid(session, connection_uuid, update)
        return ConnectionOut.model_validate(updated_connection)
