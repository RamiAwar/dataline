from typing import Sequence, Type

from langchain_community.utilities.sql_database import SQLDatabase
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph
from langgraph.prebuilt import ToolExecutor

from dataline.models.llm_flow.schema import QueryOptions, QueryResultSchema, ResultType
from dataline.services.llm_flow.nodes import (
    CallListTablesToolNode,
    CallModelNode,
    CallToolNode,
    Condition,
    Node,
    ShouldCallToolCondition,
)
from dataline.services.llm_flow.prompt import SQL_FUNCTIONS_SUFFIX, SQL_PREFIX
from dataline.services.llm_flow.toolkit import QueryGraphState, SQLDatabaseToolkit


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

    def query(
        self, query: str, options: QueryOptions, history: Sequence[BaseMessage] = []
    ) -> tuple[Sequence[BaseMessage], Sequence[ResultType]]:
        graph = self.build_graph()
        app = graph.compile()

        tool_executor = ToolExecutor(tools=self.toolkit.get_tools(secure_data=options.secure_data))
        initial_state = {
            "messages": [
                *self.get_prompt_messages(query, history),
            ],
            "results": [],
            "options": options,
            "sql_toolkit": self.toolkit,
            "tool_executor": tool_executor,
        }

        chunks = []
        messages: Sequence[BaseMessage] = []
        results: Sequence[ResultType] = []
        for chunk in app.stream(initial_state):
            chunks.append(chunk)
            for tool, tool_chunk in chunk.items():
                if tool_chunk.get("results"):
                    results.extend(tool_chunk["results"])

                if tool_chunk.get("messages"):
                    messages.extend(tool_chunk["messages"])

        return messages, results

    def build_graph(self) -> StateGraph:
        # Create the graph
        graph = StateGraph(QueryGraphState)
        add_node(graph, CallListTablesToolNode)
        add_node(graph, CallModelNode)
        add_node(graph, CallToolNode)

        add_edge(graph, CallListTablesToolNode, CallModelNode)
        add_conditional_edge(graph, CallModelNode, ShouldCallToolCondition)
        add_edge(graph, CallToolNode, CallModelNode)
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
