import json
import os
import time

from sqlalchemy import text

from app_paths import app_root, user_data_path, user_data_root
from db import get_conn

BASE_DIR = str(app_root())
APP_DATA_DIR = str(user_data_path("app_data"))
LEGACY_USERS_DIR = os.path.join(APP_DATA_DIR, "users")
LEGACY_SESSION_FILE = os.path.join(LEGACY_USERS_DIR, "session.json")
DRAFT_TABLE = "dbo.oaj_drafts"


def _session_root_dir():
    return str(user_data_root())


SESSION_DIR = _session_root_dir()
SESSION_FILE = os.path.join(SESSION_DIR, "session.json")
SETTINGS_FILE = os.path.join(SESSION_DIR, "settings.json")


def _log(message):
    print(f"[draft_manager] {message}")


def _ensure_directories():
    for path in (APP_DATA_DIR, LEGACY_USERS_DIR, SESSION_DIR):
        os.makedirs(path, exist_ok=True)


def _safe_equipment_id(equipment_id):
    equipment_text = str(equipment_id or "").strip()
    if not equipment_text:
        raise ValueError("equipment_id e obrigatorio.")
    return equipment_text


def _safe_matricula(matricula):
    matricula_text = str(matricula or "").strip()
    if not matricula_text:
        raise ValueError("matricula e obrigatoria.")
    return matricula_text


def _read_json_file(path):
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def _write_json_file(path, data):
    temp_path = f"{path}.tmp"
    with open(temp_path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    os.replace(temp_path, path)


def _require_session():
    session = load_session()
    matricula = str(session.get("matricula", "")).strip()
    if not matricula:
        raise RuntimeError("Sem sessao ativa.")
    return session


def _resolve_external_function(name):
    function = globals().get(name)
    if callable(function):
        return function
    raise RuntimeError(f"Funcao externa nao configurada: {name}")


def _notify_publish_status(stage, message, progress, active=True, error=""):
    function = globals().get("update_publish_status")
    if callable(function):
        try:
            function(stage, message, progress, active=active, error=error)
        except Exception:
            pass


def _draft_lock_info():
    return {
        "locked": False,
        "matricula": None,
        "timestamp": None,
        "expired": False,
    }


def _row_to_draft_payload(row):
    if not row:
        raise FileNotFoundError("Draft nao encontrado.")

    payload_json = row.get("payload_json")
    try:
        dados = json.loads(payload_json) if payload_json else {}
    except json.JSONDecodeError as error:
        raise ValueError("Conteudo de draft invalido.") from error

    if not isinstance(dados, dict):
        raise ValueError("Draft sem dados validos.")

    saved_at = row.get("updated_at") or row.get("created_at")
    saved_at_epoch = saved_at.timestamp() if saved_at else None

    return {
        "matricula": str(row.get("matricula", "")).strip(),
        "equipment_id": str(row.get("equipment_id", "")).strip(),
        "saved_at": saved_at_epoch,
        "dados": dados,
    }


def load_session():
    _ensure_directories()
    try:
        session_path = SESSION_FILE
        if not os.path.exists(session_path) and os.path.exists(LEGACY_SESSION_FILE):
            session_path = LEGACY_SESSION_FILE

        if not os.path.exists(session_path):
            raise FileNotFoundError("Arquivo de sessao nao encontrado.")

        session = _read_json_file(session_path)
        if not isinstance(session, dict):
            raise ValueError("Conteudo de sessao invalido.")

        matricula = str(session.get("matricula", "")).strip()
        if not matricula:
            raise ValueError("Sessao sem matricula.")

        if session_path == LEGACY_SESSION_FILE:
            save_session(matricula)

        _log(f"Sessao carregada para matricula {matricula}.")
        return {"matricula": matricula}
    except Exception as error:
        _log(f"Erro ao carregar sessao: {error}")
        raise


def load_settings():
    _ensure_directories()
    if not os.path.exists(SETTINGS_FILE):
        return {}

    settings = _read_json_file(SETTINGS_FILE)
    if not isinstance(settings, dict):
        raise ValueError("Conteudo de settings invalido.")
    return settings


def save_settings(data):
    _ensure_directories()
    if not isinstance(data, dict):
        raise ValueError("settings deve ser um dicionario.")

    atual = {}
    if os.path.exists(SETTINGS_FILE):
        carregado = load_settings()
        if isinstance(carregado, dict):
            atual = carregado

    atualizado = {**atual, **data, "saved_at": time.time()}
    _write_json_file(SETTINGS_FILE, atualizado)
    _log("Configuracoes locais salvas.")
    return atualizado


def save_session(matricula):
    _ensure_directories()
    try:
        safe_matricula = _safe_matricula(matricula)
        payload = {
            "matricula": safe_matricula,
            "saved_at": time.time(),
        }
        _write_json_file(SESSION_FILE, payload)
        _log(f"Sessao salva para matricula {safe_matricula}.")
        return payload
    except Exception as error:
        _log(f"Erro ao salvar sessao: {error}")
        raise


def save_draft(matricula, equipment_id, dados):
    try:
        if not isinstance(dados, dict):
            raise ValueError("dados deve ser um dicionario.")

        safe_matricula = _safe_matricula(matricula)
        safe_equipment_id = _safe_equipment_id(equipment_id)
        regional = str(dados.get("Regional", "")).strip() or None
        numero = str(dados.get("Numero", "")).strip() or None
        payload_json = json.dumps(dados, ensure_ascii=False)

        with get_conn() as conn:
            existing_id = conn.execute(
                text(
                    f"""
                    SELECT TOP (1) id
                    FROM {DRAFT_TABLE}
                    WHERE matricula = :matricula
                      AND equipment_id = :equipment_id
                      AND status = 'draft'
                    ORDER BY updated_at DESC, id DESC
                    """
                ),
                {"matricula": safe_matricula, "equipment_id": safe_equipment_id},
            ).scalar()

            params = {
                "matricula": safe_matricula,
                "regional": regional,
                "equipment_id": safe_equipment_id,
                "numero": numero,
                "payload_json": payload_json,
            }
            if existing_id:
                conn.execute(
                    text(
                        f"""
                        UPDATE {DRAFT_TABLE}
                        SET regional = :regional,
                            numero = :numero,
                            payload_json = :payload_json,
                            updated_at = SYSDATETIME()
                        WHERE id = :id
                        """
                    ),
                    {**params, "id": existing_id},
                )
            else:
                conn.execute(
                    text(
                        f"""
                        INSERT INTO {DRAFT_TABLE} (
                            matricula,
                            regional,
                            equipment_id,
                            numero,
                            payload_json,
                            status,
                            created_at,
                            updated_at
                        )
                        VALUES (
                            :matricula,
                            :regional,
                            :equipment_id,
                            :numero,
                            :payload_json,
                            'draft',
                            SYSDATETIME(),
                            SYSDATETIME()
                        )
                        """
                    ),
                    params,
                )
            conn.commit()

        _log(
            f"Draft salvo no banco para matricula {safe_matricula} e equipment {safe_equipment_id}."
        )
        return safe_equipment_id
    except Exception as error:
        _log(f"Erro ao salvar draft: {error}")
        raise


def load_draft(matricula, equipment_id):
    try:
        safe_matricula = _safe_matricula(matricula)
        safe_equipment_id = _safe_equipment_id(equipment_id)
        with get_conn() as conn:
            row = conn.execute(
                text(
                    f"""
                    SELECT TOP (1)
                        matricula,
                        equipment_id,
                        payload_json,
                        created_at,
                        updated_at
                    FROM {DRAFT_TABLE}
                    WHERE matricula = :matricula
                      AND equipment_id = :equipment_id
                      AND status = 'draft'
                    ORDER BY updated_at DESC, id DESC
                    """
                ),
                {"matricula": safe_matricula, "equipment_id": safe_equipment_id},
            ).mappings().first()

        payload = _row_to_draft_payload(row)
        _log(
            f"Draft carregado do banco para matricula {safe_matricula} e equipment {safe_equipment_id}."
        )
        return payload
    except Exception as error:
        _log(f"Erro ao carregar draft: {error}")
        raise


def delete_draft(matricula, equipment_id):
    try:
        safe_matricula = _safe_matricula(matricula)
        safe_equipment_id = _safe_equipment_id(equipment_id)
        with get_conn() as conn:
            result = conn.execute(
                text(
                    f"""
                    DELETE FROM {DRAFT_TABLE}
                    WHERE matricula = :matricula
                      AND equipment_id = :equipment_id
                      AND status = 'draft'
                    """
                ),
                {"matricula": safe_matricula, "equipment_id": safe_equipment_id},
            )
            conn.commit()

        deleted = bool(result.rowcount and result.rowcount > 0)
        if deleted:
            _log(
                f"Draft removido do banco para matricula {safe_matricula} e equipment {safe_equipment_id}."
            )
        else:
            _log(
                f"Nenhum draft encontrado para remocao no banco para matricula {safe_matricula} e equipment {safe_equipment_id}."
            )
        return deleted
    except Exception as error:
        _log(f"Erro ao remover draft: {error}")
        raise


def list_drafts(matricula=None):
    try:
        requested_matricula = str(matricula or "").strip()
        query = f"""
        SELECT
            matricula,
            regional,
            equipment_id,
            numero,
            payload_json,
            created_at,
            updated_at,
            id
        FROM {DRAFT_TABLE}
        WHERE status = 'draft'
        """
        params = {}
        if requested_matricula:
            query += " AND matricula = :matricula"
            params["matricula"] = requested_matricula
        query += " ORDER BY updated_at DESC, id DESC"

        with get_conn() as conn:
            rows = conn.execute(text(query), params).mappings().all()

        drafts = []
        for row in rows:
            payload = _row_to_draft_payload(row)
            dados = payload.get("dados", {})
            drafts.append(
                {
                    "matricula": payload.get("matricula", ""),
                    "equipment_id": payload.get("equipment_id", ""),
                    "saved_at": payload.get("saved_at"),
                    "file_name": "",
                    "numero": str(row.get("numero") or dados.get("Numero") or "").strip(),
                    "circuito": str(dados.get("Circuito", "")).strip(),
                    "regional": str(row.get("regional") or dados.get("Regional") or "").strip(),
                    "engenheiro": str(dados.get("Engenheiro", "")).strip(),
                    "data_emissao": str(dados.get("Data_Emissao", "")).strip(),
                    "lock": _draft_lock_info(),
                }
            )

        _log(f"{len(drafts)} draft(s) listado(s).")
        return drafts
    except Exception as error:
        _log(f"Erro ao listar drafts: {error}")
        raise


def check_lock(equipment_id):
    return _draft_lock_info()


def acquire_lock(matricula, equipment_id):
    return True


def release_lock(equipment_id):
    return False


def mark_draft_as_published(matricula, equipment_id):
    with get_conn() as conn:
        result = conn.execute(
            text(
                f"""
                UPDATE {DRAFT_TABLE}
                SET status = 'published',
                    published_at = SYSDATETIME(),
                    updated_at = SYSDATETIME()
                WHERE matricula = :matricula
                  AND equipment_id = :equipment_id
                  AND status = 'draft'
                """
            ),
            {
                "matricula": _safe_matricula(matricula),
                "equipment_id": _safe_equipment_id(equipment_id),
            },
        )
        conn.commit()
        return bool(result.rowcount and result.rowcount > 0)


def publish_document(matricula, equipment_id, dados=None):
    try:
        requested_matricula = _safe_matricula(matricula)
        requested_equipment_id = _safe_equipment_id(equipment_id)

        session = _require_session()
        session_matricula = str(session["matricula"]).strip()
        if session_matricula != requested_matricula:
            raise RuntimeError("Sessao invalida para a matricula informada.")

        payload = dados if isinstance(dados, dict) else None
        if payload is None:
            draft_payload = load_draft(requested_matricula, requested_equipment_id)
            payload = draft_payload.get("dados")
            if not isinstance(payload, dict) or not payload:
                raise RuntimeError("Sem draft para publicar.")

        _log("Iniciando publicacao do documento.")
        _notify_publish_status("database", "Salvando dados no banco...", 20)

        insert_result = _resolve_external_function("insert_db")(payload)
        _notify_publish_status("pdf", "Gerando PDF...", 55)
        generated_pdf = _resolve_external_function("generate_pdf")(payload)

        if isinstance(generated_pdf, dict):
            pdf_path = str(generated_pdf.get("pdf_path", "")).strip()
            upload_result = str(generated_pdf.get("upload_result", "")).strip()
            arquivos_pdf = [
                str(arquivo).strip()
                for arquivo in (generated_pdf.get("arquivos_pdf") or [])
                if str(arquivo).strip()
            ]
        else:
            pdf_path = str(generated_pdf or "").strip()
            upload_result = ""
            arquivos_pdf = [pdf_path] if pdf_path else []

        if pdf_path and not upload_result:
            _notify_publish_status("upload", "Enviando PDF para SharePoint...", 82)
            upload_result = _resolve_external_function("upload_sharepoint")(pdf_path)

        mark_draft_as_published(requested_matricula, requested_equipment_id)
        _notify_publish_status("finalizing", "Finalizando publicação...", 96)

        result = {
            "status": "success",
            "message": "Documento publicado com sucesso.",
            "insert_result": insert_result,
            "pdf_path": pdf_path,
            "upload_result": upload_result,
            "arquivos_pdf": arquivos_pdf,
        }
        _log("Publicacao concluida com sucesso.")
        return result
    except Exception as error:
        _notify_publish_status(
            "error",
            "Falha na publicação.",
            100,
            active=False,
            error=str(error),
        )
        _log(f"Erro ao publicar documento: {error}")
        raise
