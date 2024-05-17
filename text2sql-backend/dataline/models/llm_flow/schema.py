import abc
from typing import Any, ClassVar, List, Self
from uuid import UUID

from langchain_core.pydantic_v1 import BaseModel as BaseModelV1
from langchain_core.pydantic_v1 import SecretStr as SecretStrV1
from pydantic import BaseModel

from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.result.model import ResultModel
from dataline.models.result.schema import ResultCreate, ResultOut
from dataline.repositories.base import AsyncSession
from dataline.repositories.result import ResultRepository


# Need to use pydantic v1 due to langchain
class QueryOptions(BaseModelV1):
    openai_api_key: SecretStrV1
    model_name: str
    secure_data: bool = False


class QueryResultSchema(BaseModel, abc.ABC):
    result_type: ClassVar[QueryResultType]


class StorableResultMixin(BaseModel, abc.ABC):
    result_id: UUID | None = None

    @abc.abstractmethod
    async def store_result(self, session: AsyncSession, result_repo: ResultRepository, message_id: UUID) -> ResultModel:
        pass

    @classmethod
    @abc.abstractmethod
    def deserialize(cls, result: ResultModel) -> Self:
        pass


class RenderableResultMixin(abc.ABC):
    def serialize_result(self: QueryResultSchema) -> ResultOut:  # type: ignore[misc]
        return ResultOut(
            content=self.model_dump(),
            type=self.result_type.value,
        )


class SQLQueryRunResult(QueryResultSchema, RenderableResultMixin):  # type: ignore[misc]
    result_type: ClassVar[QueryResultType] = QueryResultType.SQL_QUERY_RUN_RESULT

    columns: list[str]
    rows: list[list[Any]]  # type: ignore[misc]
    is_secure: bool = False


class SQLQueryStringResult(QueryResultSchema, StorableResultMixin, RenderableResultMixin):
    result_type: ClassVar[QueryResultType] = QueryResultType.SQL_QUERY_STRING_RESULT
    sql: str

    async def store_result(self, session: AsyncSession, result_repo: ResultRepository, message_id: UUID) -> ResultModel:
        create = ResultCreate(
            content=self.sql,
            type=self.result_type.value,
            message_id=message_id,
        )
        stored_result = await result_repo.create(session, create)
        self.result_id = stored_result.id
        return stored_result

    @classmethod
    def deserialize(cls, result: ResultModel) -> Self:
        return cls(sql=result.content, result_id=result.id)

    def serialize_result(self) -> ResultOut:
        return ResultOut(
            content=self.model_dump(),
            type=self.result_type.value,
            result_id=self.result_id,
        )


class SelectedTablesResult(QueryResultSchema, StorableResultMixin, RenderableResultMixin):
    result_type: ClassVar[QueryResultType] = QueryResultType.SELECTED_TABLES

    tables: List[str]

    async def store_result(self, session: AsyncSession, result_repo: ResultRepository, message_id: UUID) -> ResultModel:
        create = ResultCreate(
            content=",".join(self.tables),
            type=self.result_type.value,
            message_id=message_id,
        )
        stored_result = await result_repo.create(session, create)
        self.result_id = stored_result.id
        return stored_result

    @classmethod
    def deserialize(cls, result: ResultModel) -> Self:
        return cls(tables=result.content.split(","), result_id=result.id)


ResultType = SQLQueryRunResult | SQLQueryStringResult | SelectedTablesResult
