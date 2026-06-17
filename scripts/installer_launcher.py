import subprocess
import sys
from pathlib import Path
import ctypes


CREATE_NO_WINDOW = 0x08000000
MB_ICONERROR = 0x00000010
MB_ICONINFORMATION = 0x00000040
MB_OK = 0x00000000


def app_dir():
    return Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent


def show_message(title, message, flags):
    ctypes.windll.user32.MessageBoxW(None, str(message), str(title), flags | MB_OK)


def main():
    base_dir = app_dir()
    install_script = base_dir / "Instalar-OAJ.ps1"
    dist_dir = base_dir / "dist" / "OAJ"

    if not install_script.exists():
        show_message("OAJ Installer", f"Instalador PowerShell não encontrado em:\n{install_script}", MB_ICONERROR)
        return 1

    if not dist_dir.exists():
        show_message("OAJ Installer", f"Pasta do aplicativo não encontrada em:\n{dist_dir}", MB_ICONERROR)
        return 1

    command = [
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(install_script),
        "-SourcePath",
        str(dist_dir),
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            creationflags=CREATE_NO_WINDOW,
            check=False,
        )
    except Exception as exc:
        show_message("OAJ Installer", f"Falha ao iniciar a instalação:\n{exc}", MB_ICONERROR)
        return 1

    if result.returncode != 0:
        details = (result.stderr or result.stdout or "Erro desconhecido").strip()
        show_message("OAJ Installer", f"A instalação falhou.\n\n{details}", MB_ICONERROR)
        return result.returncode

    show_message(
        "OAJ Installer",
        "Instalação concluída com sucesso.\nO atalho do OAJ foi criado na área de trabalho.",
        MB_ICONINFORMATION,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
