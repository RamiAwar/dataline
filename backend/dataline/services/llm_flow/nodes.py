from abc import ABC, abstractmethod
from typing import cast

from langchain_core.messages import AIMessage, BaseMessage, ToolCall, ToolMessage
from langchain_core.utils.function_calling import convert_to_openai_function
from langchain_openai import ChatOpenAI
from langgraph.graph import END
from openai import AuthenticationError, RateLimitError

from dataline.errors import UserFacingError
from dataline.models.llm_flow.schema import QueryResultSchema
from dataline.services.llm_flow.toolkit import (
    ChartGeneratorTool,
    QueryGraphState,
    QueryGraphStateUpdate,
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
            model=state.options.llm_model,
            base_url=state.options.openai_base_url,
            api_key=state.options.openai_api_key,
            temperature=0,
            streaming=True,
        )
        sql_tools = state.sql_toolkit.get_tools()
        all_tools = sql_tools + [ChartGeneratorTool()]
        tools = [convert_to_openai_function(t) for t in all_tools]
        model = cast(ChatOpenAI, model.bind_tools(tools))
        # This includes tool messages and ai messages at this point
        # TODO: Useful to limit tokens when graph recursion is very deep
        last_n_messages = state.messages
        try:
            response = model.invoke(last_n_messages)
        except RateLimitError as e:
            body = cast(dict, e.body)
            raise UserFacingError(body.get("message", "OpenAI API rate limit exceeded"))
        except AuthenticationError as e:
            body = cast(dict, e.body)
            raise UserFacingError(body.get("message", "OpenAI API key rejected"))
        except Exception as e:
            raise UserFacingError(str(e))

        return state_update(messages=[response])


class CallToolNode(Node):
    __name__ = "perform_action"

    @classmethod
    def run(cls, state: QueryGraphState) -> QueryGraphStateUpdate:
        messages = state.messages
        last_message = cast(AIMessage, messages[-1])

        output_messages: list[BaseMessage] = []
        results: list[QueryResultSchema] = []
        if len(last_message.tool_calls) == 1 and last_message.tool_calls[0]["name"] == "multi_tool_use.parallel":
            # Attempt to extract nested tool calls from this buggy openai message
            last_message.tool_calls = cls.fix_openai_multi_tool_use_bug(last_message.tool_calls[0])

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

    @staticmethod
    def fix_openai_multi_tool_use_bug(buggy_tool_call: ToolCall) -> list[ToolCall]:
        """
        {
            "name": "multi_tool_use.parallel",
            "args": {
                "tool_uses": [
                    {
                        "recipient_name": "functions.sql_db_query",
                        "parameters": {
                            "query": "SELECT d.Name AS DepartmentName ...",
                            "for_chart": True,
                            "chart_type": "bar",
                        },
                    },
                    {
                        "recipient_name": "functions.generate_chart",
                        "parameters": {"chart_type": "bar", "request": "Employee count per department"},
                    },
                ]
            },
            "id": "call_uv2lM7cmbHCqZzhfWAraz0IB",
            "type": "tool_call",
        }
        """
        tool_uses = buggy_tool_call["args"]["tool_uses"]
        return [
            ToolCall(
                name=tool_use["recipient_name"].split(".")[-1],  # eg extract "func_name" from "functions.func_name"
                args=tool_use["parameters"],
                id=f"call_{i}",
                type="tool_call",
            )
            for i, tool_use in enumerate(tool_uses)
        ]


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
