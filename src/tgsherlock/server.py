"""aiohttp web server: JSON API, Server-Sent Events and the static web panel."""
import asyncio
import csv
import html
import io
import json
import logging
import re
from importlib import resources

from aiohttp import web

from . import __version__
from .analysis import ENTITY_TYPES
from .db import ago_iso
from .tg import UserError, friendly

log = logging.getLogger("tgsherlock.server")
STATIC = resources.files("tgsherlock") / "static"
ALLOWED_HOSTS = ("127.0.0.1", "localhost", "[::1]")


# ---------------------------------------------------------------------------
# middleware
# ---------------------------------------------------------------------------

@web.middleware
async def guard(request, handler):
    raw = request.host or ""
    host = raw.split("]")[0] + "]" if raw.startswith("[") else raw.split(":")[0]
    if request.app["local_only"] and host not in ALLOWED_HOSTS:
        return web.json_response({"error": "Forbidden host"}, status=403)
    if request.path.startswith("/api/") and request.method not in ("GET", "HEAD") \
            and request.headers.get("X-TGS") != "1":
        return web.json_response({"error": "Missing request header"}, status=403)
    try:
        resp = await handler(request)
    except UserError as exc:
        return web.json_response({"error": str(exc)}, status=400)
    except web.HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        log.exception("Request failed: %s", request.path)
        return web.json_response({"error": friendly(exc)}, status=500)
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


def ok(data=None):
    return web.json_response(data if data is not None else {"ok": True}, dumps=lambda o: json.dumps(o, default=str))


async def body(request):
    try:
        return await request.json()
    except Exception:  # noqa: BLE001
        return {}


def tg(request):
    return request.app["tg"]


def need_db(request):
    t = tg(request)
    t.require()
    return t.db


# ---------------------------------------------------------------------------
# core / auth / accounts
# ---------------------------------------------------------------------------

async def index(request):
    return web.FileResponse(STATIC / "index.html", headers={"Cache-Control": "no-cache"})


async def ping(request):
    return ok({"app": "tgsherlock", "version": __version__})


async def status(request):
    return ok(tg(request).status())


async def events(request):
    resp = web.StreamResponse(headers={"Content-Type": "text/event-stream", "Cache-Control": "no-cache",
                                       "X-Accel-Buffering": "no"})
    await resp.prepare(request)
    bus = request.app["bus"]
    q = bus.subscribe()
    try:
        await resp.write(f"data: {json.dumps({'type': 'status', 'data': tg(request).status()}, default=str)}\n\n".encode())
        while True:
            try:
                payload = await asyncio.wait_for(q.get(), timeout=15)
                await resp.write(f"data: {payload}\n\n".encode())
            except asyncio.TimeoutError:
                await resp.write(b": ping\n\n")
    except (ConnectionResetError, asyncio.CancelledError):
        pass
    finally:
        bus.unsubscribe(q)
    return resp


async def auth_state(request):
    return ok(tg(request).auth_state())


async def auth_action(request):
    action = request.match_info["action"]
    data = await body(request)
    t = tg(request)
    if action == "start":
        return ok(await t.auth_start(data.get("api_id"), data.get("api_hash")))
    if action == "qr":
        return ok(await t.auth_qr())
    if action == "phone":
        return ok(await t.auth_phone(data.get("phone")))
    if action == "code":
        return ok(await t.auth_code(data.get("code")))
    if action == "password":
        return ok(await t.auth_password(data.get("password")))
    if action == "cancel":
        await t.auth_cancel()
        return ok(t.auth_state())
    raise web.HTTPNotFound()


async def account_switch(request):
    return ok(await tg(request).switch((await body(request)).get("id")))


async def account_logout(request):
    return ok(await tg(request).logout((await body(request)).get("id")))


# ---------------------------------------------------------------------------
# dashboard / live
# ---------------------------------------------------------------------------

async def dashboard(request):
    need_db(request)
    return ok(tg(request).dashboard())


async def live_get(request):
    t = tg(request)
    db = need_db(request)
    rows = db.messages("source='live'", limit=150)
    return ok({"running": t.live_running, "targets": t.live_targets,
               "messages": [t.public_msg(r) for r in rows]})


async def live_target_add(request):
    t = tg(request)
    need_db(request)
    target = await t.live_add((await body(request)).get("query"))
    return ok({"target": target, "targets": t.live_targets})


async def live_target_remove(request):
    t = tg(request)
    need_db(request)
    t.live_remove(request.match_info["id"])
    return ok({"targets": t.live_targets})


async def live_toggle(request):
    t = tg(request)
    need_db(request)
    t.live_set((await body(request)).get("running"))
    return ok({"running": t.live_running})


# ---------------------------------------------------------------------------
# alerts & rules
# ---------------------------------------------------------------------------

async def alerts_list(request):
    db = need_db(request)
    flt = request.query.get("filter", "all")
    where = {"unread": "read=0", "high": "severity='high'"}.get(flt, "1=1")
    return ok({"alerts": db.alerts(where, limit=300),
               "unread": db.one("SELECT COUNT(*) AS n FROM alerts WHERE read=0")["n"]})


async def alerts_read(request):
    db = need_db(request)
    data = await body(request)
    if data.get("all"):
        db.x("UPDATE alerts SET read=1")
    elif data.get("id"):
        db.x("UPDATE alerts SET read=1 WHERE id=?", (int(data["id"]),))
    tg(request).emit_status()
    return ok()


async def alerts_clear(request):
    db = need_db(request)
    db.x("DELETE FROM alerts WHERE read=1")
    return ok()


async def rules_list(request):
    db = need_db(request)
    return ok({"rules": db.rules()})


async def rule_save(request):
    need_db(request)
    rule_id = await tg(request).rule_save(await body(request))
    return ok({"id": rule_id, "rules": tg(request).db.rules()})


async def rule_delete(request):
    need_db(request)
    tg(request).rule_delete(int(request.match_info["id"]))
    return ok()


async def rule_toggle(request):
    need_db(request)
    tg(request).rule_toggle(int(request.match_info["id"]), (await body(request)).get("enabled"))
    return ok()


# ---------------------------------------------------------------------------
# lookups & jobs
# ---------------------------------------------------------------------------

async def search(request):
    need_db(request)
    return ok({"results": await tg(request).search(request.query.get("q"))})


async def profile(request):
    need_db(request)
    return ok(await tg(request).profile(request.query.get("q")))


async def avatar(request):
    need_db(request)
    peer = request.match_info["id"]
    if not re.fullmatch(r"-?\d+", peer):
        raise web.HTTPNotFound()
    data = await tg(request).avatar(peer, big=request.query.get("big") == "1")
    if not data:
        raise web.HTTPNotFound()
    return web.Response(body=data, content_type="image/jpeg", headers={"Cache-Control": "max-age=3600"})


async def media(request):
    t = tg(request)
    need_db(request)
    name = request.match_info["name"]
    if not re.fullmatch(r"[\w.\-]+", name):
        raise web.HTTPNotFound()
    from .paths import account_dir
    path = account_dir(t.account["id"]) / "media" / name
    if not path.is_file():
        raise web.HTTPNotFound()
    return web.FileResponse(path, headers={"Content-Disposition": f'inline; filename="{name}"',
                                           "X-Content-Type-Options": "nosniff",
                                           "Content-Security-Policy": "sandbox"})


async def jobs_list(request):
    db = need_db(request)
    t = tg(request)
    rows = db.jobs(request.query.get("kind"), limit=15)
    for row in rows:
        live = t.jobs.get(row["id"])
        if live:
            row.update(progress=live["progress"], count=live["count"], info=live["info"])
    return ok({"jobs": rows})


async def job_start(request):
    need_db(request)
    data = await body(request)
    jid = await tg(request).job_start(data.get("kind"), data.get("params") or {})
    return ok({"id": jid})


async def job_get(request):
    db = need_db(request)
    t = tg(request)
    jid = int(request.match_info["id"])
    job = db.job(jid)
    if not job:
        raise web.HTTPNotFound()
    live = t.jobs.get(jid)
    if live:
        job.update(progress=live["progress"], count=live["count"], info=live["info"],
                   wait_until=live.get("wait_until", 0))
    rows = db.messages("job_id=?", (jid,), limit=int(request.query.get("limit", 1000)))
    job["rows"] = rows
    job["senders"] = db.q("SELECT sender_id, MAX(sender_name) AS sender_name, MAX(sender_username) AS sender_username,"
                          " COUNT(*) AS n, MIN(date) AS first, MAX(date) AS last FROM messages WHERE job_id=?"
                          " GROUP BY sender_id ORDER BY n DESC LIMIT 50", (jid,))
    job["per_day"] = db.q("SELECT substr(date, 1, 10) AS day, COUNT(*) AS n, SUM(risk='high') AS high FROM messages"
                          " WHERE job_id=? GROUP BY day ORDER BY day", (jid,))
    job["media_stats"] = db.q("SELECT media, COUNT(*) AS n FROM messages WHERE job_id=? AND media IS NOT NULL"
                              " GROUP BY media ORDER BY n DESC", (jid,))
    if job["kind"] == "history":
        job["members"] = db.members(jid)
    if job["kind"] == "tracker":
        job["groups"] = db.q("SELECT chat_id, MAX(chat_title) AS chat_title, COUNT(*) AS n, MIN(date) AS first,"
                             " MAX(date) AS last FROM messages WHERE job_id=? GROUP BY chat_id ORDER BY last DESC", (jid,))
    return ok(job)


async def chat_join(request):
    need_db(request)
    await tg(request).join_chat((await body(request)).get("target"))
    return ok()


async def context(request):
    need_db(request)
    q = request.query
    try:
        chat_id, msg_id = int(q.get("chat_id")), int(q.get("msg_id"))
        before, after = min(int(q.get("before", 15)), 50), min(int(q.get("after", 5)), 50)
    except (TypeError, ValueError):
        raise UserError("Invalid message reference.")
    return ok(await tg(request).context(chat_id, msg_id, before, after))


async def profile_photo(request):
    need_db(request)
    uid, idx = request.match_info["id"], request.match_info["idx"]
    if not re.fullmatch(r"\d+", uid) or not re.fullmatch(r"\d{1,2}", idx):
        raise web.HTTPNotFound()
    data = await tg(request).profile_photo(uid, idx)
    if not data:
        raise web.HTTPNotFound()
    return web.Response(body=data, content_type="image/jpeg", headers={"Cache-Control": "max-age=3600"})


async def job_cancel(request):
    need_db(request)
    tg(request).job_cancel(int(request.match_info["id"]))
    return ok()


async def job_delete(request):
    db = need_db(request)
    jid = int(request.match_info["id"])
    tg(request).job_cancel(jid)
    db.x("DELETE FROM messages WHERE job_id=?", (jid,))
    db.x("DELETE FROM jobs WHERE id=?", (jid,))
    return ok()


# ---------------------------------------------------------------------------
# entities / archive / export
# ---------------------------------------------------------------------------

async def entities(request):
    db = need_db(request)
    etype = request.query.get("type")
    q = (request.query.get("q") or "").strip()
    where, args = ["1=1"], []
    if etype and etype != "all":
        where.append("type=?")
        args.append(etype)
    if q:
        where.append("value LIKE ?")
        args.append(f"%{q}%")
    rows = db.q(f"SELECT * FROM entities WHERE {' AND '.join(where)} ORDER BY last_seen DESC LIMIT 1000", args)
    for r in rows:
        r["sources"] = json.loads(r["sources"] or "[]")
    counts = {r["type"]: r["n"] for r in db.q("SELECT type, COUNT(*) AS n FROM entities GROUP BY type")}
    return ok({"entities": rows, "counts": counts, "types": ENTITY_TYPES})


def archive_where(query):
    where, args = ["1=1"], []
    q = (query.get("q") or "").strip()
    if q:
        if re.fullmatch(r"-?\d+", q):
            where.append("(sender_id=? OR chat_id=?)")
            args += [int(q), int(q)]
        else:
            where.append("(text LIKE ? OR chat_title LIKE ? OR sender_name LIKE ? OR sender_username LIKE ?)")
            args += [f"%{q}%"] * 4
    if query.get("risk") in ("high", "watch", "clean"):
        where.append("risk=?")
        args.append(query["risk"])
    if query.get("source") in ("live", "alert", "history", "sweep", "tracker", "profile"):
        where.append("source=?")
        args.append(query["source"])
    days = query.get("days")
    if days and str(days).isdigit() and int(days) > 0:
        where.append("date >= ?")
        args.append(ago_iso(days=int(days)))
    return " AND ".join(where), args


async def archive(request):
    db = need_db(request)
    where, args = archive_where(request.query)
    offset = max(0, int(request.query.get("offset", 0) or 0))
    rows = db.messages(where, args, limit=100, offset=offset)
    stats = {
        "messages": db.count(),
        "media": db.count("media_path IS NOT NULL"),
        "jobs": db.one("SELECT COUNT(*) AS n FROM jobs")["n"],
        "size": db.path.stat().st_size if db.path.exists() else 0,
    }
    return ok({"rows": rows, "total": db.count(where, args), "offset": offset, "stats": stats})


EXPORT_COLS = ["date", "chat_title", "chat_type", "chat_id", "chat_username", "sender_name", "sender_username",
               "sender_id", "msg_id", "text", "media", "risk", "source", "views", "forwards", "fwd_from", "link"]


def flatten(rows):
    for r in rows:
        x = r.get("extra") or {}
        if isinstance(x, dict):
            r["views"], r["forwards"], r["fwd_from"] = x.get("views"), x.get("forwards"), x.get("fwd_from")
        cid, user = str(r.get("chat_id") or ""), r.get("chat_username")
        r["link"] = (f"https://t.me/{user}/{r.get('msg_id')}" if user else
                     f"https://t.me/c/{cid[4:]}/{r.get('msg_id')}" if cid.startswith("-100") else "")
    return rows


def render_export(rows, cols, fmt, title):
    if fmt == "json":
        return json.dumps(rows, ensure_ascii=False, indent=2, default=str), "application/json", "json"
    if fmt == "csv":
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        for r in rows:
            writer.writerow({c: r.get(c) for c in cols})
        return "﻿" + buf.getvalue(), "text/csv", "csv"
    head = "".join(f"<th>{html.escape(c.replace('_', ' ').title())}</th>" for c in cols)
    body_rows = "".join("<tr>" + "".join(f"<td>{html.escape(str(r.get(c) if r.get(c) is not None else ''))}</td>"
                                         for c in cols) + "</tr>" for r in rows)
    doc = (f"<!doctype html><html><head><meta charset='utf-8'><title>{html.escape(title)}</title><style>"
           "body{font-family:system-ui,sans-serif;margin:32px;color:#111}h1{font-size:20px}"
           "table{border-collapse:collapse;width:100%;font-size:13px}th,td{border-bottom:1px solid #ddd;"
           "padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f5f7;position:sticky;top:0}"
           "td{max-width:520px;word-wrap:break-word}</style></head><body>"
           f"<h1>{html.escape(title)}</h1><p>{len(rows)} rows · exported by TGSherlock {__version__}</p>"
           f"<table><thead><tr>{head}</tr></thead><tbody>{body_rows}</tbody></table></body></html>")
    return doc, "text/html", "html"


async def export(request):
    db = need_db(request)
    scope = request.query.get("scope", "archive")
    fmt = request.query.get("format", "csv")
    if fmt not in ("csv", "json", "html"):
        fmt = "csv"
    cols, title = EXPORT_COLS, "TGSherlock export"
    if scope == "job":
        jid = int(request.query.get("id", 0))
        job = db.job(jid) or {}
        rows = db.messages("job_id=?", (jid,), limit=100000)
        title = f"TGSherlock · {job.get('kind', 'job')} #{jid}"
    elif scope == "members":
        jid = int(request.query.get("id", 0))
        rows = db.members(jid)
        for r in rows:
            r["flags"] = ", ".join(r["flags"])
        cols = ["chat_title", "user_id", "name", "username", "phone", "role", "joined", "status", "seen_at", "flags"]
        title = f"TGSherlock · members #{jid}"
    elif scope == "live":
        rows = db.messages("source='live'", limit=100000)
        title = "TGSherlock · live monitor"
    elif scope == "alerts":
        rows = db.alerts(limit=100000)
        cols = ["date", "severity", "rule_name", "title", "text", "chat_title", "sender_name", "sender_id", "read"]
        title = "TGSherlock · alerts"
    elif scope == "entities":
        rows = db.q("SELECT value, type, count, first_seen, last_seen, sources FROM entities ORDER BY last_seen DESC")
        cols = ["value", "type", "count", "first_seen", "last_seen", "sources"]
        title = "TGSherlock · entities"
    else:
        where, args = archive_where(request.query)
        rows = db.messages(where, args, limit=100000)
        title = "TGSherlock · archive"
    if cols is EXPORT_COLS:
        rows = flatten(rows)
    text, ctype, ext = render_export(rows, cols, fmt, title)
    name = re.sub(r"[^\w]+", "-", title.lower()).strip("-")
    return web.Response(text=text, content_type=ctype, charset="utf-8",
                        headers={"Content-Disposition": f'attachment; filename="{name}.{ext}"'})


# ---------------------------------------------------------------------------
# settings
# ---------------------------------------------------------------------------

def public_settings(settings):
    smtp = dict(settings["smtp"])
    smtp["has_password"] = bool(smtp.pop("password", ""))
    return {"prefs": settings["prefs"], "risk": settings["risk"], "smtp": smtp, "port": settings["port"]}


async def settings_get(request):
    from .paths import config_dir, data_dir
    s = request.app["settings"]
    data = public_settings(s)
    t = tg(request)
    if t.account:
        data["api_id"] = str(t.account.get("api_id", ""))
    data["paths"] = {"config": str(config_dir()), "data": str(data_dir())}
    data["desktop"] = request.app["desktop_status"]()
    return ok(data)


async def settings_save(request):
    s = request.app["settings"]
    data = await body(request)
    patch = {}
    if isinstance(data.get("prefs"), dict):
        patch["prefs"] = {k: bool(v) for k, v in data["prefs"].items() if k in s["prefs"]}
    if isinstance(data.get("risk"), dict):
        patch["risk"] = {k: [str(w).strip()[:60] for w in v if str(w).strip()][:200]
                         for k, v in data["risk"].items() if k in ("high", "watch") and isinstance(v, list)}
    if isinstance(data.get("smtp"), dict):
        smtp = data["smtp"]
        clean = {k: str(smtp[k]).strip() for k in ("host", "user", "sender", "to") if k in smtp}
        if "port" in smtp:
            try:
                clean["port"] = int(smtp["port"])
            except (TypeError, ValueError):
                raise UserError("SMTP port must be a number.")
        if smtp.get("security") in ("starttls", "ssl", "none"):
            clean["security"] = smtp["security"]
        if smtp.get("password"):
            clean["password"] = str(smtp["password"])
        if smtp.get("clear_password"):
            clean["password"] = ""
        patch["smtp"] = clean
    if "port" in data:
        try:
            port = int(data["port"])
        except (TypeError, ValueError):
            raise UserError("Port must be a number.")
        if not 1024 <= port <= 65535:
            raise UserError("Port must be between 1024 and 65535.")
        patch["port"] = port
    s.update(patch)
    tg(request).emit_status()
    return ok(public_settings(s))


async def smtp_test(request):
    data = await body(request)
    try:
        recipients = await tg(request).notifier.send_test(data.get("to"))
    except Exception as exc:  # noqa: BLE001
        raise UserError(f"Test failed: {exc}")
    return ok({"sent_to": recipients})


async def desktop_install(request):
    from .desktop import install
    install()
    return ok(request.app["desktop_status"]())


async def shutdown(request):
    asyncio.get_running_loop().call_later(0.3, request.app["stop"].set)
    return ok()


# ---------------------------------------------------------------------------

def create_app(settings, tgm, bus, stop_event, desktop_status, local_only=True):
    app = web.Application(middlewares=[guard], client_max_size=2 * 1024 * 1024)
    app["settings"], app["tg"], app["bus"], app["stop"] = settings, tgm, bus, stop_event
    app["desktop_status"], app["local_only"] = desktop_status, local_only
    r = app.router
    r.add_get("/", index)
    r.add_get("/api/ping", ping)
    r.add_get("/api/status", status)
    r.add_get("/api/events", events)
    r.add_get("/api/auth", auth_state)
    r.add_post("/api/auth/{action}", auth_action)
    r.add_post("/api/accounts/switch", account_switch)
    r.add_post("/api/accounts/logout", account_logout)
    r.add_get("/api/dashboard", dashboard)
    r.add_get("/api/live", live_get)
    r.add_post("/api/live/targets", live_target_add)
    r.add_delete("/api/live/targets/{id}", live_target_remove)
    r.add_post("/api/live/toggle", live_toggle)
    r.add_get("/api/alerts", alerts_list)
    r.add_post("/api/alerts/read", alerts_read)
    r.add_post("/api/alerts/clear", alerts_clear)
    r.add_get("/api/rules", rules_list)
    r.add_post("/api/rules", rule_save)
    r.add_delete("/api/rules/{id}", rule_delete)
    r.add_post("/api/rules/{id}/toggle", rule_toggle)
    r.add_get("/api/search", search)
    r.add_get("/api/profile", profile)
    r.add_get("/api/avatar/{id}", avatar)
    r.add_get("/media/{name}", media)
    r.add_get("/api/jobs", jobs_list)
    r.add_post("/api/jobs", job_start)
    r.add_get("/api/jobs/{id}", job_get)
    r.add_post("/api/jobs/{id}/cancel", job_cancel)
    r.add_post("/api/chats/join", chat_join)
    r.add_get("/api/context", context)
    r.add_get("/api/photo/{id}/{idx}", profile_photo)
    r.add_delete("/api/jobs/{id}", job_delete)
    r.add_get("/api/entities", entities)
    r.add_get("/api/archive", archive)
    r.add_get("/api/export", export)
    r.add_get("/api/settings", settings_get)
    r.add_post("/api/settings", settings_save)
    r.add_post("/api/settings/smtp-test", smtp_test)
    r.add_post("/api/desktop/install", desktop_install)
    r.add_post("/api/shutdown", shutdown)
    r.add_static("/static/", str(STATIC), append_version=False)
    return app
