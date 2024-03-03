from typing import Optional, Type

from pydantic import BaseModel, ConfigDict

from dataline.models.media.model import MediaModel
from dataline.repositories.base import BaseRepository


class MediaCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    key: str
    blob: bytes


class MediaUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    key: Optional[str] = None
    blob: Optional[bytes] = None


class MediaRepository(BaseRepository[MediaModel, MediaCreate, MediaUpdate]):
    @property
    def model(self) -> Type[MediaModel]:
        return MediaModel
