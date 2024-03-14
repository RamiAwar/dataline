"""SQL Container builder."""

import logging
from typing import Any, Optional, Union

from llama_index.indices.query.schema import QueryBundle
from llama_index.indices.struct_store import SQLContextContainerBuilder

import db
from llm import ChatLLM
from models import Connection
from sql_wrapper import CustomSQLDatabase
from tokenizer import num_tokens_from_string

CONTEXT_QUERY_TEMPLATE = (
    "You are a data scientist whose job is to write SQL queries. You need to select tables for a query."
    "ONLY return the relevant table names in a comma separated list like 'table1,table2' "
    "DO NOT return anything else."
    "Available table descriptions (only foreign keys relevant for selection): '{table_names}'"
    "Query: '{orig_query_str}'"
    "Relevant tables: "
)


logger = logging.getLogger(__name__)


class CustomSQLContextContainerBuilder(SQLContextContainerBuilder):
    """SQLContextContainerBuilder.

    Build a SQLContextContainer that can be passed to the SQL index
    during index construction or during queryt-time.

    NOTE: if context_str is specified, that will be used as context
    instead of context_dict

    Args:
        sql_database (SQLDatabase): SQL database
        context_dict (Optional[dict[str, str]]): context dict

    """

    def __init__(
        self,
        connection: Connection,
        sql_database: CustomSQLDatabase,
        openai_api_key: str,
        context_dict: Optional[dict[str, str]] = None,
        context_str: Optional[str] = None,
        model: Optional[str] = "gpt-4",
        embedding_model: Optional[str] = "text-embedding-ada-002",
        temperature: Optional[int] = 0.0,
    ):
        """Initialize params."""
        self.connection: Connection = connection
        self.sql_database = sql_database
        self.llm = ChatLLM(model=model, openai_api_key=openai_api_key, temperature=temperature)

        # If context_dict provided, validate that all keys are valid table names
        if context_dict is not None:
            # validate context_dict keys are valid table names
            context_keys = set(context_dict.keys())
            if not context_keys.issubset(set(self.sql_database.get_usable_table_names())):
                raise ValueError(
                    "Invalid context table names: " f"{context_keys - set(self.sql_database.get_usable_table_names())}"
                )

        self.context_dict = context_dict or {}

        # build full context from sql_database
        self.full_context_dict = self._build_context_from_sql_database(current_context=self.context_dict)
        self.context_str = context_str

    def _build_context_from_sql_database(
        self,
        current_context: Optional[dict[str, str]] = None,
    ) -> dict[str, str]:
        """Get tables schema + optional context as a single string."""
        descriptions = db.get_table_schemas_with_descriptions(self.connection.id)
        return self.sql_database.get_schema_with_user_descriptions(descriptions)

    async def get_relevant_table_context(  # type: ignore[misc]
        self,
        query_str: Union[str, QueryBundle],
        message_history: Optional[list[dict]] = [],
        query_tmpl: Optional[str] = CONTEXT_QUERY_TEMPLATE,
        store_context_str: bool = True,
        **index_kwargs: Any,
    ) -> tuple[str, list[str]]:
        """Query LLM for table context.

        Args:
            query_str (Union[str, QueryBundle]): query string or QueryBundle
            message_history (Optional[list[dict]]): message history
            query_tmpl (Optional[str]): query template
            store_context_str (bool): store context string
            **index_kwargs (Any): index kwargs

        """
        table_foreign_key_schemas = "\n".join(self.sql_database.get_schema_foreign_keys().values())
        context_query_str = query_tmpl.format(
            orig_query_str=query_str,
            table_names=table_foreign_key_schemas,
        )

        if num_tokens_from_string(context_query_str) > 8100:
            # Fall back to using simple schema
            print("Schema too long, falling back to simple schema")
            table_schema = "\n".join(self.sql_database.get_simple_schema().keys())
            context_query_str = query_tmpl.format(
                orig_query_str=query_str,
                table_names=table_schema,
            )

        # Query LLM
        response = await self.llm.query(query=context_query_str, message_history=message_history)

        try:
            table_names = []
            split_response = str(response).strip().split(",")
            for table_name in split_response:
                # Remove unnecessary/invalid characters
                table_name = table_name.strip()
                table_name = table_name.replace("'", "").replace('"', "")
                table_names.append(table_name)

        except Exception as e:
            context_query_str = f"""You returned {str(response)} but that raised an exception: {str(e)}.\n{query_tmpl.format(orig_query_str=query_str)}"""
            logger.debug("\n\n------------------\n\n")
            logger.debug(f"Reasking with query: {context_query_str}")
            logger.debug("\n\n------------------\n\n")
            response = await self.llm.query(query=context_query_str, message_history=message_history)

        # Check if any table names are invalid
        invalid_table_names = [
            table_name for table_name in table_names if table_name not in self.sql_database.get_table_names()
        ]

        # Try to correct or reask once
        if invalid_table_names:
            # Attempt to autocorrect with fuzzy matching
            for table_name in invalid_table_names:
                closest = self.sql_database.get_closest_table_name(table_name)
                if closest:
                    table_names.remove(table_name)
                    invalid_table_names.remove(table_name)
                    table_names.append(closest)

            # If autocorrect not complete, try reasking
            if invalid_table_names:
                table_names = query_tmpl.format(
                    orig_query_str=query_str,
                    table_names=",".join(self.sql_database.get_table_names()),
                )
                context_query_str = f"""You returned {str(response)} but that contained invalid table names: {invalid_table_names}.\n{table_names}"""
                logger.debug("\n\n------------------\n\n")
                logger.debug(f"Invalid table names: Reasking with query: {context_query_str}")
                logger.debug("\n\n------------------\n\n")
                response = await self.llm.query(query=context_query_str, message_history=message_history)

                table_names = [s.strip() for s in str(response).strip().split(",")]
                if any(table_name not in self.sql_database.get_table_names() for table_name in table_names):
                    logger.info("Invalid table names: Reasking failed - continuing anyway")

        context_str = ""
        for table_name in table_names:
            context_str += self.full_context_dict[table_name.strip()] + "\n"

        if store_context_str:
            self.context_str = context_str

        return context_str, table_names
