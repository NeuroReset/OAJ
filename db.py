import json
from pathlib import Path

import pyodbc

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "db_config.json"


def load_config():
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            "Arquivo db_config.json não encontrado. Crie-o a partir de db_config.example.json."
        )

    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_credentials():
    config = load_config()
    required_keys = ("server", "database", "user", "password")
    missing_keys = [key for key in required_keys if not str(config.get(key, "")).strip()]

    if missing_keys:
        raise ValueError(
            "As seguintes chaves não foram preenchidas em db_config.json: "
            + ", ".join(missing_keys)
        )

    return tuple(config[key].strip() for key in required_keys)


def get_conn():
    server, database, user, password = get_credentials()

    conn_str = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        f"SERVER=tcp:{server},1433;"
        f"DATABASE={database};"
        f"UID={user};"
        f"PWD={password};"
        "Encrypt=yes;"
        "TrustServerCertificate=yes;"
    )

    return pyodbc.connect(conn_str)
