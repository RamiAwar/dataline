from mirascope.openai import OpenAICall


class ConversationTitleGenerator(OpenAICall):
    api_key: str | None
    prompt_template = """
    ---BEGIN First Message---
    {first_message}
    ---END First Message---

    Generate a concise title based on the user's first message or request.
    Summarize the main point in 5 words or fewer.
    Be as concise as possible while capturing the essence of the user's initial request.
    """

    first_message: str
