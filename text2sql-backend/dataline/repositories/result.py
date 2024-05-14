from typing import Type

from dataline.models.result.model import ResultModel
from dataline.models.result.schema import ResultCreate, ResultUpdate
from dataline.repositories.base import BaseRepository


class ResultRepository(BaseRepository[ResultModel, ResultCreate, ResultUpdate]):
    @property
    def model(self) -> Type[ResultModel]:
        return ResultModel
