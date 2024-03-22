from abc import ABC, abstractmethod
from typing import AsyncGenerator, Generic, Iterable, Protocol, Sequence, Type, TypeVar
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import Delete, Select, Update, delete, insert, select, update
from sqlalchemy.exc import IntegrityError, MultipleResultsFound, NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession as _AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from dataline.config import config

# Load all sqlalchemy models
from dataline.models import *  # noqa: F401, F403
from dataline.models.base import DBModel
from dataline.utils import get_sqlite_dsn_async

engine = create_async_engine(get_sqlite_dsn_async(config.sqlite_path))

# We set expire_on_commit to False so that subsequent access to objects that came from a session do not
# need to emit new SQL queries to refresh the objects if the transaction has been committed already
SessionCreator = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

AsyncSession = _AsyncSession


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency to get a db session"""
    session = SessionCreator()
    try:
        yield session

        # Commit only if no exception occurs
        await session.commit()
    except Exception:
        # If any exception encountered, rollback all changes
        await session.rollback()
        raise
    finally:
        await session.close()


class ConstraintViolationError(Exception): ...


class NotFoundError(Exception): ...


class NotUniqueError(Exception): ...


# Generic types per repository
Model = TypeVar("Model", bound=DBModel)
TCreate = TypeVar("TCreate", bound=BaseModel, contravariant=True)
TUpdate = TypeVar("TUpdate", bound=BaseModel, contravariant=True)

# Only used as input
ModelSchema = TypeVar("ModelSchema", bound=BaseModel)
Data = TypeVar("Data", bound=BaseModel)


class RepositoryProtocol(Protocol[Model, TCreate, TUpdate]):
    @property
    def model(self) -> Type[Model]: ...

    # Low level ops
    async def get(self, session: AsyncSession, query: Select[tuple[Model]]) -> Model: ...
    async def first(self, session: AsyncSession, query: Select[tuple[Model]]) -> Model: ...
    async def list(self, session: AsyncSession, query: Select[tuple[Model]]) -> Sequence[Model]: ...
    async def get_unique(self, session: AsyncSession, query: Select[tuple[Model]]) -> Model: ...
    async def list_unique(self, session: AsyncSession, query: Select[tuple[Model]]) -> Sequence[Model]: ...
    async def update_one(self, session: AsyncSession, query: Update) -> Model: ...
    async def update_many(self, session: AsyncSession, query: Update) -> Sequence[Model]: ...
    async def delete_one(self, session: AsyncSession, query: Delete) -> None: ...

    # Higher level ops
    async def create(self, session: AsyncSession, data: TCreate, flush: bool = True) -> Model: ...
    async def create_many(self, session: AsyncSession, data: Iterable[TCreate]) -> Sequence[Model]: ...
    async def get_by_id(self, session: AsyncSession, record_id: UUID) -> Model: ...
    async def update_by_id(self, session: AsyncSession, record_id: UUID, data: TUpdate) -> Model: ...
    async def delete_by_id(self, session: AsyncSession, record_id: UUID) -> None: ...


class BaseRepository(ABC, Generic[Model, TCreate, TUpdate]):
    # This override is needed because of https://github.com/python/typing/issues/644
    # seems like the issue is not fixed yet, added a comment there
    def __init__(self) -> None: ...

    @property
    @abstractmethod
    def model(self) -> Type[Model]:
        raise NotImplementedError

    async def get(self, session: AsyncSession, query: Select[tuple[Model]]) -> Model:
        """
        Execute a query and return exactly one scalar result or raises an exception.
        :raises: NotFoundError if no result is found
        """
        result = await session.execute(query)
        try:
            return result.scalar_one()
        except NoResultFound:
            raise NotFoundError(f"{self.model.__name__.replace('Model', '')} not found")
        except MultipleResultsFound:
            raise NotUniqueError(f"{self.model.__name__.replace('Model', '')} not unique")

    async def first(self, session: AsyncSession, query: Select[tuple[Model]]) -> Model:
        """
        Execute a query and return the first scalar result or raises NotFoundError.
        Similar to get except no exception is raised for multiple results.
        """
        result = await session.execute(query)
        instance = result.scalar_one_or_none()
        if instance is None:
            raise NotFoundError(f"{self.model.__name__.replace('Model', '')} not found")
        return instance

    async def get_unique(self, session: AsyncSession, query: Select[tuple[Model]]) -> Model:
        """
        Same as 'get' but supports joinedload.
        https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html#joined-eager-loading
        :raises: NotFoundError if no result is found
        :raises: NotUniqueError if more than one result is found
        """
        result = await session.execute(query)
        instance = result.scalars().unique().all()  # scalar_one would fail here cause of the join
        if len(instance) > 1:
            raise NotUniqueError(f"More than one {self.model.__name__.replace('Model', '')} found")
        elif len(instance) == 0:
            raise NotFoundError(f"{self.model.__name__.replace('Model', '')} not found")
        return instance[0]

    async def list(self, session: AsyncSession, query: Select[tuple[Model]]) -> Sequence[Model]:
        """
        Execute a query and return all scalar results.
        """
        results = await session.execute(query)
        return results.scalars().all()

    async def list_unique(self, session: AsyncSession, query: Select[tuple[Model]]) -> Sequence[Model]:
        """
        Same as `list` but supports joinedload.
        """
        results = await session.execute(query)
        return results.scalars().unique().all()

    async def create(self, session: AsyncSession, data: TCreate, flush: bool = True) -> Model:
        """
        Create a new instance of the model and save it to the database.
        """
        instance = self.model(**data.model_dump())
        session.add(instance)

        # Flush commands to DB (within transaction) so we can refresh instance from DB
        if flush:
            await session.flush()
        await session.refresh(instance)
        return instance

    async def create_many(self, session: AsyncSession, data: Iterable[TCreate]) -> Sequence[Model]:
        """
        Create new instances of the model and save them to the database.
        """
        instances = [item.model_dump() for item in data]
        results = await session.scalars(insert(self.model).returning(self.model).values(instances))

        # Flush commands to DB (within transaction) so we can refresh instance from DB
        await session.flush()
        return results.all()

    def _check_query_for_where(self, query: Update | Delete) -> None:
        """Make sure update query has filters to protect against accidental global updates"""
        if query.whereclause is None:
            raise ValueError("Attempting an update without a where clause")

    async def update_many(self, session: AsyncSession, query: Update) -> Sequence[Model]:
        """
        Execute an update query and return the updated instances.
        :raises: ConstraintViolationError if an integrity constraint is violated
        :raises: ValueError if the query does not have a where clause
        """
        self._check_query_for_where(query)

        # Execute the update
        try:
            results = await session.scalars(query)
        except IntegrityError as e:
            raise ConstraintViolationError(e)

        # Flush changes to DB (within transaction)
        await session.flush()
        return results.all()

    async def update_one(self, session: AsyncSession, query: Update) -> Model:
        """
        Execute an update query to update exactly one instance and return it.
        Make sure the query specifies 'returning' model.
        :raises: NotFoundError if no instance or more than one instance is updated
        :raises: ConstraintViolationError if an integrity constraint is violated
        :raises: ValueError if the query does not have a where clause
        """
        self._check_query_for_where(query)

        # Execute the update
        try:
            result = await session.scalars(query)
        except IntegrityError as e:
            raise ConstraintViolationError(e)

        instance = result.one_or_none()
        if instance is None:
            raise NotFoundError(f"{self.model.__name__.replace('Model', '')} not found")

        # Flush changes to DB (within transaction)
        await session.flush()
        await session.refresh(instance)
        return instance

    async def delete_one(self, session: AsyncSession, query: Delete) -> None:
        self._check_query_for_where(query)

        # Execute the update
        result = await session.execute(query)
        if result.rowcount == 0:
            raise NotFoundError(f"{self.model.__name__.replace('Model', '')} not found")
        elif result.rowcount > 1:
            raise NotUniqueError("More than one record will be deleted but only one is expected")

        # Flush changes to DB (within transaction)
        await session.flush()

    async def get_by_id(self, session: AsyncSession, record_id: UUID) -> Model:
        """
        Fetch a record by id.
        :raises: NotFoundError if record not found
        """
        query = select(self.model).filter_by(id=record_id)
        return await self.get(session, query)

    async def update_by_id(self, session: AsyncSession, record_id: UUID, data: TUpdate) -> Model:
        """
        Update a record by id.
        :raises: NotFoundError if no instance or more than one instance is updated
        :raises: ConstraintViolationError if an integrity constraint is violated
        :raises: ValueError if the query does not have a where clause
        """
        query = (
            update(self.model)
            .filter_by(id=record_id)
            .values(**data.model_dump(exclude_defaults=True))
            .returning(self.model)
        )
        return await self.update_one(session, query)

    async def delete_by_id(self, session: AsyncSession, record_id: UUID) -> None:
        """Delete element by ID."""
        query = delete(self.model).filter_by(id=record_id)
        await self.delete_one(session, query)

    async def list_all(self, session: AsyncSession) -> Sequence[Model]:
        """
        Fetch all records.
        """
        query = select(self.model)
        return await self.list(session, query)
