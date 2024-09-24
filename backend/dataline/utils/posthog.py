import logging
from typing import Any, Callable, ParamSpec, cast
from functools import wraps
from inspect import signature, Parameter

from fastapi import BackgroundTasks
from starlette._utils import is_async_callable


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

    async def __aenter__(self) -> tuple[PosthogClient, UserModel]:
        async with SessionCreator.begin() as session:
            user_repo = UserRepository()
            user_info = await user_repo.get_one_or_none(session)
            is_enabled = (
                user_info is not None
                and user_info.analytics_enabled
                and config.environment == EnvironmentType.production  # disable in dev mode
            )

            if not is_enabled:
                posthog.disabled = True
            else:
                posthog.disabled = False

            user_info = cast(UserModel, user_info)
            return posthog, user_info

    async def __aexit__(self, exc_type: Exception, exc_val: Exception, exc_tb: Exception) -> None:
        pass


P = ParamSpec("P")


async def capture_event(event_name: str, properties: dict[str, str]):
    async with SessionCreator.begin() as session:
        user_repo = UserRepository()
        user_info = await user_repo.get_one_or_none(session)
        is_enabled = (
            user_info is not None
            and user_info.analytics_enabled  # and config.environment == EnvironmentType.production # TODO bring back
        )

        posthog.disabled = not is_enabled
        posthog.capture(user_info.id, event_name, properties=properties)


def posthog_analytics(event_name: str, arg_names: list[str]):
    def decorator(func: Callable[P, Any]) -> Callable[P, Any]:
        og_sig = signature(func)
        new_params = list(og_sig.parameters.values())  # copy, not reference

        background_tasks_in_sig = "background_tasks" in og_sig.parameters
        # Check if 'background_tasks' is already a parameter
        if background_tasks_in_sig:
            # Ensure the existing 'background_tasks' parameter is of type BackgroundTasks
            existing_param = og_sig.parameters["background_tasks"]
            if existing_param.annotation is not BackgroundTasks:
                raise TypeError(
                    f"Parameter 'background_tasks' must be of type BackgroundTasks, not {existing_param.annotation}"
                )
        else:
            new_params.append(Parameter("background_tasks", Parameter.KEYWORD_ONLY, annotation=BackgroundTasks))
        new_sig = og_sig.replace(parameters=new_params)

        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> Any:
            if not background_tasks_in_sig:
                background_tasks: BackgroundTasks = kwargs.pop("background_tasks")
                bound_args = og_sig.bind(*args, **kwargs)
            else:
                background_tasks: BackgroundTasks = kwargs["background_tasks"]  # type: ignore
                sig = signature(func)
                bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            properties = {arg_name: str(bound_args.arguments[arg_name]) for arg_name in arg_names}
            background_tasks.add_task(capture_event, event_name, properties)
            if is_async_callable(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            return result

        func.__signature__ = new_sig  # type: ignore

        # Validate that arg_names match the function's parameters
        new_new_sig = signature(func)
        func_arg_names = list(new_new_sig.parameters.keys())

        if not set(arg_names).issubset(set(func_arg_names)):
            raise ValueError(f"Decorator arg_names {arg_names} are not a subset of function arguments {func_arg_names}")

        return wrapper

    return decorator
