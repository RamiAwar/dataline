import functools
from typing import Iterator, Literal

import openai

from openai_utils.types import LLMApiProtocol, TMessage


class ChatLLM:
    def __init__(
        self,
        model: Literal["gpt-4"] = "gpt-4",
        temperature: float = 0.0,
    ):
        self.model = model
        self.temperature = temperature
        self.llm_api: LLMApiProtocol = functools.partial(
            openai.chat.completions.create,
            model=model,
            temperature=temperature,
            stream=True,
        )

    def query(self, query: str, message_history: list[TMessage]) -> str:
        """Query LLM for table context, returns generated string.

        Args:
            query (str): query string
            message_history (list[dict]): message history in openai format
        """
        response = ""
        messages = message_history + [{"role": "user", "content": query}]
        for i in self.llm_api(messages=messages):
            if i.choices[0].finish_reason == "stop":
                break
            response += i.choices[0].delta.content or ""

        return response

    def query_streaming(
        self, query: str, message_history: list[TMessage]
    ) -> Iterator[str | None]:
        """Query LLM for table context, returns generator.

        Args:
            query (str): query string
            message_history (list[dict]): message history in openai format
        """
        messages = message_history + [{"role": "user", "content": query}]
        for i in self.llm_api(messages=messages):
            if i.choices[0].finish_reason == "stop":
                raise StopIteration
            yield i.choices[0].delta.content
