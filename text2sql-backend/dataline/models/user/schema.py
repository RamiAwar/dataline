from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    openai_api_key: Optional[str] = None
    sentry_enabled: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    openai_api_key: Optional[str] = None
    sentry_enabled: bool


class AvatarOut(BaseModel):
    blob: str
