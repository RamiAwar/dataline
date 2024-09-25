import base64
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Response, Body

from dataline.auth import validate_credentials
from dataline.utils.posthog import posthog_capture

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={401: {"description": "Incorrect username or password"}},
)


@router.post("/login")
async def login(
    username: Annotated[str, Body()],
    password: Annotated[str, Body()],
    response: Response,
    background_tasks: BackgroundTasks,
) -> Response:
    background_tasks.add_task(posthog_capture, "user_logged_in")

    validate_credentials(username, password)
    ascii_encoded = f"{username}:{password}".encode("ascii")
    token = base64.b64encode(ascii_encoded).decode("utf-8")
    response.status_code = 200
    response.set_cookie(key="Authorization", value=f"Basic {token}", secure=True, httponly=True)
    return response


@router.post("/logout")
async def logout(response: Response) -> Response:
    response.status_code = 200
    response.delete_cookie(key="Authorization", secure=True, httponly=True)
    return response


@router.head("/login")
async def login_head() -> Response:
    return Response(status_code=200)
