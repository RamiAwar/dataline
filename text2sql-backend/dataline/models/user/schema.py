from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class UserUpdateIn(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=250)
    openai_api_key: Optional[str] = Field(None, min_length=1)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    openai_api_key: Optional[str] = None


class AvatarOut(BaseModel):
    blob: str
