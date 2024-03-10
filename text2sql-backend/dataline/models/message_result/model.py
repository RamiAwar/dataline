from sqlalchemy import ForeignKey
from sqlalchemy.orm import mapped_column, Mapped

from dataline.models.base import DBModel
from dataline.models.message import MessageModel
from dataline.models.result import ResultModel


class MessageResultModel(DBModel):
    __tablename__ = "message_results"
    message_id: Mapped[int] = mapped_column(ForeignKey(MessageModel.id), primary_key=True)
    result_id: Mapped[int] = mapped_column(ForeignKey(ResultModel.id), primary_key=True)
