import os

from fastapi import UploadFile

from dataline.config import config
from dataline.utils import generate_short_uuid, is_valid_sqlite_file


def test_valid_sqlite_file_validation() -> None:
    # Test for valid sqlite file
    file_path = config.sample_dvdrental_path
    with open(file_path, "rb") as file:
        upload_file = UploadFile(file)
        assert is_valid_sqlite_file(upload_file) is True


def test_invalid_sqlite_file_validation() -> None:
    # Test for invalid sqlite file
    # Create new file with random input
    file_path = "test.db"
    with open(file_path, "wb") as file:
        file.write(b"random input here")

    with open(file_path, "rb") as file:
        upload_file = UploadFile(file)
        assert is_valid_sqlite_file(upload_file) is False

    # Clean up
    os.remove(file_path)


def test_generate_short_uuid() -> None:
    short_uuid = generate_short_uuid()
    assert len(short_uuid) == 8
    assert isinstance(short_uuid, str)


def test_generate_short_uuid_uniqueness() -> None:
    short_uuid = generate_short_uuid()
    short_uuid2 = generate_short_uuid()
    assert short_uuid != short_uuid2