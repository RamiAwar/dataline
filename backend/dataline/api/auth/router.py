import base64
from typing import Annotated

import fastapi

from dataline.auth import validate_credentials
from dataline.utils.posthog import PosthogAnalytics

router = fastapi.APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={401: {"description": "Incorrect username or password"}},
)


@router.post("/login")
async def login(
    username: Annotated[str, fastapi.Body()], password: Annotated[str, fastapi.Body()], response: fastapi.Response
) -> fastapi.Response:
    async with PosthogAnalytics() as (ph, user):
        ph.capture(user.id, "user_logged_in")  # type: ignore[no-untyped-call]

    validate_credentials(username, password)
    ascii_encoded = f"{username}:{password}".encode("ascii")
    token = base64.b64encode(ascii_encoded).decode("utf-8")
    response.status_code = 200
    response.set_cookie(key="Authorization", value=f"Basic {token}", secure=True, httponly=True)
    return response


@router.post("/logout")
async def logout(response: fastapi.Response) -> fastapi.Response:
    response.status_code = 200
    response.delete_cookie(key="Authorization", secure=True, httponly=True)
    return response


@router.head("/login")
async def login_head() -> fastapi.Response:
    return fastapi.Response(status_code=200)
