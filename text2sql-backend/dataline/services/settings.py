import mimetypes
from typing import Optional
from uuid import uuid4

from fastapi import Depends, UploadFile

from dataline.models.media.model import MediaModel
from dataline.models.user.schema import UserOut, UserUpdateIn
from dataline.repositories.base import AsyncSession
from dataline.repositories.media import MediaCreate, MediaRepository
from dataline.repositories.user import UserCreate, UserRepository, UserUpdate


class SettingsService:
    media_repo: MediaRepository
    user_repo: UserRepository

    def __init__(self, media_repo: MediaRepository = Depends(), user_repo: UserRepository = Depends()) -> None:
        self.media_repo = media_repo
        self.user_repo = user_repo

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

    async def upload_avatar(self, session: AsyncSession, file: UploadFile) -> MediaModel:
        # Delete old avatar
        old_avatar = await self.get_avatar(session)
        if old_avatar:
            await self.media_repo.delete_by_id(session, old_avatar.id)

        return await self.upload_media(session, file)

    async def get_avatar(self, session: AsyncSession) -> Optional[MediaModel]:
        media_instances = await self.media_repo.list_all(session)
        return media_instances[0] if media_instances else None

    async def update_user_info(self, session: AsyncSession, data: UserUpdateIn) -> UserOut:
        # Check if user exists
        user_info = await self.user_repo.get_one_or_none(session)
        user = None
        if user_info is None:
            # Create user with data
            user_create = UserCreate.model_construct(**data.model_dump(exclude_none=True))
            user = await self.user_repo.create(session, user_create)
        else:
            # Update user with data
            user_update = UserUpdate.model_construct(**data.model_dump(exclude_none=True))
            user = await self.user_repo.update_by_id(session, record_id=user_info.id, data=user_update)

        return UserOut.model_validate(user)

    async def get_user_info(self, session: AsyncSession) -> Optional[UserOut]:
        user_info = await self.user_repo.get_one_or_none(session)
        if user_info is None:
            return None

        return UserOut.model_validate(user_info)

    async def get_openai_api_key(self, session: AsyncSession) -> str:
        user_info = await self.user_repo.get_one_or_none(session)
        if user_info is None:
            raise Exception("User does not exist. Please setup your application.")
        return user_info.openai_api_key
