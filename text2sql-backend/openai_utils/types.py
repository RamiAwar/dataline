from typing import Protocol

from openai import Stream
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
    def __call__(self, messages: list[TMessage]) -> Stream[ChatCompletionChunk]: ...
