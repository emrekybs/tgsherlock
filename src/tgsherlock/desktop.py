"""Linux desktop integration: application-menu entry with icon."""
import os
import shutil
import subprocess
import sys
from importlib import resources
from pathlib import Path

DESKTOP_NAME = "tgsherlock.desktop"


def _data_home() -> Path:
    return Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share")


def _paths():
    base = _data_home()
    return (base / "applications" / DESKTOP_NAME,
            base / "icons" / "hicolor" / "256x256" / "apps" / "tgsherlock.png")


def _executable() -> str:
    found = shutil.which("tgsherlock")
    if found:
        return str(Path(found).resolve())
    argv0 = Path(sys.argv[0])
    if argv0.name == "tgsherlock" and argv0.exists():
        return str(argv0.resolve())
    return f"{sys.executable} -m tgsherlock"


def supported() -> bool:
    return sys.platform.startswith("linux")


def status() -> dict:
    entry, icon = _paths()
    return {"supported": supported(), "installed": entry.exists(), "path": str(entry)}


def install() -> Path:
    entry, icon = _paths()
    entry.parent.mkdir(parents=True, exist_ok=True)
    icon.parent.mkdir(parents=True, exist_ok=True)
    src = resources.files("tgsherlock") / "assets" / "tgsherlock.png"
    icon.write_bytes(src.read_bytes())
    exe = _executable()
    entry.write_text(
        "[Desktop Entry]\n"
        "Type=Application\n"
        "Name=TGSherlock\n"
        "GenericName=Telegram OSINT\n"
        "Comment=Telegram OSINT panel: monitor users and groups, alerts, sweeps\n"
        f"Exec={exe}\n"
        f"Icon={icon}\n"
        "Terminal=false\n"
        "Categories=Network;Security;Utility;\n"
        "Keywords=telegram;osint;monitor;sherlock;\n"
        "StartupNotify=false\n",
        encoding="utf-8",
    )
    entry.chmod(0o755)
    for cmd in (["update-desktop-database", str(entry.parent)],
                ["gtk-update-icon-cache", "-q", "-t", str(_data_home() / "icons" / "hicolor")]):
        if shutil.which(cmd[0]):
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    return entry


def uninstall():
    for path in _paths():
        try:
            path.unlink()
        except OSError:
            pass
