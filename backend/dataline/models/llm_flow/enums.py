from enum import Enum


class QueryResultType(Enum):
    SQL_QUERY_RUN_RESULT = "SQL_QUERY_RUN_RESULT"
    SQL_QUERY_STRING_RESULT = "SQL_QUERY_STRING_RESULT"
    SELECTED_TABLES = "SELECTED_TABLES"
    CHART_GENERATION_RESULT = "CHART_GENERATION_RESULT"


class StreamingEventType(str, Enum):
    QUERY_OUT = "queryOutEvent"
    ADD_RESULT = "addResultEvent"
