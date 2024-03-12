import logging
from typing import Any

import sentry_sdk
from sentry_sdk.hub import GLOBAL_HUB
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sqlalchemy import select

from dataline.repositories.base import SessionCreator
from dataline.models.user import UserModel

logger = logging.getLogger(__name__)


def before_breadcrumb(bc: dict[str, Any], hint: dict[str, Any]):
    # logger.warning(type(bc))
    # logger.warning(bc.keys())
    # WARNING: DONT LOG MESSAGE
    # if "level" not in bc or bc["level"] == "error":
    # logger.warning(bc)

    # logger.warning(f"{bc['type']=}; {bc['level']=}; {bc['category']=};")  # {bc['level']=}; {bc['category']=}; {bc['message']=}")
    # logger.warning("sending bc")
    # if "data" in bc and isinstance(bc["data"], dict):
    # bc["data"] = {k: "[Filtered]" if "result" in k.lower() else v for k, v in bc["data"].items()}
    return bc


def before_event(event: dict[str, Any], hint: dict[str, Any]):
    if event.get("level", None) != "error":
        return
    values: list[dict]
    if values := event.get("exception", {}).get("values", []):
        for value in values:
            if not (frames := value.get("stacktrace", {}).get("frames")):
                continue
            for frame in frames:
                frame["vars"] = {}

    # logger.warning(event["breadcrumbs"])
    return event


def setup_sentry():
    sentry_sdk.init(
        dsn="https://3efb5a2ad9ae364b894842ea76caa57f@o4506888560508928.ingest.us.sentry.io/4506888562606080",
        enable_tracing=True,
        integrations=[FastApiIntegration()],
        profiles_sample_rate=1.0,
        traces_sample_rate=1.0,
        before_send=before_event,
        before_breadcrumb=before_breadcrumb,
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
