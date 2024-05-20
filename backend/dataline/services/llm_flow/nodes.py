from abc import ABC, abstractmethod
from typing import cast

from langchain_core.messages import AIMessage, FunctionMessage, ToolMessage
from langchain_core.utils.function_calling import convert_to_openai_function
from langchain_openai import ChatOpenAI
from langgraph.graph import END

from dataline.models.llm_flow.schema import (
    QueryResultSchema,
    SelectedTablesResult,
    SQLQueryRunResult,
    SQLQueryStringResult,
)

# from dataline.services.llm_flow.llm_calls.query_sql_corrector import (
#     QuerySQLCorrectorCall,
#     SQLCorrectionDetails,
# )
from dataline.services.llm_flow.toolkit import (
    InfoSQLDatabaseTool,
    ListSQLTablesTool,
    QueryGraphState,
    QueryGraphStateUpdate,
    QuerySQLDataBaseTool,
    SQLToolNames,
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

    # @classmethod
    # def correct_sql(cls, api_key: str, query: str, dialect: str) -> SQLCorrectionDetails:
    #     return QuerySQLCorrectorCall(api_key=api_key, query=query, dialect=dialect).extract()

    # TODO: Refactor the below - if any tool wants to add a result to the state, it should be done in the tool itself
    # We'll redesign tool calls to return a list of results and messages maybe?
    # Think about it later
    @classmethod
    def run(cls, state: QueryGraphState) -> QueryGraphStateUpdate:
        messages = state.messages
        last_message = cast(AIMessage, messages[-1])

        output_messages = []
        results: list[QueryResultSchema] = []
        for tool_call in last_message.tool_calls:
            # Post-processing SQL tool to purge data if secure_data is enabled
            if tool_call["name"] == SQLToolNames.EXECUTE_SQL_QUERY:
                # Create a result object out of the SQL
                results.append(SQLQueryStringResult(sql=tool_call["args"]["query"]))

                sql_query_executor_tool = cast(
                    QuerySQLDataBaseTool, state.tool_executor.tool_map[SQLToolNames.EXECUTE_SQL_QUERY]
                )

                # # PREEMPTIVE SQL CORRECTION
                # TODO: DO WE REALLY NEED THIS ADVANCED LOGIC? JUST LET IT FAIL INSTEAD MAYBE?
                # Let's try to add it in after the regression tests are up, then we can test speed+accuracy improvement
                # query = action.tool_input.get("query", "")
                # dialect = sql_query_executor_tool.db.dialect
                # details = cls.correct_sql(state.options.openai_api_key.get_secret_value(), query, dialect)
                # if details.needs_correction and details.query:
                #     action.tool_input["query"] = details.query

                # # Add correction results as a function message
                # tool_message = FunctionMessage(
                #     content=str(details.model_dump()), name=SQLToolNames.QUERY_SQL_CORRECTOR
                # )
                # messages.append(tool_message)

                # We call the tool_executor and get back a response
                response = cast(SQLQueryRunResult, sql_query_executor_tool.run(tool_call["args"]))
                response.is_secure = state.options.secure_data  # return whether or not generated securely
                results.append(response)

                # We use the response to create a FunctionMessage
                if not state.options.secure_data:
                    # TODO: Cast this to a string by including the column names in every row so
                    # it's easier for llm to understand
                    tool_message = ToolMessage(
                        content=str(response), name=tool_call["name"], tool_call_id=str(tool_call["id"])
                    )
                    output_messages.append(tool_message)
                else:
                    # Get data description from results
                    if response.columns and response.rows:
                        data_types = [type(cell).__name__ for cell in response.rows[0]]
                        data_description = (
                            "Returned data description:\n"
                            f"Columns:{response.columns}\n"
                            f"First row: {data_types}\n"
                            f"Number of rows: {len(response.rows)}"
                        )
                    elif len(response.rows) == 1:
                        data_types = [type(cell).__name__ for cell in response.rows[0]]
                        data_description = f"Returned data description:\nOnly one row: {data_types}"
                    else:
                        data_description = "No data returned"

                    tool_message = ToolMessage(
                        content="Query executed successfully - here is the returned data description. "
                        "I cannot view the data for security reasons but the user should be able to see the results!\n"
                        f"{data_description}",
                        name=tool_call["name"],
                        tool_call_id=str(tool_call["id"]),
                    )
                    output_messages.append(tool_message)
            elif tool_call["name"] == SQLToolNames.INFO_SQL_DATABASE:
                # We call the tool_executor and get back a response
                tool = cast(InfoSQLDatabaseTool, state.tool_executor.tool_map[tool_call["name"]])
                response = tool.run(tool_call["args"])
                # We use the response to create a FunctionMessage
                tool_message = ToolMessage(
                    content=str(response), name=tool_call["name"], tool_call_id=str(tool_call["id"])
                )

                # Add selected tables result if successful
                if tool.table_names:
                    results.append(SelectedTablesResult(tables=tool.table_names))

                output_messages.append(tool_message)
            else:
                # We call the tool_executor and get back a response
                response = state.tool_executor.tool_map[tool_call["name"]].run(tool_call["args"])
                # We use the response to create a FunctionMessage
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
