import base64

from fastapi import APIRouter, Depends, UploadFile, HTTPException

from dataline.models.user.schema import AvatarOut, UserOut, UserUpdateIn
from dataline.repositories.base import AsyncSession, get_session
from dataline.services.settings import SettingsService
from models import SuccessResponse

router = APIRouter(prefix="/settings", tags=["settings"])


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile,
    settings_service: SettingsService = Depends(),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[AvatarOut]:
    media = await settings_service.upload_avatar(session, file)
    blob_base64 = base64.b64encode(media.blob).decode("utf-8")
    return SuccessResponse(data=AvatarOut(blob=blob_base64))


@router.get("/avatar")
async def get_avatar(
    settings_service: SettingsService = Depends(), session: AsyncSession = Depends(get_session)
) -> SuccessResponse[AvatarOut]:
    media = await settings_service.get_avatar(session)
    if media is None:
        raise HTTPException(status_code=404, detail="No user avatar found")

    blob_base64 = base64.b64encode(media.blob).decode("utf-8")
    return SuccessResponse(data=AvatarOut(blob=blob_base64))


@router.patch("/info")
async def update_info(
    data: UserUpdateIn,
    settings_service: SettingsService = Depends(),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[UserOut]:
    user_info = await settings_service.update_user_info(session, data=data)
    return SuccessResponse(data=user_info)


@router.get("/info")
async def get_info(
    settings_service: SettingsService = Depends(), session: AsyncSession = Depends(get_session)
) -> SuccessResponse[UserOut]:
    user_info = await settings_service.get_user_info(session)
    return SuccessResponse(data=user_info)
