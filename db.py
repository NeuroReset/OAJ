import json
from pathlib import Path

import pandas as pd
import pyodbc

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "db_config.json"


def get_excel_path():
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            "Arquivo db_config.json não encontrado. Crie-o a partir de db_config.example.json."
        )

    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        config = json.load(file)

    excel_path = config.get("excel_path", "").strip()
    if not excel_path:
        raise ValueError("A chave 'excel_path' não foi preenchida em db_config.json.")

    return excel_path


def get_credentials():
    df = pd.read_excel(get_excel_path(), header=None)

    return (
        df.iloc[0, 1],  # server
        df.iloc[1, 1],  # database
        df.iloc[2, 1],  # user
        df.iloc[3, 1],  # password
    )


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
