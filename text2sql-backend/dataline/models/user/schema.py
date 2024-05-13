from typing import Optional

import openai

# from langchain_core.pydantic_v1 import SecretStr
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    field_serializer,
    field_validator,
)

from dataline.config import config


class UserUpdateIn(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=250)
    openai_api_key: Optional[SecretStr] = Field(None, min_length=4)
    preferred_openai_model: Optional[str] = None

    @field_validator("openai_api_key")
    @classmethod
    def check_openai_key(cls, openai_key: SecretStr) -> SecretStr:
        print("Here")
        print(openai_key)
        client = openai.OpenAI(api_key=openai_key.get_secret_value())
        try:
            required_models = [config.default_model, "gpt-3.5-turbo"]
            models = client.models.list()
            if not any(model.id == required_model for model in models for required_model in required_models):
                raise ValueError(f"Must have access to at least one of {required_models}")
        except openai.AuthenticationError as e:
            print(e)
            raise ValueError("Invalid OpenAI Key") from e
        return openai_key

    @field_serializer("openai_api_key")
    def dump_openai_api_key(self, v: SecretStr) -> str:
        return v.get_secret_value()


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    openai_api_key: Optional[SecretStr] = None
    preferred_openai_model: Optional[str] = None


class UserWithKey(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None

    openai_api_key: SecretStr
    preferred_openai_model: str


class AvatarOut(BaseModel):
    blob: str
