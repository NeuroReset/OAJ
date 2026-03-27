from datetime import datetime
from pathlib import Path
from db import get_conn

import pandas as pd
import webview

TABELA_HISTORICO = "dbo.tbl_oaj"


class Api:
    def _get_conn(self):
        return get_conn()

    def testar_conexao(self):
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                row = cursor.fetchone()
            return {"status": "ok", "resultado": row[0]}
        except Exception as e:
            return {"status": "erro", "erro": str(e)}

    def get_historico(self, filtros=None):
        try:
            sql = f"""
            SELECT TOP 100 *
            FROM {TABELA_HISTORICO}
            ORDER BY TRY_CONVERT(int, Numero) DESC
            """

            with self._get_conn() as conn:
                df = pd.read_sql(sql, conn)

            df = df.fillna("")

            return {
                "colunas": list(df.columns),
                "registros": df.to_dict(orient="records"),
                "mensagem": "" if not df.empty else "Nenhum registro encontrado"
            }

        except Exception as e:
            return {
                "colunas": [],
                "registros": [],
                "mensagem": f"Erro ao carregar: {str(e)}"
            }

    def salvar(self, dados):
        try:
            colunas = ", ".join(f"[{c}]" for c in dados.keys())
            placeholders = ", ".join("?" for _ in dados)
            valores = list(dados.values())

            sql = f"""
            INSERT INTO {TABELA_HISTORICO} ({colunas})
            VALUES ({placeholders})
            """

            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, valores)
                conn.commit()

            return "Salvo com sucesso 🚀"

        except Exception as e:
            return f"Erro ao salvar: {str(e)}"


def iniciar_app():
    api = Api()
    html_path = Path(__file__).parent / "web" / "index.html"

    webview.create_window(
        "Ordem de Ajuste",
        html_path.as_uri(),
        js_api=api,
        width=1400,
        height=900,
    )
    webview.start()


if __name__ == "__main__":
    print(Api().testar_conexao())
    iniciar_app()
