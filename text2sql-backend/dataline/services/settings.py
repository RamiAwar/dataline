import mimetypes
from typing import Optional
from uuid import uuid4

import openai
from fastapi import Depends, UploadFile
from pydantic import SecretStr

from dataline.config import config
from dataline.errors import ValidationError
from dataline.models.media.model import MediaModel
from dataline.models.user.schema import UserOut, UserUpdateIn, UserWithKey
from dataline.repositories.base import AsyncSession, NotFoundError
from dataline.repositories.media import MediaCreate, MediaRepository
from dataline.repositories.user import UserCreate, UserRepository, UserUpdate


def model_exists(openai_api_key: SecretStr | str, model: str) -> bool:
    api_key = openai_api_key.get_secret_value() if isinstance(openai_api_key, SecretStr) else openai_api_key
    models = openai.OpenAI(api_key=api_key).models.list()
    return model in {model.id for model in models}


class SettingsService:
    media_repo: MediaRepository
    user_repo: UserRepository

    def __init__(self, media_repo: MediaRepository = Depends(), user_repo: UserRepository = Depends()) -> None:
        self.media_repo = media_repo
        self.user_repo = user_repo

    async def upload_media(self, session: AsyncSession, file: UploadFile) -> MediaModel:
        # Make sure file is an image
        if not file.content_type or not file.content_type.startswith("image/"):
            raise ValidationError("File must be a valid image")

        # Check file size less than 5mb and non zero
        if not file.size or file.size > 5 * 1024 * 1024:
            raise ValidationError("File size must be less than 5mb")

        if not file.filename:
            raise ValidationError("File must have a name")

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
            await self.media_repo.delete_by_uuid(session, old_avatar.id)

        return await self.upload_media(session, file)

    async def get_avatar(self, session: AsyncSession) -> Optional[MediaModel]:
        media_instances = await self.media_repo.list_all(session)
        return media_instances[0] if media_instances else None

    async def update_user_info(self, session: AsyncSession, data: UserUpdateIn) -> UserOut:
        # Check if user exists
        user = None
        user_info = await self.user_repo.get_one_or_none(session)
        if user_info is None:
            # Create user with data
            user_create = UserCreate.model_construct(**data.model_dump(exclude_none=True))
            if user_create.openai_api_key and user_create.preferred_openai_model is None:
                user_create.preferred_openai_model = (
                    config.default_model
                    if model_exists(user_create.openai_api_key, config.default_model)
                    else "gpt-3.5-turbo"
                )
            user = await self.user_repo.create(session, user_create)
        else:
            # Update user with data
            user_update = UserUpdate.model_construct(**data.model_dump(exclude_none=True))
            if user_update.openai_api_key:
                key_to_check = user_update.openai_api_key
                model_to_check = (
                    user_update.preferred_openai_model or user_info.preferred_openai_model or config.default_model
                )
                if not model_exists(key_to_check, model_to_check):
                    raise Exception(f"model {model_to_check} not accessible with current key")
            elif user_update.preferred_openai_model and user_info.openai_api_key:
                if not model_exists(user_info.openai_api_key, user_update.preferred_openai_model):
                    raise Exception(f"model {user_update.preferred_openai_model} not accessible with current key")
            user = await self.user_repo.update_by_uuid(session, record_id=user_info.id, data=user_update)

        return UserOut.model_validate(user)

    async def get_user_info(self, session: AsyncSession) -> UserOut:
        user_info = await self.user_repo.get_one_or_none(session)
        if user_info is None:
            raise NotFoundError("No user or multiple users found")

        return UserOut.model_validate(user_info)

    async def get_model_details(self, session: AsyncSession) -> UserWithKey:
        user_info = await self.user_repo.get_one_or_none(session)
        if user_info is None:
            raise NotFoundError("No user found. Please setup your application.")

        if not user_info.openai_api_key:
            raise Exception("OpenAI key not setup. Please setup your application.")

        user_info.preferred_openai_model = user_info.preferred_openai_model or config.default_model
        return UserWithKey.model_validate(user_info)
