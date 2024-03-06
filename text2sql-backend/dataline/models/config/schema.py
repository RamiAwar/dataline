from typing import Optional

from pydantic import BaseModel


class AvatarOut(BaseModel):
    blob: str


class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    openai_api_key: Optional[str] = None
