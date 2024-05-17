import functools
import logging
from typing import Optional

import openai
from openai.types.chat import ChatCompletionChunk

from dataline.errors import ValidationError
from dataline.prompts import SQL_QUERY_PROMPT, SQL_REASK_QUERY_PROMPT
from dataline.tokenizer import num_tokens_from_string

logger = logging.getLogger(__name__)


# TODO: Refactor to use ChatLLM
class SQLQueryManager:
    def __init__(
        self,
        dsn: str,
        openai_api_key: str,
        model: str,
        examples: Optional[dict] = None,
        embedding_model: Optional[str] = "text-embedding-ada-002",
        temperature: float = 0.0,
    ):
        self.model = model
        self.temperature = temperature
        self.openai_client = openai.OpenAI(
            api_key=openai_api_key,
        )
        self.llm_api = functools.partial(
            self.openai_client.chat.completions.create,
            model=model,
            temperature=temperature,
            stream=True,
        )

    def generate_prompt(
        self,
        query: str,
        schema: str,
    ):
        return SQL_QUERY_PROMPT.format(schema=schema, query_string=query)

    def query(
        self,
        query: str,
        table_context: str,
        message_history: list[dict] = [],
    ):
        # Generate prompt
        prompt = self.generate_prompt(
            query,
            schema=table_context,
        )

        if num_tokens_from_string(prompt) > 8192:
            raise ValidationError("Prompt is too long. Please reduce the number of tables in your query.")

        # Stream base generator until empty
        messages = message_history[-2:] + [{"role": "user", "content": prompt}]

        chunk: ChatCompletionChunk
        for chunk in self.openai_client.chat.completions.create(
            model=self.model,
            temperature=self.temperature,
            stream=True,
            messages=messages,
        ):
            if chunk.choices[0].finish_reason == "stop":
                break
            yield chunk.choices[0].delta.content

    def reask(self, original_query: str, wrong_sql: str, table_context: str, error: str):
        query = SQL_REASK_QUERY_PROMPT.format(
            schema=table_context,
            query_string=original_query,
            previous_response=wrong_sql,
            error_message=error,
        )
        logger.debug("\n\n------------------\n\n")
        logger.debug("Reask prompt: ", query)
        logger.debug("\n\n------------------\n\n")

        messages = [{"role": "user", "content": query}]

        chunk: ChatCompletionChunk
        for chunk in self.openai_client.chat.completions.create(
            model=self.model,
            temperature=self.temperature,
            stream=True,
            messages=messages,
        ):
            if chunk.choices[0].finish_reason == "stop":
                break
            yield chunk.choices[0].delta.content
