import logging

import sentry_sdk
from sentry_sdk.hub import GLOBAL_HUB
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sqlalchemy import select

from dataline.repositories.base import SessionCreator
from dataline.models.user import UserModel

logger = logging.getLogger(__name__)


def setup_sentry():
    sentry_sdk.init(
        dsn="https://3efb5a2ad9ae364b894842ea76caa57f@o4506888560508928.ingest.us.sentry.io/4506888562606080",
        enable_tracing=True,
        integrations=[FastApiIntegration()],
        profiles_sample_rate=1.0,
        traces_sample_rate=1.0,
        include_local_variables=False,
        ignore_errors=[KeyboardInterrupt],
    )


def opt_out_of_sentry():
    GLOBAL_HUB.bind_client(None)


async def maybe_init_sentry():
    async with SessionCreator.begin() as session:
        # session = SessionCreator()
        result = await session.execute(select(UserModel))
        instance = result.scalar_one_or_none()
        if instance is None or instance.sentry_enabled:
            setup_sentry()
