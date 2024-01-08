import binascii
import os
from base64 import b64decode
from typing import Annotated, Optional

from fastapi import Depends, Header, Request
from fastapi.exceptions import HTTPException
from fastapi.security import HTTPBasic
from fastapi.security.utils import get_authorization_scheme_param
from pydantic import BaseModel
from starlette.status import HTTP_401_UNAUTHORIZED

from supabase import Client, create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLIC_KEY = os.getenv("SUPABASE_PUBLIC_KEY")


Auth = Client


class AuthTokens(BaseModel):
    x_access_token: Annotated[str, Header()]
    x_refresh_token: Annotated[str, Header()]


class CustomAuth(HTTPBasic):
    async def __call__(  # type: ignore
        self, request: Request
    ) -> Optional[AuthTokens]:
        authorization = request.headers.get("Authorization")
        scheme, param = get_authorization_scheme_param(authorization)
        if self.realm:
            unauthorized_headers = {"WWW-Authenticate": f'Basic realm="{self.realm}"'}
        else:
            unauthorized_headers = {"WWW-Authenticate": "Basic"}
        if not authorization or scheme.lower() != "basic":
            if self.auto_error:
                raise HTTPException(
                    status_code=HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                    headers=unauthorized_headers,
                )
            else:
                return None
        invalid_user_credentials_exc = HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers=unauthorized_headers,
        )
        try:
            data = b64decode(param).decode("ascii")
        except (ValueError, UnicodeDecodeError, binascii.Error):
            raise invalid_user_credentials_exc
        access_token, separator, refresh_token = data.partition(":")
        if not separator:
            raise invalid_user_credentials_exc
        return AuthTokens(x_access_token=access_token, x_refresh_token=refresh_token)


security = CustomAuth()


async def token_auth(credentials: Annotated[AuthTokens, Depends(security)],) -> Client:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_PUBLIC_KEY)
    supabase.auth.set_session(
        access_token=credentials.x_access_token,
        refresh_token=credentials.x_refresh_token,
    )
    return supabase
