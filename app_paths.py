import sys
import os
from pathlib import Path


def app_root():
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def bundled_root():
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        return Path(meipass)
    return app_root()


def user_data_root():
    local_app_data = str(os.environ.get("LOCALAPPDATA", "")).strip()
    roaming_app_data = str(os.environ.get("APPDATA", "")).strip()
    home_dir = Path.home()
    base_dir = Path(local_app_data or roaming_app_data or (home_dir / ".oaj"))
    return base_dir / "OAJ"


def user_data_path(*relative_parts):
    return user_data_root().joinpath(*relative_parts)


def resource_path(*relative_parts):
    candidates = [
        app_root().joinpath(*relative_parts),
        bundled_root().joinpath(*relative_parts),
    ]
    return first_existing_path(*candidates)


def first_existing_path(*paths):
    for path in paths:
        if path.exists():
            return path
    return paths[0]
