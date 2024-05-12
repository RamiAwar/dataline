import functools
from pprint import pprint
from typing import Sequence, Type, cast

from langchain_community.utilities.sql_database import SQLDatabase
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    FunctionMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolExecutor

from dataline.models.connection.schema import Connection
from dataline.models.llm_flow.schema import QueryGraphState, QueryOptions
from dataline.services.llm_flow.llm_calls.query_sql_corrector import (
    QuerySQLCorrectorCall,
    SQLCorrectionDetails,
)
from dataline.services.llm_flow.nodes import (
    CallListTablesToolNode,
    CallModelNode,
    CallToolNode,
    Condition,
    Edge,
    Node,
    ShouldCallToolCondition,
)
from dataline.services.llm_flow.prompt import SQL_FUNCTIONS_SUFFIX, SQL_PREFIX
from dataline.services.llm_flow.toolkit import (
    QuerySQLDataBaseTool,
    SelectedTablesResult,
    SQLDatabaseToolkit,
    SQLQueryResult,
    SQLToolNames,
)


def add_node(graph: StateGraph, node: Type[Node]) -> None:
    graph.add_node(node.__name__, node.run)


def add_edge(graph: StateGraph, node_start: Type[Node], node_end: Type[Node]) -> None:
    graph.add_edge(node_start.__name__, node_end.__name__)


def add_conditional_edge(graph: StateGraph, source: Type[Node], condition: Type[Condition]) -> None:
    graph.add_conditional_edges(source.__name__, condition.run)


class QueryGraphService:
    def __init__(
        self,
        dsn: str,
    ) -> None:
        self.db = SQLDatabase.from_uri(dsn)

        # TODO: Add this in later if data security disabled
        self.db._sample_rows_in_table_info = 0  # Preventative security
        self.toolkit = SQLDatabaseToolkit(db=self.db)

    def query(self, query: str, options: QueryOptions, history: Sequence[BaseMessage] = []) -> None:
        workflow = self.build_graph()
        app = workflow.compile()

        tool_executor = ToolExecutor(tools=self.toolkit.get_tools(secure_data=options.secure_data))
        initial_state = {
            "messages": [
                *self.get_prompt_messages(history),
            ],
            "results": [],
            "options": options,
            "sql_toolkit": self.toolkit,
            "tool_executor": tool_executor,
        }

        chunks = []
        for chunk in app.stream(initial_state):
            pprint(chunk)
            chunks.append(chunk)

    def build_graph(self) -> StateGraph:
        # Create the graph
        graph = StateGraph(QueryGraphState)
        add_node(graph, CallListTablesToolNode)
        add_node(graph, CallModelNode)
        add_node(graph, CallToolNode)

        add_edge(graph, CallListTablesToolNode, CallModelNode)
        add_edge(graph, CallModelNode, CallToolNode)
        add_conditional_edge(graph, CallModelNode, ShouldCallToolCondition)

        graph.set_entry_point(CallListTablesToolNode.__name__)

        return graph

    def get_prompt_messages(
        self, query: str, history: Sequence[BaseMessage], top_k: int = 10, suffix: str = SQL_FUNCTIONS_SUFFIX
    ):
        if not history:
            prefix = SQL_PREFIX
            prefix = prefix.format(dialect=self.toolkit.dialect, top_k=top_k)
            return [
                SystemMessage(content=prefix),
                HumanMessage(content=query),
                AIMessage(content=suffix),
            ]
        else:
            return [
                *history,
                HumanMessage(content=query),
                AIMessage(content=suffix),
            ]

    # async def get_related_tables(self, query: str, message_history: list[dict] = []) -> tuple[str, list[str]]:
    #     # Fetch table context
    #     context_str, table_names = await self.context_builder.get_relevant_table_context(
    #         query_str=query,
    #         store_context_str=True,
    #         message_history=message_history,
    #     )

    #     # If no table schemas found for context, raise error
    #     if context_str.strip() == "":
    #         raise RelatedTablesNotFoundError

    #     return context_str, table_names

    # async def query(self, query: str, conversation_id: str) -> SQLQueryResult:
    #     # Query with table context
    #     message_history = db.get_message_history_with_selected_tables_with_sql(conversation_id)

    #     # Fetch table context
    #     context_str, table_names = await self.get_related_tables(query, message_history)

    #     # Add user message to message history
    #     db.add_message_to_conversation(conversation_id, content=query, role="user", selected_tables=table_names)

    #     generated_json = "".join(
    #         self.query_manager.query(query, table_context=context_str, message_history=message_history)
    #     )
    #     data = json.loads(generated_json)
    #     result = SQLQueryResult(**data, selected_tables=table_names)

    #     if result.sql:
    #         # Validate SQL
    #         valid, error = self.sql_db.validate_sql(result.sql)
    #         if not valid:
    #             logger.debug("\n\n------------------\n\n")
    #             logger.debug("Reasking...")
    #             logger.debug("\n\n------------------\n\n")
    #             # Reask with error
    #             generated_json = "".join(self.query_manager.reask(query, result.sql, context_str, error))
    #             data = json.loads(generated_json)

    #             # TODO: Add invalid SQL status to result type so it can be communicated to frontend  # noqa
    #             # Return all generated data + selected tables
    #             return SQLQueryResult(**data, selected_tables=table_names)

    #     return result

    # def run_sql(self, sql: str):
    #     results = self.sql_db.run_sql(sql)
    #     if results and len(results) > 1:
    #         return results[1]

    #     raise Exception("Uknown error running sql, got no results: ", results)
