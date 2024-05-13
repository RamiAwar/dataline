import json
from abc import ABC, abstractmethod
from typing import cast

from langchain_core.messages import FunctionMessage
from langchain_core.utils.function_calling import convert_to_openai_function
from langchain_openai import ChatOpenAI
from langgraph.graph import END
from langgraph.prebuilt import ToolInvocation

from dataline.models.llm_flow.schema import (
    QueryGraphState,
    QueryGraphStateUpdate,
    state_update,
)
from dataline.services.llm_flow.llm_calls.query_sql_corrector import (
    QuerySQLCorrectorCall,
    SQLCorrectionDetails,
)
from dataline.services.llm_flow.toolkit import (
    QuerySQLDataBaseTool,
    SelectedTablesResult,
    SQLQueryResult,
    SQLToolNames,
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
        tools = state.sql_toolkit.get_tools(secure_data=state.options.secure_data)
        functions = [convert_to_openai_function(t) for t in tools]
        model = cast(ChatOpenAI, model.bind_functions(functions=functions))
        response = model.invoke(state.messages)
        return state_update(messages=[response])


class CallToolNode(Node):
    __name__ = "perform_action"

    @classmethod
    def correct_sql(cls, api_key: str, query: str, dialect: str) -> SQLCorrectionDetails:
        return QuerySQLCorrectorCall(api_key=api_key, query=query, dialect=dialect).extract()

    @classmethod
    def run(cls, state: QueryGraphState) -> QueryGraphStateUpdate:
        messages = state.messages
        last_message = messages[-1]

        action = ToolInvocation(
            tool=last_message.additional_kwargs.get("function_call", {}).get("name"),
            tool_input=json.loads(last_message.additional_kwargs.get("function_call", {}).get("arguments")),
        )

        # Pre-processing tool invocation
        # TODO: Move this to a method inside the tools themselves that we can call from here
        # - add to BaseTool or something
        # If the tool is a SQL query tool, we check if it needs correction
        messages = []
        results = []
        if action.tool == SQLToolNames.EXECUTE_SQL_QUERY and isinstance(action.tool_input, dict):
            sql_query_executor_tool = cast(
                QuerySQLDataBaseTool, state.tool_executor.tool_map[SQLToolNames.EXECUTE_SQL_QUERY]
            )
            query = action.tool_input.get("query", "")
            dialect = sql_query_executor_tool.db.dialect

            details = cls.correct_sql(state.options.openai_api_key.get_secret_value(), query, dialect)
            if details.needs_correction and details.query:
                action.tool_input["query"] = details.query

            # Log correction results as a function message
            function_message = FunctionMessage(content=str(details.model_dump()), name=SQLToolNames.QUERY_SQL_CORRECTOR)
            messages.append(function_message)

            # We call the tool_executor and get back a response
            response = cast(SQLQueryResult, sql_query_executor_tool.run(action.tool_input))
            response.is_secure = state.options.secure_data  # nice to also return whether or not generated securely
            results.append(response)

            # We use the response to create a FunctionMessage
            if not state.options.secure_data:
                # TODO: Cast this to a string by including the column names in every row so
                # it's easier for llm to understand
                function_message = FunctionMessage(content=str(response), name=action.tool)
                messages.append(function_message)
            else:
                # Get data description from results
                if response.columns and response.rows:
                    data_types = [type(cell).__name__ for cell in response.rows[0]]
                    data_description = (
                        f"Returned data description:\nColumns:{response.columns}\nFirst row: {data_types}"
                    )
                elif len(response.rows) == 1:
                    data_types = [type(cell).__name__ for cell in response.rows[0]]
                    data_description = f"Returned data description:\nOnly one row: {data_types}"
                else:
                    data_description = "No data returned"

                function_message = FunctionMessage(
                    content="Query executed successfully - here is the returned data description. "
                    "I cannot view this data for security reasons.\n"
                    f"{data_description}",
                    name=action.tool,
                )
                messages.append(function_message)
        else:
            # We call the tool_executor and get back a response
            response = state.tool_executor.invoke(action)
            # We use the response to create a FunctionMessage
            function_message = FunctionMessage(content=str(response), name=action.tool)
            messages.append(function_message)

        # We return a list, because this will get added to the existing list
        return state_update(messages=messages, results=results)


class CallListTablesToolNode(Node):
    __name__ = "get_tables"

    @classmethod
    def run(cls, state: QueryGraphState) -> QueryGraphStateUpdate:
        action = ToolInvocation(tool=SQLToolNames.LIST_SQL_TABLES, tool_input={})
        response = cast(SelectedTablesResult, state.tool_executor.invoke(action))
        function_message = FunctionMessage(content=str(", ".join(response.tables)), name=action.tool)
        return state_update(messages=[function_message], results=[response])


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
        if "function_call" not in last_message.additional_kwargs:
            return END
        # Otherwise if there is, we continue
        else:
            return CallToolNode.__name__
