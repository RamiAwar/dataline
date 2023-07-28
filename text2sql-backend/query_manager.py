import functools
from typing import Dict, List, Optional

import openai
from guardrails.embedding import OpenAIEmbedding

from prompts import SQL_QUERY_PROMPT


class SQLQueryManager:
    def __init__(
        self,
        dsn: str,
        examples: Optional[Dict] = None,
        model: Optional[str] = "gpt-3.5-turbo",
        embedding_model: Optional[str] = "text-embedding-ada-002",
        temperature: Optional[int] = 0.0,
    ):
        self.llm_api = functools.partial(
            openai.ChatCompletion.create,
            model=model,
            temperature=temperature,
            stream=True,
        )
        self.embedding_model = OpenAIEmbedding(model=embedding_model)

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
        message_history: Optional[List[Dict]] = [],
    ):
        # Generate prompt
        prompt = self.generate_prompt(
            query,
            schema=table_context,
        )

        # Stream base generator until empty
        messages = message_history + [{"role": "user", "content": prompt}]

        for i in self.llm_api(messages=messages):
            if i["choices"][0].get("finish_reason") == "stop":
                break
            yield i["choices"][0]["delta"]["content"]
