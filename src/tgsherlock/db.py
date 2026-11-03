"""SQLite storage, one database per Telegram account."""
import json
import sqlite3
from datetime import datetime, timedelta, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER, chat_title TEXT, msg_id INTEGER,
    sender_id INTEGER, sender_name TEXT, sender_username TEXT,
    date TEXT, text TEXT, media TEXT, media_path TEXT,
    risk TEXT, source TEXT, job_id INTEGER DEFAULT 0,
    captured_at TEXT,
    UNIQUE(chat_id, msg_id, job_id)
);
CREATE INDEX IF NOT EXISTS ix_msg_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS ix_msg_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS ix_msg_date ON messages(date);
CREATE INDEX IF NOT EXISTS ix_msg_job ON messages(job_id);

CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT, type TEXT, count INTEGER DEFAULT 0,
    first_seen TEXT, last_seen TEXT, sources TEXT DEFAULT '[]',
    UNIQUE(value, type)
);

CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, enabled INTEGER DEFAULT 1,
    watch TEXT, target_id INTEGER, target_label TEXT,
    trigger TEXT, pattern TEXT, severity TEXT,
    notify TEXT DEFAULT '{}', recipients TEXT DEFAULT '', webhook TEXT DEFAULT '',
    throttle_min INTEGER DEFAULT 5, last_fired TEXT, created TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER, rule_name TEXT, severity TEXT,
    title TEXT, text TEXT, chat_id INTEGER, chat_title TEXT,
    sender_id INTEGER, sender_name TEXT, msg_id INTEGER,
    date TEXT, channels TEXT DEFAULT '[]', read INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_alert_date ON alerts(date);

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT, params TEXT, status TEXT, progress TEXT DEFAULT '{}',
    info TEXT DEFAULT '{}', count INTEGER DEFAULT 0,
    created TEXT, finished TEXT, error TEXT
);

CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def to_iso(dt) -> str:
    if dt is None:
        return now_iso()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ago_iso(**kw) -> str:
    return (datetime.now(timezone.utc) - timedelta(**kw)).strftime("%Y-%m-%dT%H:%M:%SZ")


MSG_COLS = ("id", "chat_id", "chat_title", "msg_id", "sender_id", "sender_name", "sender_username",
            "date", "text", "media", "media_path", "risk", "source", "job_id", "captured_at")


class DB:
    def __init__(self, path):
        self.path = path
        self.conn = sqlite3.connect(str(path), check_same_thread=False, timeout=30)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA synchronous=NORMAL")
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    def close(self):
        try:
            self.conn.close()
        except sqlite3.Error:
            pass

    def q(self, sql, args=()):
        return [dict(r) for r in self.conn.execute(sql, args).fetchall()]

    def one(self, sql, args=()):
        row = self.conn.execute(sql, args).fetchone()
        return dict(row) if row else None

    def x(self, sql, args=()):
        cur = self.conn.execute(sql, args)
        self.conn.commit()
        return cur

    # ---- kv ---------------------------------------------------------------
    def kv_get(self, key, default=None):
        row = self.one("SELECT value FROM kv WHERE key=?", (key,))
        if not row:
            return default
        try:
            return json.loads(row["value"])
        except ValueError:
            return default

    def kv_set(self, key, value):
        self.x("INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
               (key, json.dumps(value)))

    # ---- messages -----------------------------------------------------------
    def add_messages(self, rows, source, job_id=0):
        captured = now_iso()
        data = [(r["chat_id"], r["chat_title"], r["msg_id"], r["sender_id"], r["sender_name"],
                 r["sender_username"], r["date"], r["text"], r.get("media"), r.get("media_path"),
                 r.get("risk", "clean"), source, job_id, captured) for r in rows]
        self.conn.executemany(
            "INSERT OR IGNORE INTO messages(chat_id, chat_title, msg_id, sender_id, sender_name, sender_username,"
            " date, text, media, media_path, risk, source, job_id, captured_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            data)
        self.conn.commit()

    def messages(self, where="1=1", args=(), limit=200, offset=0, order="date DESC"):
        return self.q(f"SELECT * FROM messages WHERE {where} ORDER BY {order} LIMIT ? OFFSET ?",
                      tuple(args) + (limit, offset))

    def count(self, where="1=1", args=()):
        return self.one(f"SELECT COUNT(*) AS n FROM messages WHERE {where}", args)["n"]

    # ---- entities -----------------------------------------------------------
    def add_entities(self, found, chat_title):
        if not found:
            return
        ts = now_iso()
        for value, etype in found:
            row = self.one("SELECT id, count, sources FROM entities WHERE value=? AND type=?", (value, etype))
            if row:
                sources = json.loads(row["sources"] or "[]")
                if chat_title and chat_title not in sources:
                    sources = (sources + [chat_title])[-20:]
                self.conn.execute("UPDATE entities SET count=count+1, last_seen=?, sources=? WHERE id=?",
                                  (ts, json.dumps(sources, ensure_ascii=False), row["id"]))
            else:
                self.conn.execute(
                    "INSERT INTO entities(value, type, count, first_seen, last_seen, sources) VALUES (?,?,?,?,?,?)",
                    (value, etype, 1, ts, ts, json.dumps([chat_title] if chat_title else [], ensure_ascii=False)))
        self.conn.commit()

    # ---- rules / alerts -------------------------------------------------------
    def rules(self):
        rows = self.q("SELECT * FROM rules ORDER BY id")
        for r in rows:
            r["notify"] = json.loads(r["notify"] or "{}")
            r["enabled"] = bool(r["enabled"])
        return rows

    def save_rule(self, r):
        fields = ("name", "enabled", "watch", "target_id", "target_label", "trigger", "pattern", "severity",
                  "notify", "recipients", "webhook", "throttle_min")
        vals = [r.get(f) for f in fields]
        vals[1] = 1 if r.get("enabled", True) else 0
        vals[8] = json.dumps(r.get("notify") or {})
        if r.get("id"):
            self.x(f"UPDATE rules SET {', '.join(f + '=?' for f in fields)} WHERE id=?", vals + [r["id"]])
            return int(r["id"])
        cur = self.x(f"INSERT INTO rules({', '.join(fields)}, created) VALUES ({', '.join('?' * len(fields))}, ?)",
                     vals + [now_iso()])
        return cur.lastrowid

    def add_alert(self, a):
        cur = self.x(
            "INSERT INTO alerts(rule_id, rule_name, severity, title, text, chat_id, chat_title, sender_id,"
            " sender_name, msg_id, date, channels) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (a["rule_id"], a["rule_name"], a["severity"], a["title"], a["text"], a["chat_id"], a["chat_title"],
             a["sender_id"], a["sender_name"], a["msg_id"], a["date"], json.dumps(a.get("channels", []))))
        return cur.lastrowid

    def alerts(self, where="1=1", args=(), limit=200):
        rows = self.q(f"SELECT * FROM alerts WHERE {where} ORDER BY id DESC LIMIT ?", tuple(args) + (limit,))
        for r in rows:
            r["channels"] = json.loads(r["channels"] or "[]")
            r["read"] = bool(r["read"])
        return rows

    # ---- jobs -------------------------------------------------------------------
    def job(self, job_id):
        row = self.one("SELECT * FROM jobs WHERE id=?", (job_id,))
        if row:
            for k in ("params", "progress", "info"):
                row[k] = json.loads(row[k] or "{}")
        return row

    def jobs(self, kind=None, limit=20):
        if kind:
            rows = self.q("SELECT * FROM jobs WHERE kind=? ORDER BY id DESC LIMIT ?", (kind, limit))
        else:
            rows = self.q("SELECT * FROM jobs ORDER BY id DESC LIMIT ?", (limit,))
        for row in rows:
            for k in ("params", "progress", "info"):
                row[k] = json.loads(row[k] or "{}")
        return rows
