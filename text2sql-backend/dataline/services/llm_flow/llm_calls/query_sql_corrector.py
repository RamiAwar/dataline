from typing import Optional, Type

from mirascope import tags
from mirascope.openai import OpenAICallParams, OpenAIExtractor
from pydantic import BaseModel


class SQLCorrectionDetails(BaseModel):
    needs_correction: bool
    query: Optional[str] = None


@tags(["version:0001"])
class QuerySQLCorrectorCall(OpenAIExtractor[SQLCorrectionDetails]):
    extract_schema: Type[SQLCorrectionDetails] = SQLCorrectionDetails
    call_params = OpenAICallParams(model="gpt-3.5-turbo")
    api_key: str | None

    prompt_template = """
    {query}

    I should try to get this right to make sure I get a reward!
    Double check the {dialect} query above for common mistakes, including:
    - Using NOT IN with NULL values
    - Using UNION when UNION ALL should have been used
    - Using BETWEEN for exclusive ranges
    - Data type mismatch in predicates
    - Properly quoting identifiers
    - Using the correct number of arguments for functions
    - Casting to the correct data type
    - Using the proper columns for joins
    - Using ambiguous column names, which you do very often!

    If the query is correct, set needs_correction to False and DO NOT fill in the query again.
    If the query needs correction, set needs_correction to True and fill in the corrected query as well.
    """

    query: str
    dialect: str
