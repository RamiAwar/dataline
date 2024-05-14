import abc
from typing import Any, ClassVar, List
from uuid import UUID

from langchain_core.pydantic_v1 import BaseModel as BaseModelV1
from langchain_core.pydantic_v1 import SecretStr as SecretStrV1
from pydantic import BaseModel

from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.result.schema import ResultCreate


# Need to use pydantic v1 due to langchain
class QueryOptions(BaseModelV1):
    openai_api_key: SecretStrV1
    model_name: str
    secure_data: bool = False


class QueryResultSchema(BaseModel, abc.ABC):
    result_type: ClassVar[QueryResultType]


class StorableQueryResultSchema(QueryResultSchema, abc.ABC):
    @abc.abstractmethod
    def create_storable_result(self, message_id: UUID) -> ResultCreate:
        pass


class SQLQueryRunResult(QueryResultSchema):  # type: ignore[misc]
    result_type: ClassVar[QueryResultType] = QueryResultType.SQL_QUERY_RUN_RESULT

    columns: List[str]
    rows: List[List[Any]]  # type: ignore[misc]
    is_secure: bool = False


class SQLQueryStringResult(StorableQueryResultSchema):
    result_type: ClassVar[QueryResultType] = QueryResultType.SQL_QUERY_STRING_RESULT
    sql: str

    def create_storable_result(self, message_id: UUID) -> ResultCreate:
        return ResultCreate(
            content=self.sql,
            type=self.result_type.value,
            message_id=message_id,
        )


class SelectedTablesResult(StorableQueryResultSchema):
    result_type: ClassVar[QueryResultType] = QueryResultType.SELECTED_TABLES

    tables: List[str]

    def create_storable_result(self, message_id: UUID) -> ResultCreate:
        return ResultCreate(
            content=",".join(self.tables),
            type=self.result_type.value,
            message_id=message_id,
        )


ResultType = SQLQueryRunResult | SQLQueryStringResult | SelectedTablesResult
