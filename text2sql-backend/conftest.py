import pytest

from json_decoder import StreamingStringJsonDecoder


@pytest.fixture
def decoder():
    return StreamingStringJsonDecoder()
