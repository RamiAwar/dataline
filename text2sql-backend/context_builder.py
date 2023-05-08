"""SQL Container builder."""


from typing import Any, Dict, List, Optional, Type, Union

from llama_index.indices.base import BaseGPTIndex
from llama_index.indices.common.struct_store.base import SQLDocumentContextBuilder
from llama_index.indices.common.struct_store.schema import SQLContextContainer
from llama_index.indices.query.schema import QueryBundle
from llama_index.indices.struct_store import SQLContextContainerBuilder
from llama_index.langchain_helpers.sql_wrapper import SQLDatabase
from llama_index.readers.base import Document
from llama_index.schema import BaseDocument

DEFAULT_CONTEXT_QUERY_TMPL = (
    "Please return the relevant table names in a comma separated list like 'table1,table2' "
    "for the following query: {orig_query_str}"
)


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
        sql_database: SQLDatabase,
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
            self.sql_database, current_context=self.context_dict
        )
        self.context_str = context_str

    def query_index_for_context(
        self,
        index: BaseGPTIndex,
        query_str: Union[str, QueryBundle],
        query_tmpl: Optional[str] = DEFAULT_CONTEXT_QUERY_TMPL,
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
        if query_tmpl is None:
            context_query_str = query_str
        else:
            context_query_str = query_tmpl.format(orig_query_str=query_str)
        response = index.query(context_query_str, **index_kwargs)

        table_names = str(response).strip().split(",")
        context_str = ""
        for table_name in table_names:
            # TODO: Build some matching to get closest table name maybe for more robustness
            context_str += self.full_context_dict[table_name.strip()] + "\n"

        if store_context_str:
            self.context_str = context_str
        return context_str
