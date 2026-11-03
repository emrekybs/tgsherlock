"""Persistent settings stored as JSON in ~/.config/tgsherlock/config.json (mode 600)."""
import copy
import json
import os
import threading

from .paths import config_dir

DEFAULTS = {
    "accounts": [],          # [{id, name, username, phone, api_id, api_hash, session}]
    "active": None,          # active account id
    "last_api": {"api_id": "", "api_hash": ""},
    "prefs": {
        "notify": True,      # desktop notifications in the browser
        "media": True,       # download media from live targets
        "autostart": False,  # resume live monitor on launch
        "browser": True,     # open browser when the server starts
    },
    "risk": {
        "high": ["leak", "dump", "combo", "breach", "ransomware", "exploit", "ddos", "carding"],
        "watch": ["database", "password", "credentials", "access", "admin panel", "vpn"],
    },
    "smtp": {
        "host": "", "port": 587, "security": "starttls",
        "user": "", "password": "", "sender": "", "to": "",
    },
    "port": 8765,
    "desktop_installed": False,
}


def _merge(base, extra):
    out = copy.deepcopy(base)
    for key, value in (extra or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _merge(out[key], value)
        else:
            out[key] = value
    return out


class Settings:
    def __init__(self, path=None):
        self.path = path or (config_dir() / "config.json")
        self._lock = threading.Lock()
        self.data = copy.deepcopy(DEFAULTS)
        if self.path.exists():
            try:
                self.data = _merge(DEFAULTS, json.loads(self.path.read_text("utf-8")))
            except (ValueError, OSError):
                backup = self.path.with_suffix(".broken.json")
                try:
                    self.path.replace(backup)
                except OSError:
                    pass

    def __getitem__(self, key):
        return self.data[key]

    def get(self, key, default=None):
        return self.data.get(key, default)

    def update(self, patch: dict):
        self.data = _merge(self.data, patch)
        self.save()

    def set(self, key, value):
        self.data[key] = value
        self.save()

    def save(self):
        with self._lock:
            tmp = self.path.with_suffix(".tmp")
            fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                json.dump(self.data, fh, indent=2, ensure_ascii=False)
            os.replace(tmp, self.path)

    # ---- accounts -------------------------------------------------------
    def account(self, account_id=None):
        account_id = self.data["active"] if account_id is None else account_id
        for acc in self.data["accounts"]:
            if str(acc["id"]) == str(account_id):
                return acc
        return None

    def upsert_account(self, acc: dict):
        accounts = [a for a in self.data["accounts"] if str(a["id"]) != str(acc["id"])]
        accounts.append(acc)
        self.data["accounts"] = accounts
        self.save()

    def remove_account(self, account_id):
        self.data["accounts"] = [a for a in self.data["accounts"] if str(a["id"]) != str(account_id)]
        if str(self.data.get("active")) == str(account_id):
            self.data["active"] = self.data["accounts"][0]["id"] if self.data["accounts"] else None
        self.save()
