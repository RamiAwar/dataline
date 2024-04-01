from typing import Optional

import openai
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserUpdateIn(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=250)
    openai_api_key: Optional[str] = Field(None, min_length=4, pattern=r"^sk-(\w|\d)+$")

    @field_validator("openai_api_key")
    @classmethod
    def check_openai_key(cls, openai_key: str) -> str:
        client = openai.OpenAI(api_key=openai_key)
        try:
            client.models.list()
        except openai.AuthenticationError as e:
            raise ValueError("Invalid OpenAI Key") from e
        return openai_key


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    openai_api_key: Optional[str] = None


class AvatarOut(BaseModel):
    blob: str
