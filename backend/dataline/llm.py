import functools
from typing import AsyncIterator

import openai

from dataline.openai_utils.types import LLMApiProtocol, TMessage


class OpenAIError(Exception):
    message: str

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class ChatLLM:
    def __init__(
        self,
        openai_api_key: str,
        model: str,
        temperature: float = 0.0,
    ):
        self.model = model
        self.temperature = temperature
        self.openai_client = openai.AsyncOpenAI(
            api_key=openai_api_key,
        )
        self.llm_api: LLMApiProtocol = functools.partial(
            self.openai_client.chat.completions.create,
            model=model,
            temperature=temperature,
            stream=True,
        )

    async def query(self, query: str, message_history: list[TMessage]) -> str:
        """Query LLM for table context, returns generated string.

        Args:
            query (str): query string
            message_history (list[dict]): message history in openai format
        """
        response = ""
        messages = message_history + [{"role": "user", "content": query}]
        try:
            stream = await self.llm_api(messages=messages)
            async for i in stream:
                if i.choices[0].finish_reason == "stop":
                    break
                response += i.choices[0].delta.content or ""
        except openai.RateLimitError as e:
            if e.type == "insufficient_quota":
                raise OpenAIError(
                    message="You exceeded your current OpenAI quota. Please check your plan and billing details."
                )

        return response

    async def query_streaming(self, query: str, message_history: list[TMessage]) -> AsyncIterator[str | None]:
        """Query LLM for table context, returns generator.

        Args:
            query (str): query string
            message_history (list[dict]): message history in openai format
        """
        messages = message_history + [{"role": "user", "content": query}]
        stream = await self.llm_api(messages=messages)
        async for i in stream:
            if i.choices[0].finish_reason == "stop":
                raise StopIteration
            yield i.choices[0].delta.content
