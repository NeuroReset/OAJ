from datetime import datetime
from pathlib import Path

import pandas as pd
import webview
from sqlalchemy import text

from db import get_conn

TABELA_HISTORICO = "dbo.tbl_oaj"


class Api:
    CAMPOS_REGISTRO_CONSULTA = {
        "Pickup_50P": "Pickup 50P",
        "Tempo_Minimo_50P": "Tempo Mínimo-Fase",
        "Pickup_51P": "Pickup 51P",
        "Curva_Fase": "Curva Temp.",
        "TimeDial_Fase": "Time Dial",
        "Curva_Rapida_Fase": "Curva Rápida",
        "TimeDial_CR": "Time Dial (Curva rápida)",
        "PartidaCR": "Partida Curva Rápida",
        "Pickup_50N": "Pickup 50N",
        "Tempo_Minimo_50N": "Tempo Mínimo-Neutro",
        "Pickup_51N": "Pickup 51N",
        "Curva_Neutro": "Curva Neutro",
        "TimeDial_Neutro": "Time Dial Neutro",
        "CurvaRapidaNeutro": "Curva Rápida Neutro",
        "Time_Dial_CR": "Time Dial CR",
        "Partida_da_CR": "Partida da CR",
        "Trip": "Trip",
        "Temporizacao": "Temporização",
        "Operacoes": "Operações",
        "Tempo_Morto": "Interv. Relig.",
        "Operacao_1": "Operação 1",
        "Operacao_2": "Operação 2",
        "Operacao_3": "Operação 3",
        "Operacao_4": "Operação 4",
        "Tempo_Morto_Adicional": "Tempo Morto Adicional",
        "Reset_Time": "Reset Time",
        "HCL": "High Current",
        "Maximum_Time": "Maximum Time",
        "Inrush": "Inrush",
        "Sequence_Control": "Sequence Control",
    }

    COLUNAS_FILTRO_CONSULTA = {
        "regional": "Regional",
        "circuito": "Circuito",
        "marca": "Marca",
        "tipo": "Tipo",
        "ano": "ANO",
    }

    COLUNAS_TEXTO_LEGADO = {
        "Regional",
        "Marca",
        "Tipo",
        "Data_Emissao",
        "Engenheiro",
        "Pickup_50P",
        "Tempo_Minimo_50P",
        "Pickup_51P",
        "Curva_Fase",
        "TimeDial_Fase",
        "Curva_Rapida_Fase",
        "TimeDial_CR",
        "PartidaCR",
        "Pickup_50N",
        "Tempo_Minimo_50N",
        "Pickup_51N",
        "Curva_Neutro",
        "TimeDial_Neutro",
        "CurvaRapidaNeutro",
        "Time_Dial_CR",
        "Partida_da_CR",
        "Tempoorizacao",
        "Operacoes",
        "Tempo_Morto",
        "Operacao_1",
        "Operacao_2",
        "Operacao_3",
        "Operacao_4",
        "Tempo_Morto_Adicional",
        "Reset_Time",
        "HCL",
        "Maximun_Time",
        "Inrush",
        "Sequence_Control",
        "Observacoes",
    }

    def _get_conn(self):
        return get_conn()

    def _obter_colunas_tabela(self, conn):
        result = conn.execute(text(f"SELECT TOP 0 * FROM {TABELA_HISTORICO}"))
        return list(result.keys())

    def _colunas_chave_disponiveis(self, colunas):
        candidatas = ["ID", "Id", "id", "NumeroAjuste"]
        return [coluna for coluna in candidatas if coluna in colunas]

    def _expressao_coluna_delete(self, coluna):
        if coluna in self.COLUNAS_TEXTO_LEGADO:
            return f"CAST([{coluna}] AS NVARCHAR(MAX))"
        return f"[{coluna}]"

    def _montar_condicoes_delete(self, colunas_tabela, registro):
        colunas_chave = self._colunas_chave_disponiveis(colunas_tabela)

        if colunas_chave and any(str(registro.get(coluna, "")).strip() for coluna in colunas_chave):
            condicoes = []
            parametros = {}

            for indice, coluna in enumerate(colunas_chave):
                valor = registro.get(coluna)
                if valor is None:
                    continue

                valor_texto = str(valor).strip()
                if not valor_texto:
                    continue

                param_nome = f"chave_{indice}"
                condicoes.append(
                    f"{self._expressao_coluna_delete(coluna)} = :{param_nome}"
                )
                parametros[param_nome] = valor

            if condicoes:
                return condicoes, parametros

        condicoes = []
        parametros = {}
        for indice, coluna in enumerate(colunas_tabela):
            if coluna not in registro:
                continue

            valor = registro.get(coluna)
            param_nome = f"coluna_{indice}"
            if valor in ("", None):
                expressao_coluna = self._expressao_coluna_delete(coluna)
                condicoes.append(
                    f"({expressao_coluna} = :{param_nome} OR [{coluna}] IS NULL)"
                )
                parametros[param_nome] = ""
            else:
                condicoes.append(
                    f"{self._expressao_coluna_delete(coluna)} = :{param_nome}"
                )
                parametros[param_nome] = str(valor) if coluna in self.COLUNAS_TEXTO_LEGADO else valor

        return condicoes, parametros

    def _normalizar_filtros_historico(self, filtros):
        filtros = filtros or {}

        return {
            "numero": str(filtros.get("numero", "")).strip(),
            "regional": str(filtros.get("regional", "")).strip(),
            "circuito": str(filtros.get("circuito", "")).strip(),
            "marca": str(filtros.get("marca", "")).strip(),
            "tipo": str(filtros.get("tipo", "")).strip(),
            "ano": str(filtros.get("ano", "")).strip(),
            "data_inicio": str(filtros.get("data_inicio", "")).strip(),
            "data_fim": str(filtros.get("data_fim", "")).strip(),
        }

    def _adicionar_condicoes_consulta(self, filtros_normalizados, condicoes, parametros):
        if filtros_normalizados["numero"]:
            condicoes.append("CAST([Numero] AS VARCHAR(255)) LIKE :numero")
            parametros["numero"] = f"%{filtros_normalizados['numero']}%"

        if filtros_normalizados["regional"]:
            condicoes.append("CAST([Regional] AS VARCHAR(255)) = :regional")
            parametros["regional"] = filtros_normalizados["regional"]

        if filtros_normalizados["circuito"]:
            condicoes.append("CAST([Circuito] AS VARCHAR(255)) = :circuito")
            parametros["circuito"] = filtros_normalizados["circuito"]

        if filtros_normalizados["marca"]:
            condicoes.append("CAST([Marca] AS VARCHAR(255)) = :marca")
            parametros["marca"] = filtros_normalizados["marca"]

        if filtros_normalizados["tipo"]:
            condicoes.append("CAST([Tipo] AS VARCHAR(255)) = :tipo")
            parametros["tipo"] = filtros_normalizados["tipo"]

        if filtros_normalizados["ano"]:
            condicoes.append("CAST([ANO] AS VARCHAR(10)) = :ano")
            parametros["ano"] = filtros_normalizados["ano"]

        if filtros_normalizados["data_inicio"]:
            data_inicio = datetime.strptime(
                filtros_normalizados["data_inicio"], "%Y-%m-%d"
            ).strftime("%Y-%m-%d")
            condicoes.append("TRY_CONVERT(date, [Data_Emissao], 103) >= :data_inicio")
            parametros["data_inicio"] = data_inicio

        if filtros_normalizados["data_fim"]:
            data_fim = datetime.strptime(
                filtros_normalizados["data_fim"], "%Y-%m-%d"
            ).strftime("%Y-%m-%d")
            condicoes.append("TRY_CONVERT(date, [Data_Emissao], 103) <= :data_fim")
            parametros["data_fim"] = data_fim

    def _montar_where_filtros_consulta(self, filtros):
        filtros_normalizados = self._normalizar_filtros_historico(filtros)
        condicoes = []
        parametros = {}
        self._adicionar_condicoes_consulta(
            filtros_normalizados, condicoes, parametros
        )
        where_sql = f"WHERE {' AND '.join(condicoes)}" if condicoes else ""
        return filtros_normalizados, where_sql, parametros

    def _valor_texto(self, registro, coluna, fallback=""):
        valor = registro.get(coluna, fallback)
        if valor is None:
            return fallback
        return str(valor).strip() or fallback

    def _serializar_linhas_resultado(self, resultado):
        colunas = list(resultado.keys())
        registros = []

        for linha in resultado:
            registro = {}
            for coluna in colunas:
                valor = linha._mapping.get(coluna)
                registro[coluna] = "" if valor is None else valor
            registros.append(registro)

        return colunas, registros

    def _normalizar_paginacao_historico(self, filtros):
        try:
            pagina = int(filtros.get("pagina", 1))
        except (TypeError, ValueError, AttributeError):
            pagina = 1

        try:
            tamanho_pagina = int(filtros.get("tamanho_pagina", 100))
        except (TypeError, ValueError, AttributeError):
            tamanho_pagina = 100

        pagina = max(1, pagina)
        tamanho_pagina = max(1, min(tamanho_pagina, 200))
        return pagina, tamanho_pagina

    def _normalizar_subestacao(self, registro):
        for coluna in ("Subestacao", "Subestação", "SE", "Sub_Estacao"):
            valor = self._valor_texto(registro, coluna, "")
            if valor:
                return valor
        return "Não informada"

    def _agrupar_equipamentos_consulta(self, registros):
        equipamentos_map = {}

        for indice, registro in enumerate(registros):
            marca = self._valor_texto(registro, "Marca", "")
            tipo = self._valor_texto(registro, "Tipo", "")
            numero = self._valor_texto(registro, "Numero", "")
            nome = tipo or marca or f"Equipamento {indice + 1}"
            codigo = " - ".join([parte for parte in [marca, numero] if parte]) or f"REG-{indice + 1}"
            chave = f"{nome.lower()}::{codigo.lower()}"

            equipamento = equipamentos_map.setdefault(
                chave,
                {
                    "id": chave,
                    "nome": nome,
                    "codigo": codigo,
                    "registros_base": [],
                },
            )
            equipamento["registros_base"].append(registro)

        return [
            {
                "id": equipamento["id"],
                "nome": equipamento["nome"],
                "codigo": equipamento["codigo"],
                "registros": equipamento["registros_base"],
                "total_registros": len(equipamento["registros_base"]),
            }
            for equipamento in equipamentos_map.values()
        ]

    def get_equipamentos_consulta(self, filtros=None):
        try:
            filtros = filtros or {}
            regional = str(filtros.get("regional", "")).strip()
            circuito = str(filtros.get("circuito", "")).strip()
            abreviacao = str(filtros.get("abreviacao", "")).strip()
            circuito_final = str(filtros.get("circuito_final", "")).strip()

            condicoes = []
            parametros = {}

            if regional:
                condicoes.append("CAST([Regional] AS VARCHAR(255)) = :regional")
                parametros["regional"] = regional

            if circuito_final:
                condicoes.append("CAST([Circuito] AS VARCHAR(255)) = :circuito_final")
                parametros["circuito_final"] = circuito_final
            elif circuito and abreviacao:
                condicoes.append(
                    "(CAST([Circuito] AS VARCHAR(255)) LIKE :circuito OR CAST([Circuito] AS VARCHAR(255)) LIKE :abreviacao)"
                )
                parametros["circuito"] = f"%{circuito}%"
                parametros["abreviacao"] = f"%{abreviacao}%"
            elif circuito:
                condicoes.append("CAST([Circuito] AS VARCHAR(255)) LIKE :circuito")
                parametros["circuito"] = f"%{circuito}%"
            elif abreviacao:
                condicoes.append("CAST([Circuito] AS VARCHAR(255)) LIKE :abreviacao")
                parametros["abreviacao"] = f"%{abreviacao}%"

            where_sql = f"WHERE {' AND '.join(condicoes)}" if condicoes else ""
            sql = f"""
            SELECT *
            FROM {TABELA_HISTORICO}
            {where_sql}
            ORDER BY
                TRY_CONVERT(date, [Data_Emissao], 103) DESC,
                TRY_CONVERT(int, [Numero]) DESC
            """

            with self._get_conn() as conn:
                df = pd.read_sql(text(sql), conn, params=parametros)

            df = df.fillna("")
            registros = df.to_dict(orient="records")
            equipamentos = self._agrupar_equipamentos_consulta(registros)

            return {
                "status": "ok",
                "equipamentos": equipamentos,
                "mensagem": "" if equipamentos else "Nenhum equipamento encontrado",
            }
        except Exception as e:
            return {"status": "erro", "equipamentos": [], "mensagem": str(e)}

    def get_circuitos_consulta(self, regional):
        try:
            regional = str(regional or "").strip()
            if not regional:
                return {"status": "ok", "circuitos": [], "mensagem": ""}

            sql = f"""
            SELECT DISTINCT CAST([Circuito] AS VARCHAR(255)) AS Circuito
            FROM {TABELA_HISTORICO}
            WHERE CAST([Regional] AS VARCHAR(255)) = :regional
              AND [Circuito] IS NOT NULL
              AND LTRIM(RTRIM(CAST([Circuito] AS VARCHAR(255)))) <> ''
            ORDER BY Circuito
            """

            with self._get_conn() as conn:
                resultado = conn.execute(text(sql), {"regional": regional}).fetchall()

            circuitos = [str(linha[0]).strip() for linha in resultado if linha[0]]
            return {"status": "ok", "circuitos": circuitos, "mensagem": ""}
        except Exception as e:
            return {"status": "erro", "circuitos": [], "mensagem": str(e)}

    def get_regionais_consulta(self):
        try:
            sql = f"""
            SELECT DISTINCT CAST([Regional] AS VARCHAR(255)) AS Regional
            FROM {TABELA_HISTORICO}
            WHERE [Regional] IS NOT NULL
              AND LTRIM(RTRIM(CAST([Regional] AS VARCHAR(255)))) <> ''
            ORDER BY Regional
            """

            with self._get_conn() as conn:
                resultado = conn.execute(text(sql)).fetchall()

            regionais = [str(linha[0]).strip() for linha in resultado if linha[0]]
            return {"status": "ok", "regionais": regionais, "mensagem": ""}
        except Exception as e:
            return {"status": "erro", "regionais": [], "mensagem": str(e)}

    def get_fluxo_consulta(self):
        try:
            sql = f"""
            SELECT *
            FROM {TABELA_HISTORICO}
            ORDER BY
                TRY_CONVERT(date, [Data_Emissao], 103) DESC,
                TRY_CONVERT(int, [Numero]) DESC
            """

            with self._get_conn() as conn:
                df = pd.read_sql(text(sql), conn)

            df = df.fillna("")
            registros = df.to_dict(orient="records")

            regionais_map = {}

            for indice, registro in enumerate(registros):
                regional = self._valor_texto(registro, "Regional", "Sem regional")
                subestacao = self._normalizar_subestacao(registro)
                circuito = self._valor_texto(registro, "Circuito", "Sem circuito")
                marca = self._valor_texto(registro, "Marca", "Sem marca")
                tipo = self._valor_texto(registro, "Tipo", "")
                numero = self._valor_texto(registro, "Numero", "")

                regional_id = f"regional::{regional.lower()}"
                subestacao_id = f"{regional_id}::sub::{subestacao.lower()}"
                circuito_id = f"{subestacao_id}::ckt::{circuito.lower()}"

                nome_equipamento = tipo or marca or f"Equipamento {indice + 1}"
                codigo_equipamento = " - ".join(
                    [parte for parte in [marca, numero] if parte]
                ) or f"REG-{indice + 1}"
                equipamento_id = (
                    f"{circuito_id}::eq::{nome_equipamento.lower()}::{codigo_equipamento.lower()}"
                )

                regional_item = regionais_map.setdefault(
                    regional_id,
                    {
                        "id": regional_id,
                        "nome": regional,
                        "subestacoes_map": {},
                    },
                )

                subestacao_item = regional_item["subestacoes_map"].setdefault(
                    subestacao_id,
                    {
                        "id": subestacao_id,
                        "nome": subestacao,
                        "circuitos_map": {},
                    },
                )

                circuito_item = subestacao_item["circuitos_map"].setdefault(
                    circuito_id,
                    {
                        "id": circuito_id,
                        "nome": circuito,
                        "equipamentos_map": {},
                    },
                )

                equipamento_item = circuito_item["equipamentos_map"].setdefault(
                    equipamento_id,
                    {
                        "id": equipamento_id,
                        "nome": nome_equipamento,
                        "codigo": codigo_equipamento,
                        "registros_base": [],
                    },
                )
                equipamento_item["registros_base"].append(registro)

            regionais = []
            for regional in regionais_map.values():
                subestacoes = []
                for subestacao in regional["subestacoes_map"].values():
                    circuitos = []
                    for circuito in subestacao["circuitos_map"].values():
                        equipamentos = []
                        for equipamento in circuito["equipamentos_map"].values():
                            equipamentos.append(
                                {
                                    "id": equipamento["id"],
                                    "nome": equipamento["nome"],
                                    "codigo": equipamento["codigo"],
                                    "registros": self._montar_registros_consulta(
                                        equipamento["registros_base"]
                                    ),
                                }
                            )

                        circuitos.append(
                            {
                                "id": circuito["id"],
                                "nome": circuito["nome"],
                                "equipamentos": equipamentos,
                            }
                        )

                    subestacoes.append(
                        {
                            "id": subestacao["id"],
                            "nome": subestacao["nome"],
                            "circuitos": circuitos,
                        }
                    )

                regionais.append(
                    {
                        "id": regional["id"],
                        "nome": regional["nome"],
                        "subestacoes": subestacoes,
                    }
                )

            return {"status": "ok", "regionais": regionais, "mensagem": ""}
        except Exception as e:
            return {"status": "erro", "regionais": [], "mensagem": str(e)}

    def get_opcoes_filtros(self, filtros=None):
        try:
            filtros_normalizados, _, _ = self._montar_where_filtros_consulta(filtros)
            opcoes = {}

            with self._get_conn() as conn:
                for chave, coluna in self.COLUNAS_FILTRO_CONSULTA.items():
                    condicoes = []
                    parametros = {}

                    for outra_chave, outra_coluna in self.COLUNAS_FILTRO_CONSULTA.items():
                        if outra_chave == chave:
                            continue

                        valor = filtros_normalizados.get(outra_chave, "")
                        if valor:
                            condicoes.append(
                                f"CAST([{outra_coluna}] AS VARCHAR(255)) = :{outra_chave}"
                            )
                            parametros[outra_chave] = valor

                    where_sql = f"WHERE {' AND '.join(condicoes)}" if condicoes else ""
                    sql = f"""
                    SELECT DISTINCT CAST([{coluna}] AS VARCHAR(255)) AS valor
                    FROM {TABELA_HISTORICO}
                    {where_sql}
                    AND [{coluna}] IS NOT NULL
                    AND LTRIM(RTRIM(CAST([{coluna}] AS VARCHAR(255)))) <> ''
                    ORDER BY valor
                    """

                    if not where_sql:
                        sql = f"""
                        SELECT DISTINCT CAST([{coluna}] AS VARCHAR(255)) AS valor
                        FROM {TABELA_HISTORICO}
                        WHERE [{coluna}] IS NOT NULL
                        AND LTRIM(RTRIM(CAST([{coluna}] AS VARCHAR(255)))) <> ''
                        ORDER BY valor
                        """

                    resultado = conn.execute(text(sql), parametros).fetchall()
                    opcoes[chave] = [linha[0] for linha in resultado if linha[0]]

            return {"status": "ok", "opcoes": opcoes, "mensagem": ""}
        except Exception as e:
            return {
                "status": "erro",
                "opcoes": {chave: [] for chave in self.COLUNAS_FILTRO_CONSULTA},
                "mensagem": f"Erro ao carregar filtros: {str(e)}",
            }

    def testar_conexao(self):
        try:
            with self._get_conn() as conn:
                resultado = conn.execute(text("SELECT 1")).scalar()
            return {"status": "ok", "resultado": resultado}
        except Exception as e:
            return {"status": "erro", "erro": str(e)}

    def get_historico(self, filtros=None):
        try:
            filtros = filtros or {}
            _, where_sql, parametros = self._montar_where_filtros_consulta(filtros)
            pagina, tamanho_pagina = self._normalizar_paginacao_historico(filtros)
            sql_total = f"""
            SELECT COUNT(*) AS total
            FROM {TABELA_HISTORICO}
            {where_sql}
            """

            order_by_sql = """
            ORDER BY
                TRY_CONVERT(date, [Data_Emissao], 103) DESC,
                TRY_CONVERT(int, [Numero]) DESC
            """

            with self._get_conn() as conn:
                total_registros = (
                    conn.execute(text(sql_total), parametros).scalar() or 0
                )

                total_paginas = (
                    max(1, (total_registros + tamanho_pagina - 1) // tamanho_pagina)
                    if total_registros
                    else 0
                )

                if total_paginas and pagina > total_paginas:
                    pagina = total_paginas

                offset = (pagina - 1) * tamanho_pagina
                parametros_consulta = {
                    **parametros,
                    "offset": offset,
                    "tamanho_pagina": tamanho_pagina,
                }

                sql = f"""
                SELECT *
                FROM {TABELA_HISTORICO}
                {where_sql}
                {order_by_sql}
                OFFSET :offset ROWS
                FETCH NEXT :tamanho_pagina ROWS ONLY
                """

                resultado = conn.execute(text(sql), parametros_consulta)
                colunas, registros = self._serializar_linhas_resultado(resultado)

            return {
                "colunas": colunas,
                "registros": registros,
                "pagina": pagina,
                "tamanho_pagina": tamanho_pagina,
                "total_registros": total_registros,
                "total_paginas": total_paginas,
                "mensagem": "" if registros else "Nenhum registro encontrado",
            }

        except Exception as e:
            return {
                "colunas": [],
                "registros": [],
                "pagina": 1,
                "tamanho_pagina": 100,
                "total_registros": 0,
                "total_paginas": 0,
                "mensagem": f"Erro ao carregar: {str(e)}",
            }

    def salvar(self, dados):
        try:
            colunas = ", ".join(f"[{coluna}]" for coluna in dados.keys())
            parametros = {
                f"valor_{indice}": valor for indice, valor in enumerate(dados.values())
            }
            placeholders = ", ".join(f":valor_{indice}" for indice, _ in enumerate(dados))

            sql = f"""
            INSERT INTO {TABELA_HISTORICO} ({colunas})
            VALUES ({placeholders})
            """

            with self._get_conn() as conn:
                conn.execute(text(sql), parametros)
                conn.commit()

            return "Salvo com sucesso"

        except Exception as e:
            return f"Erro ao salvar: {str(e)}"

    def deletar_historico(self, registros):
        try:
            registros = registros or []
            if not registros:
                return {
                    "status": "erro",
                    "mensagem": "Nenhum registro selecionado para exclus?o.",
                }

            with self._get_conn() as conn:
                colunas_tabela = self._obter_colunas_tabela(conn)
                total_excluido = 0

                for registro in registros:
                    condicoes, parametros = self._montar_condicoes_delete(
                        colunas_tabela, registro
                    )
                    if not condicoes:
                        continue

                    sql = f"""
                    DELETE TOP (1)
                    FROM {TABELA_HISTORICO}
                    WHERE {' AND '.join(condicoes)}
                    """
                    resultado = conn.execute(text(sql), parametros)
                    total_excluido += (
                        resultado.rowcount
                        if resultado.rowcount and resultado.rowcount > 0
                        else 0
                    )

                conn.commit()

            if total_excluido == 0:
                return {"status": "erro", "mensagem": "Nenhum registro foi deletado."}

            return {
                "status": "ok",
                "mensagem": f"{total_excluido} registro{'s' if total_excluido != 1 else ''} deletado{'s' if total_excluido != 1 else ''} com sucesso.",
            }
        except Exception as e:
            return {"status": "erro", "mensagem": f"Erro ao deletar: {str(e)}"}


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
