from typing import Optional, Type

from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from dataline.models.user import UserModel
from dataline.repositories.base import AsyncSession, BaseRepository, NotFoundError


class UserCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    name: Optional[str] = None
    openai_api_key: Optional[str] = None


class UserUpdate(UserCreate):
    ...


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
