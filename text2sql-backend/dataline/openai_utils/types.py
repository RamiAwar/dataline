from typing import Any, Callable, Coroutine, Protocol

from openai import AsyncStream
from openai.types.chat import (
    ChatCompletionAssistantMessageParam,
    ChatCompletionChunk,
    ChatCompletionFunctionMessageParam,
    ChatCompletionSystemMessageParam,
    ChatCompletionToolMessageParam,
    ChatCompletionUserMessageParam,
)

TMessage = (
    ChatCompletionAssistantMessageParam
    | ChatCompletionSystemMessageParam
    | ChatCompletionUserMessageParam
    | ChatCompletionFunctionMessageParam
    | ChatCompletionToolMessageParam
)


class LLMApiProtocol(Protocol):
    def __call__(self, messages: list[TMessage]) -> Coroutine[Any, Any, AsyncStream[ChatCompletionChunk]]: ...
