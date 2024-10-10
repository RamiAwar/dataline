from mirascope.openai import OpenAICall, OpenAICallParams


class ConversationTitleGenerator(OpenAICall):
    api_key: str | None
    base_url: str | None = None
    call_params: OpenAICallParams = OpenAICallParams(model="gpt-4o-mini")
    prompt_template = """
    You are a highly skilled title generator. Your task is to create a concise, engaging title based on the user's initial message or request.

    Input:
    ---BEGIN User Message---
    {first_message}
    ---END User Message---

    Instructions:
    1. Analyze the user's message to identify the core topic or request.
    2. Generate a title that accurately reflects this core idea.
    3. Ensure the title is 5 words or fewer.
    4. Make the title catchy and interesting while maintaining accuracy.
    5. Do not use unnecessary articles (a, an, the) unless essential for meaning.
    6. Avoid using punctuation in the title unless absolutely necessary.

    Output your title on a single line, with no additional explanation or commentary.
    """

    first_message: str
