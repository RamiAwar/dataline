from mirascope.core import prompt_template
from pydantic import BaseModel


class ConversationTitleGeneratorResponse(BaseModel):
    title: str


@prompt_template()
def conversation_title_generator_prompt(user_message: str) -> str:

    return f"""
    Your task is to create a concise, descriptive title based on the user's initial chat message or request.

    Instructions:
    1. Analyze the user's message to identify the core topic or request.
    2. Generate a title that accurately reflects this core idea.
    3. Ensure the title is 6 words or fewer.
    4. Make the title as descriptive as possible.
    5. Do not use unnecessary articles (a, an, the) unless essential for meaning.
    6. Avoid using punctuation in the title unless absolutely necessary.

    Output your title on a single line, with no additional explanation or commentary.
    User's first message is: {user_message}
    """
