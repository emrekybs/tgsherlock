"""Filesystem locations (XDG compliant)."""
import os
from pathlib import Path

APP = "tgsherlock"


def _xdg(var: str, default: Path) -> Path:
    value = os.environ.get(var)
    return Path(value) if value else default


def config_dir() -> Path:
    override = os.environ.get("TGSHERLOCK_CONFIG_DIR")
    path = Path(override) if override else _xdg("XDG_CONFIG_HOME", Path.home() / ".config") / APP
    path.mkdir(parents=True, exist_ok=True)
    return path


def data_dir() -> Path:
    override = os.environ.get("TGSHERLOCK_DATA_DIR")
    path = Path(override) if override else _xdg("XDG_DATA_HOME", Path.home() / ".local" / "share") / APP
    path.mkdir(parents=True, exist_ok=True)
    return path


def sessions_dir() -> Path:
    path = config_dir() / "sessions"
    path.mkdir(parents=True, exist_ok=True)
    try:
        path.chmod(0o700)
    except OSError:
        pass
    return path


def account_dir(account_id) -> Path:
    path = data_dir() / "accounts" / str(account_id)
    (path / "media").mkdir(parents=True, exist_ok=True)
    return path
