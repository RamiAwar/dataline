from typing import Annotated

import fastapi

from dataline.auth import validate_credentials

router = fastapi.APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={401: {"description": "Incorrect username or password"}},
)


@router.post("/login")
async def login(username: Annotated[str, fastapi.Body()], password: Annotated[str, fastapi.Body()]) -> fastapi.Response:
    validate_credentials(username, password)
    return fastapi.Response(status_code=200)


@router.head("/login")
async def login_head() -> fastapi.Response:
    return fastapi.Response(status_code=200)
