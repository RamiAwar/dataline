from abc import ABC, abstractmethod
from typing import cast

from langchain_core.messages import AIMessage, BaseMessage, FunctionMessage, ToolMessage
from langchain_core.utils.function_calling import convert_to_openai_function
from langchain_openai import ChatOpenAI
from langgraph.graph import END

from dataline.models.llm_flow.schema import QueryResultSchema

# from dataline.services.llm_flow.llm_calls.query_sql_corrector import (
#     QuerySQLCorrectorCall,
#     SQLCorrectionDetails,
# )
from dataline.services.llm_flow.toolkit import (
    ListSQLTablesTool,
    QueryGraphState,
    QueryGraphStateUpdate,
    SQLToolNames,
    StateUpdaterTool,
    state_update,
)

NodeName = str


class Node(ABC):
    name: NodeName

    @classmethod
    @abstractmethod
    def run(cls, state: QueryGraphState) -> QueryGraphStateUpdate:
        raise NotImplementedError


class Edge(ABC):
    @classmethod
    @abstractmethod
    def run(cls, state: QueryGraphState) -> NodeName:
        raise NotImplementedError


class Condition(ABC):
    @classmethod
    @abstractmethod
    def run(cls, state: QueryGraphState) -> NodeName:
        raise NotImplementedError


class CallModelNode(Node):
    __name__ = "call_model"

    @classmethod
    def run(cls, state: QueryGraphState) -> QueryGraphStateUpdate:
        # TODO: Consider replacing with mirascope
        model = ChatOpenAI(
            model=state.options.model_name, api_key=state.options.openai_api_key, temperature=0, streaming=True
        )
        sql_tools = state.sql_toolkit.get_tools()
        tools = [convert_to_openai_function(t) for t in sql_tools]
        model = cast(ChatOpenAI, model.bind_tools(tools))
        response = model.invoke(state.messages)
        return state_update(messages=[response])


class CallToolNode(Node):
    __name__ = "perform_action"

    @classmethod
    def run(cls, state: QueryGraphState) -> QueryGraphStateUpdate:
        messages = state.messages
        last_message = cast(AIMessage, messages[-1])

        output_messages: list[BaseMessage] = []
        results: list[QueryResultSchema] = []
        for tool_call in last_message.tool_calls:
            tool = state.tool_executor.tool_map[tool_call["name"]]
            if isinstance(tool, StateUpdaterTool):
                updates = tool.get_response(state, tool_call["args"], str(tool_call["id"]))
                output_messages.extend(updates["messages"])
                results.extend(updates["results"])

            else:
                # We call the tool_executor and get back a response
                response = tool.run(tool_call["args"])
                # We use the response to create a ToolMessage
                tool_message = ToolMessage(
                    content=str(response), name=tool_call["name"], tool_call_id=str(tool_call["id"])
                )
                output_messages.append(tool_message)

        # We return a list, because this will get added to the existing list
        return state_update(messages=output_messages, results=results)


class CallListTablesToolNode(Node):
    __name__ = "get_tables"

    @classmethod
    def run(cls, state: QueryGraphState) -> QueryGraphStateUpdate:
        # action = ToolInvocation(tool=SQLToolNames.LIST_SQL_TABLES, tool_input={})
        tool = cast(ListSQLTablesTool, state.tool_executor.tool_map[SQLToolNames.LIST_SQL_TABLES])
        response: list[str] = tool.run(tool_input={})
        tool_message = FunctionMessage(content=str(", ".join(response)), name=tool.name)
        return state_update(messages=[tool_message])


class ShouldCallToolCondition(Condition):
    @classmethod
    def run(cls, state: QueryGraphState) -> NodeName:
        """
        If there is a function call, we should go to the tool node
        Otherwise, we should go to end node
        """
        messages = state.messages
        last_message = messages[-1]
        # If there is no function call, then we go to end
        if "tool_calls" not in last_message.additional_kwargs:
            return END
        # Otherwise if there is, we continue
        else:
            return CallToolNode.__name__


# class ShouldGenerateChartCondition(Condition):
#     @classmethod
#     def run(cls, state: QueryGraphState) -> NodeName:
#         """
#         If previous function call was executing SQL and state contains should generate charts,
#         go to the charting subgraph
#         """
#         messages = state.messages
#         last_message = messages[-1]

#         # Check if the previous function call was to execute SQL
#         just_executed_sql = last_message.additional_kwargs["function_call"]["name"] == SQLToolNames.EXECUTE_SQL_QUERY
#         if "function_call" not in last_message.additional_kwargs or not just_executed_sql:
#             return CallModelNode.__name__

#         # Check if the state contains should generate charts
#         should_generate_charts = state.options.should_generate_charts
