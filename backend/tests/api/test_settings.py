import logging
from base64 import b64encode
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from openai.resources.models import Models as OpenAIModels

logger = logging.getLogger(__name__)


@pytest.mark.asyncio
async def test_update_user_info_name(client: TestClient) -> None:
    user_in = {"name": "John"}
    response = client.patch("/settings/info", json=user_in)

    assert response.status_code == 200
    assert response.json() == {
        "data": {
            "name": "John",
            "openai_api_key": None,
            "preferred_openai_model": None,
            "langsmith_api_key": None,
            "openai_base_url": None,
            "sentry_enabled": True,
        },
    }


@pytest.mark.asyncio
async def test_update_user_info_empty_name(client: TestClient) -> None:
    user_in = {"name": ""}
    response = client.patch("/settings/info", json=user_in)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_user_info_long_name(client: TestClient) -> None:
    user_in = {"name": "a" * 251}
    response = client.patch("/settings/info", json=user_in)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_user_info_empty_openai_key(client: TestClient) -> None:
    user_in = {"openai_api_key": ""}
    response = client.patch("/settings/info", json=user_in)
    assert response.status_code == 422


@pytest.mark.skip(reason="OpenAI key validation is not implemented yet.")
async def test_update_user_info_invalid_openai_key(client: TestClient) -> None:
    user_in = {"openai_api_key": "invalid"}
    response = client.patch("/settings/info", json=user_in)
    assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.skip(reason="OpenAI key is now as SecretStr, check the db for a change instead of using the client")
@patch.object(OpenAIModels, "list")
async def test_update_user_info_valid_openai_key(mock_openai_model_list: MagicMock, client: TestClient) -> None:
    mock_model = MagicMock()
    mock_model.id = "gpt-3.5-turbo"
    mock_openai_model_list.return_value = [mock_model]
    openai_key = "sk-Mioanowida"
    user_in = {"openai_api_key": openai_key}
    response = client.patch("/settings/info", json=user_in)
    assert response.status_code == 200, response.json()
    assert response.json()["data"]["openai_api_key"] == openai_key
    mock_openai_model_list.assert_called()


@pytest.mark.asyncio
@patch.object(OpenAIModels, "list")
async def test_update_user_info_extra_fields_ignored(mock_openai_model_list: MagicMock, client: TestClient) -> None:
    mock_model = MagicMock()
    mock_model.id = "gpt-3.5-turbo"
    mock_openai_model_list.return_value = [mock_model]
    user_in = {"name": "John", "openai_api_key": "sk-1234", "extra": "extra"}
    response = client.patch("/settings/info", json=user_in)
    assert response.status_code == 200
    assert "extra" not in response.json()["data"]
    mock_openai_model_list.assert_called()


@pytest_asyncio.fixture
@patch.object(OpenAIModels, "list")
async def user_info(mock_openai_model_list: MagicMock, client: TestClient) -> dict[str, str]:
    mock_model = MagicMock()
    mock_model.id = "gpt-3.5-turbo"
    mock_openai_model_list.return_value = [mock_model]
    user_in = {
        "name": "John",
        "openai_api_key": "sk-asoiasdfl",
    }
    client.patch("/settings/info", json=user_in)
    return user_in


@pytest.mark.asyncio
@pytest.mark.skip(reason="OpenAI key is now as SecretStr, check the db for a change instead of using the client")
async def test_get_info(client: TestClient, user_info: dict[str, str]) -> None:
    # Send a GET request to the /settings/info endpoint
    response = client.get("/settings/info")

    # Check that the response status code is 200
    assert response.status_code == 200

    # Check that the response body contains the expected data
    # Replace this with your actual assertions based on your application's logic
    assert response.json()["data"] == {**user_info, "preferred_openai_model": "gpt-3.5-turbo"}


@pytest.mark.asyncio
async def test_get_info_not_found(client: TestClient) -> None:
    response = client.get("/settings/info")
    assert response.status_code == 404


FileTuple = tuple[str, tuple[str, BytesIO, str]]


@pytest.fixture
def avatar_file() -> tuple[FileTuple, bytes]:
    file_data = b"test"
    file_name = "test_file.txt"
    file = ("file", (file_name, BytesIO(file_data), "image/jpeg"))
    return file, file_data


@pytest.mark.asyncio
async def test_upload_avatar(client: TestClient, avatar_file: tuple[FileTuple, bytes]) -> None:
    file, file_data = avatar_file
    base64_encoded = b64encode(file_data).decode("utf-8")

    response = client.post("/settings/avatar", files=[file])
    assert response.status_code == 200
    assert response.json() == {
        "data": {
            "blob": base64_encoded,
        },
    }


@pytest_asyncio.fixture
async def avatar(client: TestClient, avatar_file: tuple[FileTuple, bytes]) -> str:
    """Uploads an avatar and returns the base64 encoded blob."""
    file, _ = avatar_file
    response = client.post("/settings/avatar", files=[file])
    return response.json()["data"]["blob"]


@pytest.mark.asyncio
async def test_get_avatar(client: TestClient, avatar: str) -> None:
    # Send a GET request to the /settings/avatar endpoint
    response = client.get("/settings/avatar")

    # Check that the response status code is 200
    assert response.status_code == 200

    # Check that the response body contains the expected data
    assert response.json() == {
        "data": {
            "blob": avatar,
        },
    }


@pytest.mark.asyncio
async def test_get_avatar_no_avatar(client: TestClient) -> None:
    response = client.get("/settings/avatar")
    assert response.status_code == 404
