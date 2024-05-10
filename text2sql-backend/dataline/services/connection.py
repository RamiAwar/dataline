from uuid import UUID

from fastapi import Depends

from dataline.models.connection.schema import ConnectionOut, ConnectionUpdateIn
from dataline.repositories.base import AsyncSession
from dataline.repositories.connection import (
    ConnectionCreate,
    ConnectionRepository,
    ConnectionUpdate,
)


class ConnectionService:
    connection_repo: ConnectionRepository

    def __init__(self, connection_repo: ConnectionRepository = Depends()) -> None:
        self.connection_repo = connection_repo

    async def create_connection(
        self,
        session: AsyncSession,
        dsn: str,
        database: str,
        name: str,
        dialect: str,
        is_sample: bool = False,
    ) -> ConnectionOut:
        connection = await self.connection_repo.create(
            session, ConnectionCreate(dsn=dsn, database=database, name=name, dialect=dialect, is_sample=is_sample)
        )
        return ConnectionOut.model_validate(connection)

    async def get_connection(self, session: AsyncSession, connection_id: UUID) -> ConnectionOut:
        connection = await self.connection_repo.get_by_uuid(session, connection_id)
        return ConnectionOut.model_validate(connection)

    async def update_connection(self, session: AsyncSession, connection_id: UUID, data: ConnectionUpdateIn) -> None:
        await self.connection_repo.update_by_uuid(
            session, connection_id, ConnectionUpdate.model_construct(**data.model_dump(exclude_unset=True))
        )

    async def get_connection_from_dsn(self, session: AsyncSession, dsn: str) -> ConnectionOut:
        connection = await self.connection_repo.get_by_dsn(session, dsn=dsn)
        return ConnectionOut.model_validate(connection)

    async def get_connections(self, session: AsyncSession) -> list[ConnectionOut]:
        connections = await self.connection_repo.list_all(session)
        return [ConnectionOut.model_validate(connection) for connection in connections]
