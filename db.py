import json
from pathlib import Path

from sqlalchemy import URL, create_engine
from app_paths import app_root, bundled_root, first_existing_path, user_data_path

BASE_DIR = app_root()
USER_CONFIG_DIR = user_data_path()
_ENGINE = None


def get_config_path():
    candidates = [
        USER_CONFIG_DIR / "db_config.json",
        BASE_DIR / "db_config.json",
        Path.cwd() / "db_config.json",
        bundled_root() / "db_config.json",
    ]
    return first_existing_path(*candidates)


def _searched_config_paths():
    return [
        USER_CONFIG_DIR / "db_config.json",
        BASE_DIR / "db_config.json",
        Path.cwd() / "db_config.json",
        bundled_root() / "db_config.json",
    ]


def load_config():
    config_path = get_config_path()
    if not config_path.exists():
        searched_paths = [str(path) for path in _searched_config_paths()]
        raise FileNotFoundError(
            "Arquivo db_config.json nao encontrado. Caminhos verificados: "
            + ", ".join(searched_paths)
        )

    with config_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_credentials():
    config = load_config()
    required_keys = ("server", "database", "user", "password")
    missing_keys = [key for key in required_keys if not str(config.get(key, "")).strip()]

    if missing_keys:
        raise ValueError(
            "As seguintes chaves nao foram preenchidas em db_config.json: "
            + ", ".join(missing_keys)
        )

    return tuple(config[key].strip() for key in required_keys)


def get_engine():
    global _ENGINE

    if _ENGINE is None:
        server, database, user, password = get_credentials()
        try:
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
        except Exception as exc:
            config_path = get_config_path()
            raise RuntimeError(
                "Falha ao inicializar conexao com o banco usando "
                f"{config_path}: {exc}"
            ) from exc

    return _ENGINE


def get_conn():
    try:
        return get_engine().connect()
    except Exception as exc:
        config_path = get_config_path()
        raise RuntimeError(
            "Falha ao conectar no banco usando "
            f"{config_path}: {exc}"
        ) from exc
