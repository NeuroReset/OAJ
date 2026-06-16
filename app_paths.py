import sys
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
