import html
import shutil
import subprocess
import tempfile
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.worksheet.page import PageMargins

try:
    import pythoncom
    from win32com.client import DispatchEx
except ImportError:
    pythoncom = None
    DispatchEx = None

from db import load_config

DEFAULT_EXCEL_CELL_MAP = {
    "Religador": "B7",
    "Circuito": "E7",
    "TensaoPdf": "H7",
    "Marca": "B8",
    "Data_Emissao": "H8",
    "Engenheiro": "B9",
    "Pickup_50P": "C13",
    "Tempo_Minimo_50P": "C14",
    "Pickup_51P": "C15",
    "Curva_Fase": "C16",
    "TimeDial_Fase": "C17",
    "Curva_Rapida_Fase": "C18",
    "TimeDial_CR": "C19",
    "PartidaCR": "C20",
    "Pickup_50N": "H13",
    "Tempo_Minimo_50N": "H14",
    "Pickup_51N": "H15",
    "Curva_Neutro": "H16",
    "TimeDial_Neutro": "H17",
    "CurvaRapidaNeutro": "H18",
    "Time_Dial_CR": "H19",
    "Partida_da_CR": "H20",
    "Trip": "C24",
    "Temporizacao": "C25",
    "Operacoes": "C26",
    "Tempo_Morto": "C27",
    "Operacao_1": "H24",
    "Operacao_2": "H25",
    "Operacao_3": "H26",
    "Operacao_4": "H27",
    "Tempo_Morto_Adicional": "H28",
    "Reset_Time": "H29",
    "HCL": "H30",
    "Maximum_Time": "H31",
    "Inrush": "H32",
    "Sequence_Control": "H33",
    "Observacoes": "B35",
}


@dataclass
class ExcelTemplateConfig:
    template_path: Path
    sheet_name: str = "pdf fim"
    cell_map: dict[str, str] = field(
        default_factory=lambda: DEFAULT_EXCEL_CELL_MAP.copy()
    )


class PdfService:
    def __init__(
        self,
        base_dir,
        valor_texto,
        obter_regional_pdf,
        obter_nome_circuito_pdf,
        excel_template=None,
    ):
        self.base_dir = Path(base_dir)
        self._valor_texto = valor_texto
        self._obter_regional_pdf = obter_regional_pdf
        self._obter_nome_circuito_pdf = obter_nome_circuito_pdf
        self.excel_template = excel_template or ExcelTemplateConfig(
            template_path=self.base_dir / "template.xlsx"
        )

    def _normalizar_nome_arquivo(self, valor, fallback):
        texto = str(valor or "").strip()
        if not texto:
            texto = fallback

        texto = unicodedata.normalize("NFKD", texto)
        texto = "".join(
            caractere for caractere in texto if not unicodedata.combining(caractere)
        )
        proibidos = '<>:"/\\|?*'
        texto = "".join(
            "_" if caractere in proibidos else caractere for caractere in texto
        )
        texto = "_".join(parte for parte in texto.replace("-", "_").split() if parte)
        return texto.strip("._") or fallback

    def _extrair_data_pdf(self, dados):
        valor = self._valor_texto(dados, "Data_Emissao", "")
        for formato in ("%d/%m/%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(valor, formato).strftime("%Y%m%d")
            except ValueError:
                continue
        return datetime.now().strftime("%Y%m%d")

    def _obter_tipo_pdf(self, dados):
        pickup_51n = self._valor_texto(dados, "Pickup_51N", "").strip().upper()
        curva_neutro = self._valor_texto(dados, "Curva_Neutro", "").strip().upper()
        tipo_pdf = "MN" if pickup_51n == "OFF" and curva_neutro == "OFF" else self._valor_texto(
            dados, "Tipo", "Tipo"
        )

        return self._normalizar_nome_arquivo(
            tipo_pdf,
            "Tipo",
        )

    def _obter_circuito_pdf(self, dados):
        return self._normalizar_nome_arquivo(
            self._valor_texto(dados, "Circuito", "Circuito"),
            "Circuito",
        )

    def _obter_numero_rl_pdf(self, dados):
        return self._normalizar_nome_arquivo(
            self._valor_texto(dados, "Numero", "")
            or self._valor_texto(dados, "Religador", "SemNumero"),
            "SemNumero",
        )

    def _montar_nome_pdf(self, dados):
        data_pdf = self._extrair_data_pdf(dados)
        tipo = self._obter_tipo_pdf(dados)
        numero = self._obter_numero_rl_pdf(dados)
        circuito = self._obter_circuito_pdf(dados)
        return f"{data_pdf}_RL_{tipo}_{numero}_{circuito}.pdf"

    def _montar_nome_pdf_excel(self, dados):
        return self._montar_nome_pdf(dados)

    def _obter_roots_pdf(self):
        config = load_config()
        pdf_root = Path(
            str(config.get("pdf_root", "")).strip() or (self.base_dir / "pdfs")
        )
        sharepoint_root = str(config.get("sharepoint_root", "")).strip()
        return pdf_root, Path(sharepoint_root) if sharepoint_root else None

    def _montar_pasta_circuito(self, root, dados):
        regional = self._obter_regional_pdf(dados) or "SemRegional"
        circuito = self._obter_nome_circuito_pdf(dados)
        abreviacao_circuito = self._valor_texto(dados, "Circuito", "SemCircuito")

        regional_pasta = self._normalizar_nome_arquivo(regional, "SemRegional")
        circuito_pasta = self._normalizar_nome_arquivo(circuito, "SemCircuito")
        abreviacao_pasta = self._normalizar_nome_arquivo(
            abreviacao_circuito, "SemCircuito"
        )
        return Path(root) / regional_pasta / circuito_pasta / abreviacao_pasta

    def _obter_destinos_pdf(self, dados):
        pdf_root, sharepoint_root = self._obter_roots_pdf()
        destinos = [self._montar_pasta_circuito(pdf_root, dados)]
        if sharepoint_root:
            destinos.append(self._montar_pasta_circuito(sharepoint_root, dados))
        return destinos

    def _listar_navegadores_pdf(self):
        candidatos = [
            Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
            Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
            Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
            Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
        ]
        encontrados = [candidato for candidato in candidatos if candidato.exists()]
        if encontrados:
            return encontrados
        raise FileNotFoundError(
            "Microsoft Edge ou Google Chrome nÃ£o encontrado para gerar o PDF."
        )

    def _preencher_template_excel(self, worksheet, dados):
        for campo, celula in self.excel_template.cell_map.items():
            if not celula:
                continue
            worksheet[celula] = self._obter_valor_campo_excel(campo, dados)

        self._ajustar_layout_impressao_excel(worksheet)

    def _ajustar_layout_impressao_excel(self, worksheet):
        worksheet.print_area = "A1:J44"
        worksheet.page_setup.orientation = "landscape"
        worksheet.page_setup.paperSize = worksheet.PAPERSIZE_A4
        worksheet.page_setup.fitToWidth = 1
        worksheet.page_setup.fitToHeight = 1
        worksheet.sheet_properties.pageSetUpPr.fitToPage = True
        worksheet.page_margins = PageMargins(
            left=0.2,
            right=0.2,
            top=0.25,
            bottom=0.25,
            header=0.1,
            footer=0.1,
        )

    def _obter_valor_campo_excel(self, campo, dados):
        if campo == "Religador":
            return self._valor_texto(dados, "Numero", "") or self._valor_texto(
                dados, "Religador", ""
            )

        if campo == "Circuito":
            return self._valor_texto(dados, "Circuito", "")

        if campo == "TensaoPdf":
            return self._valor_texto(dados, "TensaoPdf", "") or self._valor_texto(
                dados, "Tensao", ""
            )

        if campo == "Observacoes":
            return self._montar_observacoes_excel(dados)

        return dados.get(campo, "")

    def _montar_observacoes_excel(self, dados):
        observacoes = self._valor_texto(dados, "Observacoes", "")
        engenheiro = self._valor_texto(dados, "Engenheiro", "")
        data_emissao = self._valor_texto(dados, "Data_Emissao", "")

        linhas = [
            "Single Shot: Ativo conforme os ajustes parametrizados na operacao 01.",
            "Linha Viva: Parametrizar para fase e neutro, curva 101, multiplicador de tempo em 0,01.",
            "",
            observacoes or "",
            "",
            f"Executado: {engenheiro}",
            f"Data: {data_emissao}",
        ]
        return "\n".join(linhas).strip()

    def gerar_pdf_excel(self, dados):
        return self._gerar_pdf_excel_em_destino(dados, self.base_dir / "pdfs")

    def gerar_pdf_excel_desktop(self, dados):
        return self._gerar_pdf_excel_em_destino(dados, self._obter_desktop_dir())

    def _obter_desktop_dir(self):
        home = Path.home()
        candidatos = [
            home / "Desktop",
            home / "Área de Trabalho",
        ]

        candidatos.extend(
            caminho
            for caminho in home.glob("OneDrive*")
            if caminho.is_dir()
            for caminho in (
                caminho / "Desktop",
                caminho / "Área de Trabalho",
            )
        )

        for candidato in candidatos:
            if candidato.exists():
                return candidato

        return home / "Desktop"

    def _gerar_pdf_excel_em_destino(self, dados, destino_dir):
        template_path = self.excel_template.template_path
        if not template_path.exists():
            raise FileNotFoundError(f"Template Excel nÃ£o encontrado: {template_path}")

        if pythoncom is None or DispatchEx is None:
            raise ImportError(
                "DependÃªncias de Excel nÃ£o instaladas. Instale openpyxl e pywin32."
            )

        pdf_root = Path(destino_dir)
        temp_root = pdf_root / ".tmp"
        pdf_root.mkdir(parents=True, exist_ok=True)
        temp_root.mkdir(parents=True, exist_ok=True)

        nome_pdf = self._montar_nome_pdf_excel(dados)
        pasta_temporaria = Path(
            tempfile.mkdtemp(
                prefix="excel_pdf_",
                dir=str(temp_root),
            )
        )
        arquivo_excel_temporario = pasta_temporaria / f"{Path(nome_pdf).stem}.xlsx"
        arquivo_pdf_final = pdf_root / nome_pdf

        workbook = load_workbook(template_path)
        try:
            if self.excel_template.sheet_name in workbook.sheetnames:
                worksheet = workbook[self.excel_template.sheet_name]
            else:
                worksheet = workbook[workbook.sheetnames[0]]

            self._preencher_template_excel(worksheet, dados)
            workbook.save(arquivo_excel_temporario)
        finally:
            workbook.close()

        excel = None
        workbook_com = None
        pythoncom.CoInitialize()
        try:
            excel = DispatchEx("Excel.Application")
            excel.Visible = False
            excel.DisplayAlerts = False

            workbook_com = excel.Workbooks.Open(str(arquivo_excel_temporario.resolve()))
            workbook_com.ExportAsFixedFormat(0, str(arquivo_pdf_final.resolve()))
        finally:
            if workbook_com is not None:
                workbook_com.Close(False)
            if excel is not None:
                excel.Quit()
            pythoncom.CoUninitialize()
            shutil.rmtree(pasta_temporaria, ignore_errors=True)

        if not arquivo_pdf_final.exists():
            raise FileNotFoundError("O Excel nÃ£o gerou o arquivo PDF.")

        return str(arquivo_pdf_final)

    def _campos_pdf(self):
        return {
            "ProteÃ§Ã£o de Fase": [
                ("Pickup 50P", "Pickup_50P"),
                ("Tempo MÃ­n. Fase", "Tempo_Minimo_50P"),
                ("Pickup 51P", "Pickup_51P"),
                ("Curva Temp.", "Curva_Fase"),
                ("Time Dial", "TimeDial_Fase"),
                ("Curva RÃ¡pida", "Curva_Rapida_Fase"),
                ("TD Curva RÃ¡pida", "TimeDial_CR"),
                ("Partida CR", "PartidaCR"),
            ],
            "ProteÃ§Ã£o de Neutro": [
                ("Pickup 50N", "Pickup_50N"),
                ("Tempo MÃ­n. Neutro", "Tempo_Minimo_50N"),
                ("Pickup 51N", "Pickup_51N"),
                ("Curva Neutro", "Curva_Neutro"),
                ("Time Dial", "TimeDial_Neutro"),
                ("Curva RÃ¡pida", "CurvaRapidaNeutro"),
                ("TD Curva RÃ¡pida", "Time_Dial_CR"),
                ("Partida CR", "Partida_da_CR"),
            ],
            "Sensitive Earth Fault": [
                ("Trip", "Trip"),
                ("TemporizaÃ§Ã£o", "Temporizacao"),
                ("OperaÃ§Ãµes", "Operacoes"),
                ("Tempo Morto", "Tempo_Morto"),
                ("OperaÃ§Ã£o 1", "Operacao_1"),
                ("OperaÃ§Ã£o 2", "Operacao_2"),
                ("OperaÃ§Ã£o 3", "Operacao_3"),
                ("OperaÃ§Ã£o 4", "Operacao_4"),
                ("T. Morto Adic.", "Tempo_Morto_Adicional"),
                ("Reset Time", "Reset_Time"),
                ("HCL", "HCL"),
                ("Maximum Time", "Maximum_Time"),
                ("Inrush", "Inrush"),
                ("Sequence Control", "Sequence_Control"),
            ],
        }

    def renderizar_html_pdf(self, dados):
        cabecalho = [
            ("NÃºmero", self._valor_texto(dados, "Numero", "-")),
            ("Circuito", self._valor_texto(dados, "Circuito", "-")),
            ("Regional", self._obter_regional_pdf(dados) or "-"),
            ("TensÃ£o", self._valor_texto(dados, "TensaoPdf", "-")),
            ("Marca", self._valor_texto(dados, "Marca", "-")),
            ("Executado por", self._valor_texto(dados, "Engenheiro", "-")),
            ("Data", self._valor_texto(dados, "Data_Emissao", "-")),
        ]
        observacoes = self._valor_texto(dados, "Observacoes", "")

        cards = "".join(
            f"<div class='meta-card'><span>{html.escape(rotulo)}</span><strong>{html.escape(valor)}</strong></div>"
            for rotulo, valor in cabecalho
        )
        blocos = "".join(
            f"""
<section class="bloco">
  <div class="bloco-titulo">{html.escape(titulo)}</div>
  <table>
    <tbody>
      {"".join(
          f"<tr><td>{html.escape(rotulo)}</td><td>{html.escape(self._valor_texto(dados, chave, '-'))}</td></tr>"
          for rotulo, chave in campos
      )}
    </tbody>
  </table>
</section>"""
            for titulo, campos in self._campos_pdf().items()
        )
        observacoes_html = (
            f"<section class='observacoes'><h2>ObservaÃ§Ãµes</h2><p>{html.escape(observacoes)}</p></section>"
            if observacoes
            else ""
        )

        return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ordem de Ajuste</title>
  <style>
    @page {{ size: A4 landscape; margin: 8mm; }}
    * {{ box-sizing: border-box; }}
    html, body {{ width: 100%; height: 100%; margin: 0; padding: 0; }}
    body {{ font-family: "Segoe UI", Arial, sans-serif; color: #111827; background: #ffffff; }}
    .page {{ min-height: 100%; display: flex; flex-direction: column; gap: 8px; }}
    .topo {{
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #111827;
    }}
    h1 {{ margin: 0; font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }}
    .subtitulo {{ margin-top: 2px; font-size: 10px; color: #475569; }}
    .tag {{
      border: 1px solid #111827;
      padding: 6px 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }}
    .meta-grid {{ display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }}
    .meta-card {{ border: 1px solid #cbd5e1; background: #f8fafc; padding: 6px 7px; min-height: 48px; }}
    .meta-card span {{
      display: block;
      margin-bottom: 4px;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }}
    .meta-card strong {{ display: block; font-size: 11px; line-height: 1.2; word-break: break-word; }}
    .blocos {{ display: grid; grid-template-columns: 1fr 1fr 1.08fr; gap: 6px; align-items: start; flex: 1; }}
    .bloco {{ border: 1px solid #cbd5e1; break-inside: avoid; }}
    .bloco-titulo {{
      padding: 6px 8px;
      background: #111827;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }}
    table {{ width: 100%; border-collapse: collapse; table-layout: fixed; }}
    td {{ border-top: 1px solid #e2e8f0; padding: 4px 6px; font-size: 9px; vertical-align: middle; }}
    td:first-child {{ width: 63%; font-weight: 700; color: #334155; background: #f8fafc; }}
    td:last-child {{ width: 37%; text-align: right; font-weight: 700; color: #111827; word-break: break-word; }}
    .observacoes {{ border: 1px solid #cbd5e1; min-height: 72px; }}
    .observacoes h2 {{
      margin: 0;
      padding: 6px 8px;
      background: #e2e8f0;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }}
    .observacoes p {{ margin: 0; padding: 8px; font-size: 10px; line-height: 1.35; white-space: pre-wrap; }}
  </style>
</head>
<body>
  <div class="page">
    <header class="topo">
      <div>
        <h1>Ordem de Ajuste</h1>
        <div class="subtitulo">Resumo tÃ©cnico para leitura rÃ¡pida em campo e impressÃ£o em uma folha A4.</div>
      </div>
      <div class="tag">Uso Operacional</div>
    </header>
    <section class="meta-grid">{cards}</section>
    <section class="blocos">{blocos}</section>
    {observacoes_html}
  </div>
</body>
</html>"""

    def renderizar_html_pdf_imagem(self, imagem_data_url):
        return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ordem de Ajuste</title>
  <style>
    @page {{ size: A4 landscape; margin: 6mm; }}
    html, body {{ margin: 0; padding: 0; background: #ffffff; }}
    body {{ width: 100%; height: 100%; }}
    .page {{
      width: 285mm;
      height: 198mm;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }}
    img {{
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      display: block;
      object-fit: contain;
    }}
  </style>
</head>
<body>
  <div class="page">
    <img alt="Ordem de Ajuste" src="{imagem_data_url}" />
  </div>
</body>
</html>"""

    def gerar_pdf_navegador(self, dados):
        nome_arquivo = self._montar_nome_pdf(dados)
        imagem_pdf = str(dados.get("PdfImageData", "")).strip()
        html_pdf = (
            self.renderizar_html_pdf_imagem(imagem_pdf)
            if imagem_pdf
            else str(dados.get("PdfHtml", "")).strip()
            or self.renderizar_html_pdf(dados)
        )
        navegadores = self._listar_navegadores_pdf()
        destinos = self._obter_destinos_pdf(dados)
        base_temporaria = self.base_dir / "pdfs" / ".tmp"
        base_temporaria.mkdir(parents=True, exist_ok=True)
        pasta_temporaria_path = (
            base_temporaria / datetime.now().strftime("%Y%m%d%H%M%S%f")
        )
        pasta_temporaria_path.mkdir(parents=True, exist_ok=True)
        arquivo_html = pasta_temporaria_path / "oaj-print.html"
        arquivo_pdf = pasta_temporaria_path / nome_arquivo

        try:
            arquivo_html.write_text(html_pdf, encoding="utf-8")
            erros = []
            for navegador in navegadores:
                comando = [
                    str(navegador),
                    "--headless=new",
                    "--disable-gpu",
                    "--no-first-run",
                    "--disable-extensions",
                    f"--print-to-pdf={arquivo_pdf}",
                    arquivo_html.as_uri(),
                ]
                try:
                    subprocess.run(
                        comando,
                        check=True,
                        capture_output=True,
                        text=True,
                        timeout=60,
                    )
                    break
                except subprocess.CalledProcessError as erro:
                    detalhe = (erro.stderr or erro.stdout or str(erro)).strip()
                    erros.append(f"{navegador.name}: {detalhe}")
                except subprocess.TimeoutExpired:
                    erros.append(
                        f"{navegador.name}: tempo excedido ao gerar o PDF."
                    )
            else:
                raise RuntimeError(" | ".join(erros) or "Falha ao gerar o PDF.")

            if not arquivo_pdf.exists():
                raise FileNotFoundError("O navegador nÃ£o gerou o arquivo PDF.")

            arquivos_salvos = []
            for pasta_destino in destinos:
                pasta_destino.mkdir(parents=True, exist_ok=True)
                destino_final = pasta_destino / nome_arquivo
                shutil.copy2(arquivo_pdf, destino_final)
                arquivos_salvos.append(str(destino_final))

            return arquivos_salvos
        finally:
            shutil.rmtree(pasta_temporaria_path, ignore_errors=True)
