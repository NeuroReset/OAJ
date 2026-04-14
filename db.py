import json
from pathlib import Path

from sqlalchemy import URL, create_engine

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "db_config.json"
_ENGINE = None


def load_config():
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            "Arquivo db_config.json n?o encontrado. Crie-o a partir de db_config.example.json."
        )

    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_credentials():
    config = load_config()
    required_keys = ("server", "database", "user", "password")
    missing_keys = [key for key in required_keys if not str(config.get(key, "")).strip()]

    if missing_keys:
        raise ValueError(
            "As seguintes chaves n?o foram preenchidas em db_config.json: "
            + ", ".join(missing_keys)
        )

    return tuple(config[key].strip() for key in required_keys)


def get_engine():
    global _ENGINE

    if _ENGINE is None:
        server, database, user, password = get_credentials()
        connection_url = URL.create(
            "mssql+pyodbc",
            username=user,
            password=password,
            host=server,
            port=1433,
            database=database,
            query={
                "driver": "ODBC Driver 17 for SQL Server",
                "Encrypt": "yes",
                "TrustServerCertificate": "yes",
            },
        )
        _ENGINE = create_engine(connection_url)

    return _ENGINE


def get_conn():
    return get_engine().connect()
