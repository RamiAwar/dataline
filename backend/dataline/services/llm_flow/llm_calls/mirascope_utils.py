from typing import Callable, Literal, ParamSpec, TypeVar

from mirascope.core import openai
from mirascope.core.base import BaseMessageParam
from openai import OpenAI
from pydantic import BaseModel


class OpenAIClientOptions(BaseModel):
    api_key: str
    base_url: str | None = None


AvailableModels = Literal["gpt-3.5-turbo"] | Literal["gpt-4o-mini"]

_T = TypeVar("_T", bound=BaseModel)
P = ParamSpec("P")


def call(
    model: AvailableModels,
    response_model: type[_T],
    prompt_fn: Callable[P, list[BaseMessageParam]],
    client_options: OpenAIClientOptions,
) -> Callable[P, _T]:
    # Only openai supported for now, just use that
    return openai.call(
        model=model,
        response_model=response_model,
        json_mode=True,
        client=OpenAI(api_key=client_options.api_key, base_url=client_options.base_url),
    )(prompt_fn)
