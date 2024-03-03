import mimetypes
from typing import Optional
from uuid import uuid4

from fastapi import Depends, UploadFile

from dataline.models.media.model import MediaModel
from dataline.repositories.base import AsyncSession
from dataline.repositories.media import MediaCreate, MediaRepository


class SettingsService:
    media_repo: MediaRepository

    def __init__(self, media_repo: MediaRepository = Depends()) -> None:
        self.media_repo = media_repo

    async def upload_media(self, session: AsyncSession, file: UploadFile) -> MediaModel:
        # Make sure file is an image
        if not file.content_type or not file.content_type.startswith("image/"):
            raise ValueError("File must be a valid image")

        # Check file size less than 5mb and non zero
        if not file.size or file.size > 5 * 1024 * 1024:
            raise ValueError("File size must be less than 5mb")

        if not file.filename:
            raise ValueError("File must have a name")

        # Guess file extension
        file_extension = mimetypes.guess_extension(file.content_type)

        # Generate file name
        file_name = str(uuid4().hex) + str(file_extension)

        # Upload file blob
        file_blob = file.file.read()

        media_create = MediaCreate(key=file_name, blob=file_blob)
        return await self.media_repo.create(session, data=media_create)

    async def upload_avatar(self, session: AsyncSession, file: UploadFile):
        # Delete old avatar
        old_avatar = await self.get_avatar(session)
        if old_avatar:
            await self.media_repo.delete_by_id(session, old_avatar.id)

        # TODO: Update user avatar to allow multiple media type uploads
        return await self.upload_media(session, file)

    # TODO: Update this to filter on user when implemented
    async def get_avatar(self, session: AsyncSession) -> Optional[MediaModel]:
        media_instances = await self.media_repo.list_all(session)
        return media_instances[0] if media_instances else None
