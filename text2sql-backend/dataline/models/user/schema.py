from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    openai_api_key: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    openai_api_key: Optional[str] = None


class AvatarOut(BaseModel):
    blob: str
