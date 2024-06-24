from enum import Enum


class QueryResultType(Enum):
    SQL_QUERY_RUN_RESULT = "SQL_QUERY_RUN_RESULT"
    SQL_QUERY_STRING_RESULT = "SQL_QUERY_STRING_RESULT"
    SELECTED_TABLES = "SELECTED_TABLES"
    CHART_GENERATION_RESULT = "CHART_GENERATION_RESULT"


class QueryStreamingEventType(str, Enum):
    STORED_MESSAGES = "stored_messages_event"
    ADD_RESULT = "add_result_event"
    ERROR = "error_event"
