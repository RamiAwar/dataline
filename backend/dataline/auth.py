import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from dataline.config import config

security = HTTPBasic()


def validate_credentials(username: str, password: str) -> bool:
    correct_username = secrets.compare_digest(username, str(config.auth_username))
    correct_password = secrets.compare_digest(password, str(config.auth_password))
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return True


def authenticate(credentials: HTTPBasicCredentials = Depends(security)) -> None:
    validate_credentials(credentials.username, credentials.password)
