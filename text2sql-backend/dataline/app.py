import logging
from typing import Any, AsyncContextManager, Callable, Mapping, Self

import fastapi
from fastapi import Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from dataline.api.connection.router import router as connection_router
from dataline.api.conversation.router import router as conversation_router
from dataline.api.settings.router import router as settings_router
from dataline.errors import ValidationError
from dataline.llm import OpenAIError
from dataline.repositories.base import NotFoundError, NotUniqueError

logger = logging.getLogger(__name__)


def handle_exceptions(request: Request, e: Exception) -> JSONResponse:
    if isinstance(e, NotFoundError):
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"message": e.message})
    elif isinstance(e, NotUniqueError):
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"message": e.message})
    elif isinstance(e, OpenAIError):
        return JSONResponse(status_code=status.HTTP_406_NOT_ACCEPTABLE, content={"message": e.message})
    elif isinstance(e, ValidationError):
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"message": str(e)})

    logger.exception(e)
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"message": str(e)})


class App(fastapi.FastAPI):
    def __init__(  # type: ignore[misc]
        self,
        lifespan: Callable[[Self], AsyncContextManager[Mapping[str, Any]]] | None = None,
    ) -> None:
        super().__init__(title="Dataline API", lifespan=lifespan)
        self.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        self.include_router(settings_router)
        self.include_router(connection_router)
        self.include_router(conversation_router)

        # Handle 500s separately to play well with TestClient and allow re-raising in tests
        self.add_exception_handler(NotFoundError, handle_exceptions)
        self.add_exception_handler(NotUniqueError, handle_exceptions)
        self.add_exception_handler(OpenAIError, handle_exceptions)
        self.add_exception_handler(ValidationError, handle_exceptions)
        self.add_exception_handler(Exception, handle_exceptions)
