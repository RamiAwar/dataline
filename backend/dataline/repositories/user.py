from typing import Optional, Type

from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from dataline.models.user.model import UserModel
from dataline.repositories.base import AsyncSession, BaseRepository, NotFoundError


class UserCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    name: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_base_url: str | None = None
    langsmith_api_key: Optional[str] = None
    preferred_openai_model: Optional[str] = None
    sentry_enabled: Optional[bool] = True


class UserUpdate(UserCreate):
    sentry_enabled: Optional[bool] = None


class UserRepository(BaseRepository[UserModel, UserCreate, UserUpdate]):
    @property
    def model(self) -> Type[UserModel]:
        return UserModel

    async def get_one_or_none(self, session: AsyncSession) -> Optional[UserModel]:
        query = select(self.model)
        try:
            return await self.first(session, query=query)
        except NotFoundError:
            return None
