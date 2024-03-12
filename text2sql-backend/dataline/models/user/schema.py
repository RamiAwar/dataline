from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field


class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    openai_api_key: Optional[str] = None
    sentry_enabled: Annotated[bool | None, Field(alias="sentryEnabled")] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    openai_api_key: Optional[str] = None
    sentry_enabled: bool


class AvatarOut(BaseModel):
    blob: str
