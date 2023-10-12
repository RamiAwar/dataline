import functools
from typing import Iterator, Optional

import openai


class ChatLLM:
    def __init__(
        self,
        model: Optional[str] = "gpt-4",
        temperature: Optional[int] = 0.0,
    ):
        self.llm_api = functools.partial(
            openai.ChatCompletion.create,
            model=model,
            temperature=temperature,
            stream=True,
        )

    def query(self, query: str, message_history: list[dict]) -> str:
        """Query LLM for table context, returns generated string.

        Args:
            query (str): query string
            message_history (list[dict]): message history in openai format
        """
        response = ""
        messages = message_history + [{"role": "user", "content": query}]
        for i in self.llm_api(messages=messages):
            if i["choices"][0].get("finish_reason") == "stop":
                break
            response += i["choices"][0]["delta"]["content"]

        return response

    def query_streaming(self, query: str, message_history: list[dict]) -> Iterator[str]:
        """Query LLM for table context, returns generator.

        Args:
            query (str): query string
            message_history (list[dict]): message history in openai format
        """
        messages = message_history + [{"role": "user", "content": query}]
        for i in self.llm_api(messages=messages):
            if i["choices"][0].get("finish_reason") == "stop":
                yield StopIteration
            yield i["choices"][0]["delta"]["content"]
