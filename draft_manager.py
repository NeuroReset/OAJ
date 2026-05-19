import json
import os
import time


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DATA_DIR = os.path.join(BASE_DIR, "app_data")
DRAFTS_DIR = os.path.join(APP_DATA_DIR, "drafts")
LOCKS_DIR = os.path.join(APP_DATA_DIR, "locks")
LEGACY_USERS_DIR = os.path.join(APP_DATA_DIR, "users")
LEGACY_SESSION_FILE = os.path.join(LEGACY_USERS_DIR, "session.json")
LOCK_EXPIRATION_SECONDS = 10 * 60


def _session_root_dir():
    local_app_data = str(os.environ.get("LOCALAPPDATA", "")).strip()
    roaming_app_data = str(os.environ.get("APPDATA", "")).strip()
    home_dir = os.path.expanduser("~")
    base_dir = local_app_data or roaming_app_data or os.path.join(home_dir, ".oaj")
    return os.path.join(base_dir, "OAJ")


SESSION_DIR = _session_root_dir()
SESSION_FILE = os.path.join(SESSION_DIR, "session.json")
SETTINGS_FILE = os.path.join(SESSION_DIR, "settings.json")


def _log(message):
    print(f"[draft_manager] {message}")


def _ensure_directories():
    for path in (APP_DATA_DIR, DRAFTS_DIR, LOCKS_DIR, SESSION_DIR):
        os.makedirs(path, exist_ok=True)


def _safe_equipment_id(equipment_id):
    equipment_text = str(equipment_id or "").strip()
    if not equipment_text:
        raise ValueError("equipment_id é obrigatório.")
    return "".join(
        character if character.isalnum() or character in ("-", "_") else "_"
        for character in equipment_text
    )


def _safe_matricula(matricula):
    matricula_text = str(matricula or "").strip()
    if not matricula_text:
        raise ValueError("matricula é obrigatória.")
    return "".join(
        character if character.isalnum() or character in ("-", "_") else "_"
        for character in matricula_text
    )


def _draft_path(matricula, equipment_id):
    safe_matricula = _safe_matricula(matricula)
    safe_equipment = _safe_equipment_id(equipment_id)
    return os.path.join(DRAFTS_DIR, f"{safe_matricula}_{safe_equipment}.json")


def _lock_path(equipment_id):
    safe_equipment = _safe_equipment_id(equipment_id)
    return os.path.join(LOCKS_DIR, f"{safe_equipment}.lock")


def _read_json_file(path):
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def _write_json_file(path, data):
    temp_path = f"{path}.tmp"
    with open(temp_path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    os.replace(temp_path, path)


def _read_lock_file(path):
    with open(path, "r", encoding="utf-8") as file:
        content = file.read().strip()

    if not content:
        raise ValueError("Arquivo de lock vazio.")

    parts = content.split("|", 1)
    if len(parts) != 2:
        raise ValueError("Formato de lock inválido.")

    matricula = parts[0].strip()
    timestamp_text = parts[1].strip()

    if not matricula or not timestamp_text:
        raise ValueError("Conteúdo de lock inválido.")

    timestamp = float(timestamp_text)
    return {
        "matricula": matricula,
        "timestamp": timestamp,
        "expired": _is_lock_expired(timestamp),
    }


def _write_lock_file(path, matricula, timestamp=None):
    lock_timestamp = float(timestamp if timestamp is not None else time.time())
    temp_path = f"{path}.tmp"
    with open(temp_path, "w", encoding="utf-8") as file:
        file.write(f"{matricula}|{lock_timestamp}")
    os.replace(temp_path, path)


def _is_lock_expired(timestamp):
    return (time.time() - float(timestamp)) > LOCK_EXPIRATION_SECONDS


def _remove_file_if_exists(path):
    try:
        os.remove(path)
        return True
    except FileNotFoundError:
        return False


def _require_session():
    session = load_session()
    matricula = str(session.get("matricula", "")).strip()
    if not matricula:
        raise RuntimeError("Sem sessão ativa.")
    return session


def _resolve_external_function(name):
    function = globals().get(name)
    if callable(function):
        return function
    raise RuntimeError(f"Função externa não configurada: {name}")


def load_session():
    _ensure_directories()
    try:
        session_path = SESSION_FILE
        if not os.path.exists(session_path) and os.path.exists(LEGACY_SESSION_FILE):
            session_path = LEGACY_SESSION_FILE

        if not os.path.exists(session_path):
            raise FileNotFoundError("Arquivo de sessão não encontrado.")

        session = _read_json_file(session_path)
        if not isinstance(session, dict):
            raise ValueError("Conteúdo de sessão inválido.")

        matricula = str(session.get("matricula", "")).strip()
        if not matricula:
            raise ValueError("Sessão sem matrícula.")

        if session_path == LEGACY_SESSION_FILE:
            save_session(matricula)

        _log(f"Sessão carregada para matrícula {matricula}.")
        return {"matricula": matricula}
    except Exception as error:
        _log(f"Erro ao carregar sessão: {error}")
        raise


def load_settings():
    _ensure_directories()
    if not os.path.exists(SETTINGS_FILE):
        return {}

    settings = _read_json_file(SETTINGS_FILE)
    if not isinstance(settings, dict):
        raise ValueError("Conteúdo de settings inválido.")
    return settings


def save_settings(data):
    _ensure_directories()
    if not isinstance(data, dict):
        raise ValueError("settings deve ser um dicionário.")

    atual = {}
    if os.path.exists(SETTINGS_FILE):
        carregado = load_settings()
        if isinstance(carregado, dict):
            atual = carregado

    atualizado = {**atual, **data, "saved_at": time.time()}
    _write_json_file(SETTINGS_FILE, atualizado)
    _log("Configurações locais salvas.")
    return atualizado


def save_session(matricula):
    _ensure_directories()
    try:
        safe_matricula = str(matricula or "").strip()
        if not safe_matricula:
            raise ValueError("matricula é obrigatória.")

        payload = {
            "matricula": safe_matricula,
            "saved_at": time.time(),
        }
        _write_json_file(SESSION_FILE, payload)
        _log(f"Sessão salva para matrícula {safe_matricula}.")
        return payload
    except Exception as error:
        _log(f"Erro ao salvar sessão: {error}")
        raise


def save_draft(matricula, equipment_id, dados):
    _ensure_directories()
    try:
        if not isinstance(dados, dict):
            raise ValueError("dados deve ser um dicionário.")

        path = _draft_path(matricula, equipment_id)
        payload = {
            "matricula": str(matricula).strip(),
            "equipment_id": str(equipment_id).strip(),
            "saved_at": time.time(),
            "dados": dados,
        }
        _write_json_file(path, payload)
        _log(f"Draft salvo em {path}.")
        return path
    except Exception as error:
        _log(f"Erro ao salvar draft: {error}")
        raise


def load_draft(matricula, equipment_id):
    _ensure_directories()
    try:
        path = _draft_path(matricula, equipment_id)
        if not os.path.exists(path):
            raise FileNotFoundError("Draft não encontrado.")

        payload = _read_json_file(path)
        if not isinstance(payload, dict):
            raise ValueError("Conteúdo de draft inválido.")

        dados = payload.get("dados")
        if not isinstance(dados, dict):
            raise ValueError("Draft sem dados válidos.")

        _log(f"Draft carregado de {path}.")
        return payload
    except Exception as error:
        _log(f"Erro ao carregar draft: {error}")
        raise


def delete_draft(matricula, equipment_id):
    _ensure_directories()
    try:
        path = _draft_path(matricula, equipment_id)
        deleted = _remove_file_if_exists(path)
        if deleted:
            _log(f"Draft removido de {path}.")
        else:
            _log(f"Nenhum draft encontrado para remoção em {path}.")
        return deleted
    except Exception as error:
        _log(f"Erro ao remover draft: {error}")
        raise


def list_drafts(matricula=None):
    _ensure_directories()
    try:
        requested_matricula = str(matricula or "").strip()
        drafts = []

        for file_name in sorted(os.listdir(DRAFTS_DIR)):
            if not file_name.lower().endswith(".json"):
                continue

            file_path = os.path.join(DRAFTS_DIR, file_name)
            payload = _read_json_file(file_path)
            if not isinstance(payload, dict):
                continue

            draft_matricula = str(payload.get("matricula", "")).strip()
            equipment_id = str(payload.get("equipment_id", "")).strip()
            saved_at = payload.get("saved_at")
            dados = payload.get("dados") if isinstance(payload.get("dados"), dict) else {}

            if requested_matricula and draft_matricula != requested_matricula:
                continue

            lock_info = check_lock(equipment_id) if equipment_id else {
                "locked": False,
                "matricula": None,
                "timestamp": None,
                "expired": False,
            }

            drafts.append(
                {
                    "matricula": draft_matricula,
                    "equipment_id": equipment_id,
                    "saved_at": saved_at,
                    "file_name": file_name,
                    "numero": str(dados.get("Numero", "")).strip(),
                    "circuito": str(dados.get("Circuito", "")).strip(),
                    "regional": str(dados.get("Regional", "")).strip(),
                    "engenheiro": str(dados.get("Engenheiro", "")).strip(),
                    "data_emissao": str(dados.get("Data_Emissao", "")).strip(),
                    "lock": lock_info,
                }
            )

        drafts.sort(key=lambda item: float(item.get("saved_at") or 0), reverse=True)
        _log(f"{len(drafts)} draft(s) listado(s).")
        return drafts
    except Exception as error:
        _log(f"Erro ao listar drafts: {error}")
        raise


def check_lock(equipment_id):
    _ensure_directories()
    try:
        path = _lock_path(equipment_id)
        if not os.path.exists(path):
            return {
                "locked": False,
                "matricula": None,
                "timestamp": None,
                "expired": False,
            }

        lock_info = _read_lock_file(path)
        if lock_info["expired"]:
            _remove_file_if_exists(path)
            _log(f"Lock expirado removido para equipment {equipment_id}.")
            return {
                "locked": False,
                "matricula": None,
                "timestamp": None,
                "expired": True,
            }

        return {
            "locked": True,
            "matricula": lock_info["matricula"],
            "timestamp": lock_info["timestamp"],
            "expired": False,
        }
    except Exception as error:
        _log(f"Erro ao verificar lock: {error}")
        raise


def acquire_lock(matricula, equipment_id):
    _ensure_directories()
    try:
        safe_matricula = str(matricula or "").strip()
        if not safe_matricula:
            raise ValueError("matricula é obrigatória.")

        path = _lock_path(equipment_id)
        current_lock = check_lock(equipment_id)

        if current_lock["locked"] and current_lock["matricula"] != safe_matricula:
            _log(
                f"Lock já pertence à matrícula {current_lock['matricula']} para equipment {equipment_id}."
            )
            return False

        if current_lock["locked"] and current_lock["matricula"] == safe_matricula:
            _write_lock_file(path, safe_matricula)
            _log(f"Lock renovado para matrícula {safe_matricula}.")
            return True

        lock_content = f"{safe_matricula}|{time.time()}"
        file_descriptor = None
        try:
            file_descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            with os.fdopen(file_descriptor, "w", encoding="utf-8") as file:
                file_descriptor = None
                file.write(lock_content)
            _log(f"Lock adquirido para matrícula {safe_matricula}.")
            return True
        except FileExistsError:
            current_lock = check_lock(equipment_id)
            if current_lock["locked"] and current_lock["matricula"] != safe_matricula:
                _log(
                    f"Falha ao adquirir lock: equipamento em uso por {current_lock['matricula']}."
                )
                return False

            _write_lock_file(path, safe_matricula)
            _log(f"Lock adquirido após reconciliação para matrícula {safe_matricula}.")
            return True
        finally:
            if file_descriptor is not None:
                os.close(file_descriptor)
    except Exception as error:
        _log(f"Erro ao adquirir lock: {error}")
        raise


def release_lock(equipment_id):
    _ensure_directories()
    try:
        path = _lock_path(equipment_id)
        released = _remove_file_if_exists(path)
        if released:
            _log(f"Lock liberado para equipment {equipment_id}.")
        else:
            _log(f"Nenhum lock encontrado para equipment {equipment_id}.")
        return released
    except Exception as error:
        _log(f"Erro ao liberar lock: {error}")
        raise


def publish_document(matricula, equipment_id, dados=None):
    _ensure_directories()
    try:
        if not str(matricula or "").strip():
            raise ValueError("matricula é obrigatória.")

        session = _require_session()
        session_matricula = str(session["matricula"]).strip()
        requested_matricula = str(matricula).strip()

        if session_matricula != requested_matricula:
            raise RuntimeError("Sessão inválida para a matrícula informada.")

        provided_data = dados if isinstance(dados, dict) else None
        lock_info = check_lock(equipment_id)
        if provided_data:
            lock_owner = str(lock_info.get("matricula", "")).strip()
            if lock_info["locked"] and lock_owner != requested_matricula:
                raise RuntimeError("Lock pertence a outro usuário.")

            if not lock_info["locked"] and not acquire_lock(requested_matricula, equipment_id):
                raise RuntimeError("Não foi possível adquirir lock para publicar.")

            dados = provided_data
        else:
            if not lock_info["locked"]:
                raise RuntimeError("Sem lock ativo para este equipamento.")

            if str(lock_info["matricula"]).strip() != requested_matricula:
                raise RuntimeError("Lock pertence a outro usuário.")

            draft_payload = load_draft(requested_matricula, equipment_id)
            dados = draft_payload.get("dados")
            if not isinstance(dados, dict) or not dados:
                raise RuntimeError("Sem draft para publicar.")

        _log("Iniciando publicação do documento.")

        insert_result = _resolve_external_function("insert_db")(dados)
        pdf_path = _resolve_external_function("generate_pdf")(dados)
        upload_result = _resolve_external_function("upload_sharepoint")(pdf_path)

        delete_draft(requested_matricula, equipment_id)
        release_lock(equipment_id)

        result = {
            "status": "success",
            "message": "Documento publicado com sucesso.",
            "insert_result": insert_result,
            "pdf_path": pdf_path,
            "upload_result": upload_result,
        }
        _log("Publicação concluída com sucesso.")
        return result
    except Exception as error:
        _log(f"Erro ao publicar documento: {error}")
        raise
