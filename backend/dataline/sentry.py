import logging

import sentry_sdk
from sentry_sdk.hub import GLOBAL_HUB
from sentry_sdk.integrations.fastapi import FastApiIntegration

from dataline.repositories.base import SessionCreator
from dataline.repositories.user import UserRepository

logger = logging.getLogger(__name__)


def setup_sentry() -> None:
    sentry_sdk.init(
        dsn="https://eb866cebe8c8378fd689c1ad3d39bcb5@o4507329853915136.ingest.de.sentry.io/4507335339278416",
        enable_tracing=True,
        integrations=[FastApiIntegration()],
        traces_sample_rate=1.0,
        include_local_variables=False,
        ignore_errors=[KeyboardInterrupt],
    )


def opt_out_of_sentry() -> None:
    GLOBAL_HUB.bind_client(None)


async def maybe_init_sentry() -> None:
    async with SessionCreator.begin() as session:
        user_repo = UserRepository()
        user_info = await user_repo.get_one_or_none(session)
        if user_info is not None and user_info.sentry_enabled:
            setup_sentry()
