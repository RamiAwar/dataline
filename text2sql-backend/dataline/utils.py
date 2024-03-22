def get_sqlite_dsn_async(path: str) -> str:
    return f"sqlite+aiosqlite:///{path}"


def get_sqlite_dsn(path: str) -> str:
    return f"sqlite:///{path}"
