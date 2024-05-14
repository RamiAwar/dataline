from typing import Type

from dataline.models.message.model import MessageModel
from dataline.models.message.schema import MessageCreate, MessageUpdate
from dataline.repositories.base import BaseRepository


class MessageRepository(BaseRepository[MessageModel, MessageCreate, MessageUpdate]):
    @property
    def model(self) -> Type[MessageModel]:
        return MessageModel
