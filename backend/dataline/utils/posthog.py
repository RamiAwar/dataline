import logging

from posthog import Posthog
from posthog.client import Client as PosthogClient

from dataline.config import EnvironmentType, config
from dataline.models.user.model import UserModel
from dataline.repositories.base import SessionCreator
from dataline.repositories.user import UserRepository

logger = logging.getLogger(__name__)
posthog: PosthogClient = Posthog(  # type: ignore[no-untyped-call]
    project_api_key="phc_bcTdZnbv2IDSiMOAq3UdnHwfJlZvTF0e5ctPMJUzw0i",
    host="https://eu.i.posthog.com",
    timeout=1,  # if more than 1 second, drop it, not worth making the user wait
)

if config.environment == EnvironmentType.development:
    posthog.debug = True


class PosthogAnalytics:
    """
    Context manager to use Posthog analytics in a safe way with a single point of control.
    If a user has disabled analytics, this context manager will not execute the block of code.
    """

    async def __aenter__(self) -> tuple[PosthogClient, UserModel | None]:
        async with SessionCreator.begin() as session:
            user_repo = UserRepository()
            user_info = await user_repo.get_one_or_none(session)
            is_enabled = (
                user_info is not None
                and user_info.analytics_enabled
                and config.environment == EnvironmentType.production  # disable in dev mode
            )

            posthog.disabled = not is_enabled

            return posthog, user_info

    async def __aexit__(self, exc_type: Exception, exc_val: Exception, exc_tb: Exception) -> None:
        pass


async def posthog_capture(event_name: str, properties: dict[str, str | int | bool] | None = None) -> None:
    async with PosthogAnalytics() as (ph, user):
        if user is not None:
            ph.capture(user.id, event_name, properties)
