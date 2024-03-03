import base64

from fastapi import APIRouter, Depends, UploadFile

from dataline.repositories.base import AsyncSession, get_session
from dataline.services.settings import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile, settings_service: SettingsService = Depends(), session: AsyncSession = Depends(get_session),
):
    media = await settings_service.upload_avatar(session, file)
    blob_base64 = base64.b64encode(media.blob).decode('utf-8')
    return {"status": "ok", "blob": blob_base64}


@router.get("/avatar")
async def get_avatar(settings_service: SettingsService = Depends(), session: AsyncSession = Depends(get_session)):
    media = await settings_service.get_avatar(session)
    if media is None:
        return {"status": "error", "message": "No user avatar found"}

    blob_base64 = base64.b64encode(media.blob).decode('utf-8')
    return {"status": "ok", "blob": blob_base64}
