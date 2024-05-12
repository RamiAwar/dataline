import operator
from typing import Annotated, Any, Sequence, TypedDict

from langchain_core.messages import BaseMessage
from langchain_core.pydantic_v1 import BaseModel as BaseModelV1
from langchain_core.pydantic_v1 import SecretStr as SecretStrV1
from langgraph.prebuilt import ToolExecutor
from pydantic import BaseModel

from dataline.services.llm_flow.toolkit import SQLDatabaseToolkit


class QueryOptions(BaseModel):
    openai_api_key: SecretStrV1
    model_name: str
    secure_data: bool = False


# TODO: Better typing for results


class QueryGraphState(BaseModelV1):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    results: Annotated[Sequence[Any], operator.add]
    options: QueryOptions
    sql_toolkit: SQLDatabaseToolkit
    tool_executor: ToolExecutor


class QueryGraphStateUpdate(TypedDict):
    messages: Sequence[BaseMessage]
    results: Sequence[Any]


def state_update(messages: Sequence[BaseMessage] = [], results: Sequence[Any] = []) -> QueryGraphStateUpdate:
    return {"messages": messages, "results": results}
