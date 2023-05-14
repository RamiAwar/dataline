from langchain import OpenAI
from langchain.chat_models import ChatOpenAI
from llama_index import GPTSimpleVectorIndex, GPTSQLStructStoreIndex, LLMPredictor
from llama_index.indices.service_context import ServiceContext
from sqlalchemy import create_engine, inspect

from context_builder import CustomSQLContextContainerBuilder
from errors import RelatedTablesNotFoundError
from sql_wrapper import CustomSQLDatabase

CONTEXT_QUERY_TEMPLATE = (
    "Please return the relevant table names in a comma separated list like 'table1,table2'"
    "for the following query: '{orig_query_str}' "
)


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

    def query(self, query: str):
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

        # Query with table context
        context_container = self.context_builder.build_context_container()
        return self.sql_index.query(query, sql_context_container=context_container)
