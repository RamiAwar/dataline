import functools
from enum import Enum
from typing import Any, Dict, Iterable, List, Optional, TypedDict

import openai
from guardrails.embedding import OpenAIEmbedding
from langchain import OpenAI
from llama_index import GPTSimpleVectorIndex, GPTSQLStructStoreIndex, LLMPredictor
from llama_index.indices.service_context import ServiceContext
from openai import ChatCompletion
from sqlalchemy import create_engine, inspect

import db
from context_builder import CustomSQLContextContainerBuilder
from errors import RelatedTablesNotFoundError
from sql_wrapper import CustomSQLDatabase

CONTEXT_QUERY_TEMPLATE = (
    "Please return the relevant table names in a comma separated list like 'table1,table2'"
    "for the following query: '{orig_query_str}' "
)


# TODO: Add dialect support
SQL_QUERY_PROMPT = (
    "You are a data scientist whose job is to write SQL queries."
    "ONLY return a valid SQL query (no other text is necessary)."
    "Try to use descriptive table aliases and avoid using single letter aliases, like using 'users' instead of 'u'."
    "You can order the results by a relevant column to return the most interesting data from the results."
    "Never query for all the columns from a specific table, only ask for a few relevant columns given the question."
    # "Try to avoid using joins if the data can be retrieved from the same table."
    "Here's the database schema that you should use to generate the SQL query, don't use any tables not listed here: {schema}"
    "Question: {query_string}"
    "SQL Query: "
)

SQL_REASK_QUERY_PROMPT = (
    "You are a data scientist whose job is to write SQL queries."
    "ONLY return a valid SQL query (no other text is necessary)."
    "Try to use descriptive table aliases and avoid using single letter aliases, like using 'users' instead of 'u'."
    "You can order the results by a relevant column to return the most interesting data from the results."
    "Never query for all the columns from a specific table, only ask for a few relevant columns given the question."
    # "Try to avoid using joins if the data can be retrieved from the same table."
    "Here's the database schema that you should use to generate the SQL query, don't use any tables not listed here: {schema}"
    "Question: {query_string}"
    "For this instruction, I was given the following query: {previous_response}"
    "But I got this error, so help me correct it: {error_message}"
    "SQL Query: "
)

MAX_REASKS = 3


class StreamingEventType(str, Enum):
    APPEND = "append"
    RESULTS = "results"
    ERROR = "error"
    COMPLETE = "complete"


class StreamingSQLQueryManager:
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

        # TODO: Create conversation in DB if no message history is provided

    def generate_prompt(
        self,
        query: str,
        schema: str,
        reask: bool = False,
        error_context: Optional[str] = None,
    ):
        # TODO: Fetch similar examples

        # TODO: Is is better to reask with just the error context or the full query again? Conversation history might be sufficient.
        if reask:
            return SQL_REASK_QUERY_PROMPT.format(
                schema=schema,
                query_string=query,
                previous_response=self.latest_response,
                error_message=error_context,
            )
        else:
            return SQL_QUERY_PROMPT.format(schema=schema, query_string=query)

    def process_chunks(self, chunks: Iterable[ChatCompletion]):
        response = ""
        for chunk in chunks:
            token = chunk["choices"][0]["delta"].get("content", "")
            response += token
            yield token

        self.latest_response = response

    def query(
        self,
        query: str,
        table_context: str,
        reask: bool = False,
        error_context: Optional[str] = None,
        message_history: Optional[List[Dict]] = [],
    ):
        # Generate prompt
        prompt = self.generate_prompt(
            query, schema=table_context, reask=reask, error_context=error_context
        )

        # Stream base generator until empty
        messages = message_history + [{"role": "user", "content": prompt}]
        chunks = self.llm_api(messages=messages)
        yield from self.process_chunks(chunks)


class QueryService:
    def __init__(
        self,
        dsn: str,
        schema_index_file: str,
        model_name: str = "gpt-3.5-turbo",
        temperature: int = 0.0,
    ):
        self.llm_predictor = LLMPredictor(
            llm=OpenAI(temperature=temperature, model_name=model_name)
        )
        self.service_context = ServiceContext.from_defaults(
            llm_predictor=self.llm_predictor
        )

        self.engine = create_engine(dsn)
        self.insp = inspect(self.engine)
        self.table_names = self.insp.get_table_names()
        self.sql_db = CustomSQLDatabase(self.engine, include_tables=self.table_names)
        self.context_builder = CustomSQLContextContainerBuilder(self.sql_db)

        # Schema index already built in connect step
        self.table_schema_index = GPTSimpleVectorIndex.load_from_disk(schema_index_file)
        self.sql_index = GPTSQLStructStoreIndex(
            [],
            sql_database=self.sql_db,
            table_name=self.table_names,
            service_context=self.service_context,
        )

    def get_related_tables(self, query: str):
        # Fetch table context
        context_str = self.context_builder.query_index_for_context(
            index=self.table_schema_index,
            query_str=query,
            query_tmpl=CONTEXT_QUERY_TEMPLATE,
            store_context_str=True,
        )

        # If no table schemas found for context, raise error
        if context_str.strip() == "":
            raise RelatedTablesNotFoundError

        return context_str

    def query(self, query: str):
        # Fetch table context
        self.get_related_tables(query)

        # Query with table context
        context_container = self.context_builder.build_context_container()
        res = self.sql_index.query(query, sql_context_container=context_container)
        return res


class SQLResults(TypedDict):
    result: List[Dict[str, Any]]
    columns: List[str]


class StreamingQueryService(QueryService):
    def __init__(
        self,
        dsn: str,
        schema_index_file: str,
        model_name: str = "gpt-3.5-turbo",
        temperature: int = 0.0,
    ):
        self.llm_predictor = LLMPredictor(
            llm=OpenAI(temperature=temperature, model_name=model_name, streaming=True)
        )
        self.service_context = ServiceContext.from_defaults(
            llm_predictor=self.llm_predictor
        )

        self.engine = create_engine(dsn)
        self.insp = inspect(self.engine)
        self.table_names = self.insp.get_table_names()
        self.sql_db = CustomSQLDatabase(self.engine, include_tables=self.table_names)
        self.context_builder = CustomSQLContextContainerBuilder(self.sql_db)

        # Schema index already built in connect step
        self.table_schema_index = GPTSimpleVectorIndex.load_from_disk(schema_index_file)
        self.sql_index = StreamingSQLQueryManager(dsn=dsn, model=model_name)
        self.latest_message = None

    def get_related_tables(self, query: str):
        # Fetch table context
        context_str = self.context_builder.query_index_for_context(
            index=self.table_schema_index,
            query_str=query,
            query_tmpl=CONTEXT_QUERY_TEMPLATE,
            store_context_str=True,
        )

        # If no table schemas found for context, raise error
        if context_str.strip() == "":
            raise RelatedTablesNotFoundError

        return context_str

    def encode_events(self, generator: Iterable, event_type: StreamingEventType):
        for chunk in generator:
            yield {
                "event": event_type.value,
                "data": chunk,
            }

    def query(self, query: str, conversation_id: str):
        # Fetch table context
        context_str = self.get_related_tables(query)

        # Query with table context
        message_history = db.get_message_history(conversation_id)
        yield from self.encode_events(
            self.sql_index.query(
                query, table_context=context_str, message_history=message_history
            ),
            event_type=StreamingEventType.APPEND,
        )
        yield {"event": StreamingEventType.COMPLETE.value, "data": None}

        # Call sql wrapper with validation/correction loop
        query_result = self.sql_index.latest_response
        error = None
        try:
            _, with_columns = self.sql_db.run_sql(command=query_result)
            yield from self.encode_events(
                [with_columns], event_type=StreamingEventType.RESULTS
            )
        except Exception as e:
            error = str(e)

        if error:
            yield {"event": StreamingEventType.ERROR.value, "data": "Reasking"}
            yield from self.encode_events(
                self.sql_index.query(
                    query, table_context=context_str, reask=True, error_context=error
                ),
                event_type=StreamingEventType.APPEND,
            )
            try:
                _, with_columns = self.sql_db.run_sql(command=query_result)
                error = None
            except Exception:
                yield {
                    "event": StreamingEventType.ERROR.value,
                    "data": "SQL generation failed. Try clarifying your query.",
                }
            else:
                yield from self.encode_events(
                    self.sql_index.query(query, table_context=context_str),
                    event_type=StreamingEventType.APPEND,
                )

        # Add assistant message to message history
        db.add_message_to_conversation(
            conversation_id,
            self.sql_index.latest_response,
            role="assistant",
            results=[query_result],
        )
