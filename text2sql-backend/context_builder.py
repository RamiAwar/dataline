"""SQL Container builder."""


import logging
from typing import Any, Dict, Optional, Union

from llama_index.indices.base import BaseGPTIndex
from llama_index.indices.query.schema import QueryBundle
from llama_index.indices.struct_store import SQLContextContainerBuilder

from sql_wrapper import CustomSQLDatabase

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
        context_dict (Optional[Dict[str, str]]): context dict

    """

    def __init__(
        self,
        sql_database: CustomSQLDatabase,
        context_dict: Optional[Dict[str, str]] = None,
        context_str: Optional[str] = None,
    ):
        """Initialize params."""
        self.sql_database = sql_database

        # if context_dict provided, validate that all keys are valid table names
        if context_dict is not None:
            # validate context_dict keys are valid table names
            context_keys = set(context_dict.keys())
            if not context_keys.issubset(
                set(self.sql_database.get_usable_table_names())
            ):
                raise ValueError(
                    "Invalid context table names: "
                    f"{context_keys - set(self.sql_database.get_usable_table_names())}"
                )
        self.context_dict = context_dict or {}
        # build full context from sql_database
        self.full_context_dict = self._build_context_from_sql_database(
            current_context=self.context_dict
        )
        self.context_str = context_str

    def _build_context_from_sql_database(
        self,
        current_context: Optional[Dict[str, str]] = None,
    ) -> Dict[str, str]:
        """Get tables schema + optional context as a single string."""
        return self.sql_database.get_simple_schema()

    def query_index_for_context(
        self,
        index: BaseGPTIndex,
        query_str: Union[str, QueryBundle],
        query_tmpl: Optional[str] = CONTEXT_QUERY_TEMPLATE,
        store_context_str: bool = True,
        **index_kwargs: Any,
    ) -> str:
        """Query index for context.

        A simple wrapper around the index.query call which
        injects a query template to specifically fetch table information,
        and can store a context_str.

        Args:
            index (BaseGPTIndex): index data structure
            query_str (Union[str, QueryBundle]): query string
            query_tmpl (Optional[str]): query template
            store_context_str (bool): store context_str

        """
        table_foreign_key_schemas = "\n".join(
            self.sql_database.get_schema_foreign_keys().values()
        )
        context_query_str = query_tmpl.format(
            orig_query_str=query_str,
            table_names=table_foreign_key_schemas,
        )

        # Query LLM
        response = index.query(context_query_str, **index_kwargs)

        logger.debug(f"Context query: {context_query_str}")
        logger.debug(f"Context query response: {response}")

        # Validate table names
        try:
            table_names = [s.strip() for s in str(response).strip().split(",")]
        except Exception as e:
            context_query_str = f"""You returned {str(response)} but that raised an exception: {str(e)}.\n{query_tmpl.format(orig_query_str=query_str)}"""
            logger.debug(f"Reasking with query: {context_query_str}")
            response = index.query(context_query_str, **index_kwargs)

        invalid_table_names = [
            table_name
            for table_name in table_names
            if table_name not in self.sql_database.get_table_names()
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
                context_query_str = f"""You returned {str(response)} but that contained invalid table names: {invalid_table_names}.\n{query_tmpl.format(orig_query_str=query_str, table_names=",".join(self.sql_database.get_table_names()))}"""
                logger.debug(
                    f"Invalid table names: Reasking with query: {context_query_str}"
                )
                response = index.query(context_query_str, **index_kwargs)
                table_names = [s.strip() for s in str(response).strip().split(",")]
                if any(
                    table_name not in self.sql_database.get_table_names()
                    for table_name in table_names
                ):
                    logger.info(
                        "Invalid table names: Reasking failed - continuing anyway"
                    )

        context_str = ""
        for table_name in table_names:
            context_str += self.full_context_dict[table_name.strip()] + "\n"

        if store_context_str:
            self.context_str = context_str

        return context_str
