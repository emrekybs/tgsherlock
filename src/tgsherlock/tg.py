"""Telegram side: accounts and login, live monitor, alert rules and background jobs."""
import asyncio
import base64
import json
import logging
import os
import platform
import re
import secrets
import time
from datetime import datetime, timedelta, timezone

import qrcode
import qrcode.image.svg
from telethon import TelegramClient, errors, events, functions, types, utils

from . import __version__
from . import alerts as A
from .analysis import classify, extract_entities
from .db import DB, ago_iso, now_iso, to_iso
from .paths import account_dir, sessions_dir

log = logging.getLogger("tgsherlock")

INVITE_RX = re.compile(r"(?:https?://)?(?:t\.me|telegram\.me)/(?:\+|joinchat/)([A-Za-z0-9_-]+)")
LINK_PREFIX_RX = re.compile(r"^(?:https?://)?(?:www\.)?(?:t\.me|telegram\.me)/(?:s/)?", re.I)
MAX_LIMIT = 50000
MEDIA_MAX_BYTES = 50 * 1024 * 1024
CONNECT_TIMEOUT = 40


class UserError(Exception):
    """An error whose message is safe and useful to show in the UI."""


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def friendly(exc) -> str:
    if isinstance(exc, UserError):
        return str(exc)
    if isinstance(exc, errors.ApiIdInvalidError):
        return "The API ID / API Hash pair is not valid."
    if isinstance(exc, errors.FloodWaitError):
        return f"Telegram rate limit: try again in {exc.seconds} s."
    if isinstance(exc, (errors.AuthKeyUnregisteredError, errors.SessionRevokedError, errors.UserDeactivatedError)):
        return "This session was revoked. Please sign in again."
    if isinstance(exc, (errors.UsernameNotOccupiedError, errors.UsernameInvalidError)):
        return "No account or chat uses that username."
    if isinstance(exc, (errors.ChannelPrivateError, errors.ChatAdminRequiredError)):
        return "That chat is private or you are not allowed to read it."
    if isinstance(exc, (ConnectionError, OSError, asyncio.TimeoutError)):
        return "Cannot reach Telegram. Check your internet connection."
    if isinstance(exc, ValueError):
        return str(exc) or "Not found."
    return f"{exc.__class__.__name__}: {exc}"


def qr_data_uri(text: str) -> str:
    img = qrcode.make(text, image_factory=qrcode.image.svg.SvgPathFillImage, box_size=10, border=2)
    raw = img.to_string()
    return "data:image/svg+xml;base64," + base64.b64encode(raw).decode()


def display_name(ent) -> str:
    if ent is None:
        return ""
    if isinstance(ent, types.User):
        name = " ".join(x for x in (ent.first_name, ent.last_name) if x).strip()
        if ent.deleted:
            return "Deleted account"
        return name or str(ent.id)
    return getattr(ent, "title", None) or str(getattr(ent, "id", ""))


def chat_kind(ent) -> str:
    if isinstance(ent, types.User):
        return "Bot" if ent.bot else "User"
    if isinstance(ent, types.Channel):
        return "Group" if (ent.megagroup or ent.gigagroup) else "Channel"
    if isinstance(ent, (types.Chat, types.ChatForbidden, types.ChannelForbidden)):
        return "Group"
    return "Chat"


def has_photo(ent) -> bool:
    photo = getattr(ent, "photo", None)
    return bool(photo) and not isinstance(photo, (types.UserProfilePhotoEmpty, types.ChatPhotoEmpty))


def status_info(status):
    if isinstance(status, types.UserStatusOnline):
        return "Online", None
    if isinstance(status, types.UserStatusOffline):
        return "Last seen", to_iso(status.was_online)
    if isinstance(status, types.UserStatusRecently):
        return "Last seen recently", None
    if isinstance(status, types.UserStatusLastWeek):
        return "Last seen within a week", None
    if isinstance(status, types.UserStatusLastMonth):
        return "Last seen within a month", None
    return "Last seen a long time ago", None


def media_kind(msg):
    if not msg.media or isinstance(msg.media, types.MessageMediaWebPage):
        return None
    if msg.photo:
        return "photo"
    if msg.sticker:
        return "sticker"
    if msg.voice:
        return "voice"
    if msg.video_note or msg.video or msg.gif:
        return "video"
    if msg.document:
        return "file"
    if msg.geo:
        return "location"
    if msg.poll:
        return "poll"
    return "media"


def msg_extra(msg):
    """Extra metadata shown in the message detail panel."""
    x = {}
    try:
        if msg.views is not None:
            x["views"] = msg.views
        if msg.forwards:
            x["forwards"] = msg.forwards
        if msg.replies is not None and getattr(msg.replies, "replies", None):
            x["replies"] = msg.replies.replies
        rt = msg.reply_to
        if rt is not None:
            if getattr(rt, "reply_to_msg_id", None):
                x["reply_to"] = rt.reply_to_msg_id
            if getattr(rt, "forum_topic", False):
                x["topic_id"] = getattr(rt, "reply_to_top_id", None) or rt.reply_to_msg_id
        if msg.edit_date:
            x["edited"] = to_iso(msg.edit_date)
        if msg.post_author:
            x["post_author"] = msg.post_author
        if msg.fwd_from:
            f = msg.fwd_from
            name = f.from_name
            if not name:
                try:
                    fwd = msg.forward
                    ent = fwd.chat or fwd.sender if fwd is not None else None
                    name = display_name(ent) if ent else None
                except Exception:  # noqa: BLE001
                    name = None
            if not name and f.from_id:
                name = str(utils.get_peer_id(f.from_id))
            x["fwd_from"] = name or "Hidden sender"
            if f.date:
                x["fwd_date"] = to_iso(f.date)
        if msg.via_bot_id:
            x["via_bot"] = msg.via_bot_id
        if isinstance(msg.media, types.MessageMediaWebPage):
            wp = msg.media.webpage
            if getattr(wp, "url", None):
                x["link_preview"] = {"url": wp.url, "title": getattr(wp, "title", None) or "",
                                     "site": getattr(wp, "site_name", None) or ""}
        elif msg.file:
            if msg.file.name:
                x["file_name"] = msg.file.name
            if msg.file.size:
                x["file_size"] = msg.file.size
            if msg.file.mime_type:
                x["mime"] = msg.file.mime_type
        if msg.grouped_id:
            x["album"] = msg.grouped_id
        if msg.pinned:
            x["pinned"] = True
        if msg.noforwards:
            x["protected"] = True
    except Exception:  # noqa: BLE001
        pass
    return x


def parse_day(value, end=False):
    if not value:
        return None
    try:
        day = datetime.strptime(str(value)[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise UserError(f"Invalid date: {value} (use YYYY-MM-DD).")
    return day + timedelta(days=1) if end else day


def clamp_limit(value, default=500):
    try:
        n = int(value)
    except (TypeError, ValueError):
        n = default
    return max(1, min(n, MAX_LIMIT))


class _FloodHook(logging.Handler):
    """Telethon sleeps automatically on FloodWait; surface that to the UI."""

    def __init__(self, tg):
        super().__init__(logging.INFO)
        self.tg = tg

    def emit(self, record):
        try:
            if "flood wait" in str(record.msg) and len(record.args) >= 2:
                self.tg.on_flood_wait(int(record.args[1]))
        except Exception:  # noqa: BLE001
            pass


# ---------------------------------------------------------------------------
# manager
# ---------------------------------------------------------------------------

class TG:
    def __init__(self, settings, bus):
        self.settings = settings
        self.bus = bus
        self.client = None
        self.me = None
        self.account = None
        self.db = None
        self.authorized = False
        self.connecting = False
        self.error = None
        self.auth = None
        self.notifier = A.Notifier(settings)
        self.jobs = {}
        self.live_running = False
        self.live_targets = []
        self.rules = []
        self.flood_until = 0
        self._dialogs_loaded = False
        self._avatar_sem = asyncio.Semaphore(4)
        hook_logger = logging.getLogger("telethon.client.users")
        hook_logger.setLevel(logging.INFO)
        hook_logger.addHandler(_FloodHook(self))

    # ---- lifecycle --------------------------------------------------------
    def _client(self, session_path, api_id, api_hash, threshold=300):
        return TelegramClient(
            str(session_path), int(api_id), api_hash,
            flood_sleep_threshold=threshold,
            device_model="TGSherlock",
            connection_retries=3, retry_delay=2, timeout=10,
            system_version=f"{platform.system()} {platform.release()}"[:60],
            app_version=__version__,
        )

    async def start(self):
        self.notifier.start()
        acc = self.settings.account()
        if acc:
            await self.activate(acc)

    async def close(self):
        await self.auth_cancel()
        await self._teardown()
        await self.notifier.close()

    async def _teardown(self):
        tasks = [j["task"] for j in self.jobs.values()]
        for t in tasks:
            t.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self.jobs = {}
        if self.client:
            try:
                self.client.remove_event_handler(self._on_message)
                await self.client.disconnect()
            except Exception:  # noqa: BLE001
                pass
        if self.db:
            self.db.close()
        self.client = self.me = self.db = None
        self.authorized = False
        self.live_running = False
        self.live_targets = []
        self.rules = []
        self._dialogs_loaded = False

    async def activate(self, acc) -> bool:
        await self._teardown()
        self.account = acc
        self.connecting, self.error = True, None
        self.emit_status()
        client = None
        try:
            client = self._client(sessions_dir() / acc["session"], acc["api_id"], acc["api_hash"])
            await asyncio.wait_for(client.connect(), CONNECT_TIMEOUT)
            if not await client.is_user_authorized():
                await client.disconnect()
                acc["expired"] = True
                self.settings.upsert_account(acc)
                self.error = "This session has expired. Sign in again or switch account."
                return False
            self.client = client
            self.me = await client.get_me()
            self.db = DB(account_dir(acc["id"]) / "tgsherlock.db")
            self.rules = self.db.rules()
            self.live_targets = self.db.kv_get("live_targets", [])
            self.live_running = bool(self.db.kv_get("live_running", False)) and bool(self.settings["prefs"]["autostart"])
            client.add_event_handler(self._on_message, events.NewMessage())
            acc.update(name=display_name(self.me), username=self.me.username or "", phone=self.me.phone or "",
                       expired=False)
            self.settings.upsert_account(acc)
            self.settings.set("active", acc["id"])
            self.authorized = True
            return True
        except Exception as exc:  # noqa: BLE001
            log.warning("Could not connect: %s", exc)
            self.error = friendly(exc)
            if client and client is not self.client:
                try:
                    await client.disconnect()
                except Exception:  # noqa: BLE001
                    pass
            return False
        finally:
            self.connecting = False
            self.emit_status()

    def require(self):
        if not self.authorized or not self.client:
            raise UserError("Not connected to Telegram.")
        return self.client

    # ---- status ------------------------------------------------------------
    def status(self):
        active = str(self.account["id"]) if self.account else None
        accounts = [{
            "id": str(a["id"]), "name": a.get("name") or str(a["id"]), "username": a.get("username") or "",
            "phone": a.get("phone") or "", "expired": bool(a.get("expired")), "active": str(a["id"]) == active,
        } for a in self.settings["accounts"]]
        unread = 0
        if self.db:
            unread = self.db.one("SELECT COUNT(*) AS n FROM alerts WHERE read=0")["n"]
        me = None
        if self.account:
            me = next((a for a in accounts if a["active"]), None)
        return {
            "version": __version__,
            "authorized": self.authorized,
            "connecting": self.connecting,
            "error": self.error,
            "account": me,
            "accounts": accounts,
            "live": {"running": self.live_running, "targets": len(self.live_targets)},
            "unread": unread,
            "prefs": self.settings["prefs"],
            "flood_until": self.flood_until,
        }

    def emit_status(self):
        self.bus.emit("status", self.status())

    def on_flood_wait(self, seconds):
        self.flood_until = time.time() + seconds
        for jid, job in self.jobs.items():
            job["wait_until"] = self.flood_until
            self._emit_job(jid)
        self.bus.emit("flood", {"seconds": seconds, "until": self.flood_until})

    # ---- login flow ----------------------------------------------------------
    def auth_state(self):
        a = self.auth
        if a and a.get("state") == "done" and not self.authorized and not self.connecting:
            self.auth = a = None
        if not a:
            return {"state": "idle", "last_api": self.settings["last_api"]}
        return {k: a.get(k) for k in ("state", "qr", "expires", "error", "hint", "phone")}

    async def auth_start(self, api_id, api_hash):
        api_id, api_hash = str(api_id or "").strip(), str(api_hash or "").strip()
        if not api_id.isdigit():
            raise UserError("API ID must be a number.")
        if not re.fullmatch(r"[0-9a-fA-F]{32}", api_hash):
            raise UserError("API Hash must be 32 hexadecimal characters.")
        await self.auth_cancel()
        name = "pending-" + secrets.token_hex(4)
        client = self._client(sessions_dir() / name, api_id, api_hash, threshold=60)
        try:
            await asyncio.wait_for(client.connect(), CONNECT_TIMEOUT)
        except Exception as exc:  # noqa: BLE001
            try:
                await client.disconnect()
            except Exception:  # noqa: BLE001
                pass
            for suffix in (".session", ".session-journal"):
                try:
                    (sessions_dir() / f"{name}{suffix}").unlink()
                except OSError:
                    pass
            raise UserError(friendly(exc)) from exc
        self.auth = {"client": client, "name": name, "api_id": api_id, "api_hash": api_hash,
                     "state": "qr", "qr": None, "expires": None, "error": None, "hint": None,
                     "phone": None, "phone_hash": None, "task": None}
        self.settings.set("last_api", {"api_id": api_id, "api_hash": api_hash})
        self.auth["task"] = asyncio.ensure_future(self._qr_loop(self.auth))
        return self.auth_state()

    async def _qr_loop(self, a):
        client = a["client"]
        try:
            qr = await client.qr_login()
            while a is self.auth:
                a.update(state="qr", qr=qr_data_uri(qr.url), expires=to_iso(qr.expires), error=None)
                remaining = (qr.expires - datetime.now(timezone.utc)).total_seconds()
                try:
                    await qr.wait(timeout=max(10.0, remaining))
                    break
                except asyncio.TimeoutError:
                    await qr.recreate()
            if a is self.auth:
                await self._auth_finish(a)
        except errors.SessionPasswordNeededError:
            await self._need_password(a)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.warning("QR login failed: %s", exc)
            a.update(state="error", error=friendly(exc))

    async def _need_password(self, a):
        hint = None
        try:
            pwd = await a["client"](functions.account.GetPasswordRequest())
            hint = pwd.hint
        except Exception:  # noqa: BLE001
            pass
        a.update(state="password", hint=hint, error=None)

    def _pending(self):
        if not self.auth or "client" not in self.auth:
            raise UserError("Start by entering your API ID and API Hash.")
        return self.auth

    async def auth_qr(self):
        a = self._pending()
        if a.get("task") and not a["task"].done():
            return self.auth_state()
        a["task"] = asyncio.ensure_future(self._qr_loop(a))
        a.update(state="qr", qr=None, error=None)
        return self.auth_state()

    async def auth_phone(self, phone):
        a = self._pending()
        phone = re.sub(r"[^\d+]", "", phone or "")
        if len(phone) < 8:
            raise UserError("Enter the phone number with country code, e.g. +905551112233.")
        if a.get("task"):
            a["task"].cancel()
        try:
            sent = await a["client"].send_code_request(phone)
        except errors.PhoneNumberInvalidError:
            raise UserError("That phone number is not valid.")
        except Exception as exc:  # noqa: BLE001
            raise UserError(friendly(exc)) from exc
        a.update(state="code", phone=phone, phone_hash=sent.phone_code_hash, error=None)
        return self.auth_state()

    async def auth_code(self, code):
        a = self._pending()
        code = re.sub(r"\D", "", code or "")
        try:
            await a["client"].sign_in(phone=a["phone"], code=code, phone_code_hash=a["phone_hash"])
        except errors.SessionPasswordNeededError:
            await self._need_password(a)
            return self.auth_state()
        except errors.PhoneCodeInvalidError:
            raise UserError("That code is not correct.")
        except errors.PhoneCodeExpiredError:
            a.update(state="phone")
            raise UserError("The code expired. Request a new one.")
        except Exception as exc:  # noqa: BLE001
            raise UserError(friendly(exc)) from exc
        await self._auth_finish(a)
        return self.auth_state()

    async def auth_password(self, password):
        a = self._pending()
        try:
            await a["client"].sign_in(password=password or "")
        except errors.PasswordHashInvalidError:
            raise UserError("Wrong password.")
        except Exception as exc:  # noqa: BLE001
            raise UserError(friendly(exc)) from exc
        await self._auth_finish(a)
        return self.auth_state()

    async def _auth_finish(self, a):
        client = a["client"]
        me = await client.get_me()
        await client.disconnect()
        if self.account and str(self.account["id"]) == str(me.id):
            await self._teardown()
        src = sessions_dir() / f"{a['name']}.session"
        dst = sessions_dir() / f"{me.id}.session"
        os.replace(src, dst)
        try:
            dst.chmod(0o600)
        except OSError:
            pass
        acc = {"id": me.id, "name": display_name(me), "username": me.username or "", "phone": me.phone or "",
               "api_id": a["api_id"], "api_hash": a["api_hash"], "session": str(me.id), "expired": False}
        self.settings.upsert_account(acc)
        self.auth = {"state": "done"}
        await self.activate(acc)

    async def auth_cancel(self):
        a, self.auth = self.auth, None
        if not a or "client" not in a:
            return
        if a.get("task"):
            a["task"].cancel()
        try:
            await a["client"].disconnect()
        except Exception:  # noqa: BLE001
            pass
        for suffix in (".session", ".session-journal"):
            try:
                (sessions_dir() / f"{a['name']}{suffix}").unlink()
            except OSError:
                pass

    # ---- accounts ------------------------------------------------------------
    async def switch(self, account_id):
        acc = self.settings.account(account_id)
        if not acc:
            raise UserError("Unknown account.")
        if not await self.activate(acc):
            raise UserError(self.error or "Could not connect.")
        return self.status()

    async def logout(self, account_id):
        acc = self.settings.account(account_id)
        if not acc:
            raise UserError("Unknown account.")
        if self.auth and "client" not in self.auth:
            self.auth = None
        was_active = self.account and str(self.account["id"]) == str(acc["id"])
        if was_active and self.client:
            try:
                await self.client.log_out()
            except Exception:  # noqa: BLE001
                pass
            self.client = None
            await self._teardown()
            self.account = None
        else:
            other = self._client(sessions_dir() / acc["session"], acc["api_id"], acc["api_hash"], threshold=0)
            try:
                await asyncio.wait_for(other.connect(), CONNECT_TIMEOUT)
                if await other.is_user_authorized():
                    await other.log_out()
                else:
                    await other.disconnect()
            except Exception:  # noqa: BLE001
                pass
        for suffix in (".session", ".session-journal"):
            try:
                (sessions_dir() / f"{acc['session']}{suffix}").unlink()
            except OSError:
                pass
        self.settings.remove_account(acc["id"])
        if was_active:
            self.authorized = False
            nxt = self.settings.account()
            if nxt:
                await self.activate(nxt)
        self.emit_status()
        return self.status()

    # ---- entities ----------------------------------------------------------------
    async def resolve(self, query):
        client = self.require()
        q = (query or "").strip()
        if not q:
            raise UserError("Enter a @username, ID or t.me link.")
        m = INVITE_RX.search(q)
        if m:
            inv = await client(functions.messages.CheckChatInviteRequest(m.group(1)))
            if isinstance(inv, (types.ChatInviteAlready, types.ChatInvitePeek)):
                return inv.chat
            raise UserError(f"“{inv.title}” is behind an invite link. Join it in Telegram first.")
        q = LINK_PREFIX_RX.sub("", q).split("/")[0].split("?")[0].strip()
        if re.fullmatch(r"-?\d+", q):
            num = int(q)
            candidates = [num] if num < 0 else [num, types.PeerChannel(num), types.PeerChat(num)]
            for attempt in range(2):
                for cand in candidates:
                    try:
                        return await client.get_entity(cand)
                    except (ValueError, TypeError):
                        continue
                    except (errors.ChannelPrivateError, errors.ChannelInvalidError, errors.PeerIdInvalidError):
                        continue
                if attempt == 0 and not self._dialogs_loaded:
                    await client.get_dialogs()
                    self._dialogs_loaded = True
                else:
                    break
            raise UserError("Unknown ID. Telegram only resolves IDs this account has already seen — "
                            "try the @username or open a shared group first.")
        username = q.lstrip("@")
        if not re.fullmatch(r"[A-Za-z0-9_]{3,32}", username):
            raise UserError("That does not look like a username, ID or t.me link.")
        try:
            return await client.get_entity(username)
        except (errors.UsernameNotOccupiedError, errors.UsernameInvalidError, ValueError):
            raise UserError(f"No account or chat uses @{username}.")

    def target_from(self, ent):
        label = f"@{ent.username}" if getattr(ent, "username", None) else display_name(ent)
        warning = None
        if isinstance(ent, types.Channel) and getattr(ent, "left", False):
            warning = "Not a member — Telegram only pushes messages from chats you have joined."
        return {"id": utils.get_peer_id(ent), "label": label, "name": display_name(ent), "kind": chat_kind(ent),
                "warning": warning}

    async def avatar(self, peer_id, big=False):
        """Return JPEG bytes of a profile photo (cached on disk for a day)."""
        client = self.require()
        folder = account_dir(self.account["id"]) / "avatars"
        folder.mkdir(exist_ok=True)
        path = folder / f"{peer_id}{'_big' if big else ''}.jpg"
        if path.exists() and time.time() - path.stat().st_mtime < 86400:
            return path.read_bytes() or None
        async with self._avatar_sem:
            try:
                ent = await client.get_entity(int(peer_id))
                data = await client.download_profile_photo(ent, file=bytes, download_big=big)
            except Exception:  # noqa: BLE001
                data = None
        path.write_bytes(data or b"")
        return data

    # ---- message records -------------------------------------------------------------
    def record(self, msg, chat, sender):
        text = msg.message or ""
        risk, _ = classify(text, self.settings["risk"])
        if chat is not None:
            chat_id = utils.get_peer_id(chat)
            title = display_name(chat)
            if isinstance(chat, types.User):
                title = f"DM · {title}"
        else:
            chat_id, title = msg.chat_id, ""
        return {
            "chat_id": chat_id, "chat_title": title, "msg_id": msg.id,
            "sender_id": msg.sender_id, "sender_name": display_name(sender),
            "sender_username": getattr(sender, "username", None) or "",
            "date": to_iso(msg.date), "text": text, "media": media_kind(msg), "risk": risk,
            "chat_type": chat_kind(chat) if chat is not None else "",
            "chat_username": (getattr(chat, "username", None) or "") if chat is not None else "",
            "extra": msg_extra(msg),
        }

    async def _download(self, msg, rec):
        try:
            if msg.file and msg.file.size and msg.file.size > MEDIA_MAX_BYTES:
                return None
            folder = account_dir(self.account["id"]) / "media"
            path = await self.client.download_media(msg, file=str(folder / f"{abs(rec['chat_id'])}_{rec['msg_id']}"))
            return os.path.basename(path) if path else None
        except Exception as exc:  # noqa: BLE001
            log.warning("Media download failed: %s", exc)
            return None

    def public_msg(self, rec, ents=None):
        out = dict(rec)
        out["media_url"] = f"/media/{rec['media_path']}" if rec.get("media_path") else None
        out["entities"] = [v for v, _ in (ents if ents is not None else extract_entities(rec.get("text") or ""))][:6]
        return out

    async def _on_message(self, event):
        try:
            if self.db is None:
                return
            sender_id, chat_id = event.sender_id, event.chat_id
            ids = {t["id"] for t in self.live_targets}
            live = self.live_running and (sender_id in ids or chat_id in ids)
            candidates = [r for r in self.rules if A.rule_watches(r, sender_id, chat_id)]
            if not live and not candidates:
                return
            msg = event.message
            chat = await event.get_chat()
            sender = await event.get_sender()
            rec = self.record(msg, chat, sender)
            ents = extract_entities(rec["text"])
            matched = [r for r in candidates if A.rule_matches(r, rec, ents)]
            if not live and not matched:
                return
            if live and rec["media"] and self.settings["prefs"]["media"]:
                rec["media_path"] = await self._download(msg, rec)
            self.db.add_messages([rec], "live" if live else "alert")
            self.db.add_entities(ents, rec["chat_title"])
            if live:
                self.bus.emit("message", self.public_msg(rec, ents))
            for rule in matched:
                await self._fire(rule, rec)
        except Exception:  # noqa: BLE001
            log.exception("Failed to process an incoming message")

    async def _fire(self, rule, rec):
        notify = rule.get("notify") or {}
        alert = {
            "rule_id": rule["id"], "rule_name": rule["name"], "severity": rule["severity"],
            "title": A.describe(rec, rule), "text": (rec["text"] or f"[{rec['media'] or 'media'}]")[:1500],
            "chat_id": rec["chat_id"], "chat_title": rec["chat_title"], "sender_id": rec["sender_id"],
            "sender_name": rec["sender_name"], "msg_id": rec["msg_id"], "date": rec["date"],
            "channels": ["In-app"] + (["Desktop"] if notify.get("desktop") else []),
        }
        alert["id"] = self.db.add_alert(alert)
        alert["read"] = False
        fired = now_iso()
        self.db.x("UPDATE rules SET last_fired=? WHERE id=?", (fired, rule["id"]))
        rule["last_fired"] = fired
        self.bus.emit("alert", dict(alert, desktop=bool(notify.get("desktop"))))
        self.emit_status()
        db, aid = self.db, alert["id"]

        def on_status(label):
            if self.db is not db:
                return
            row = db.one("SELECT channels FROM alerts WHERE id=?", (aid,))
            if row:
                chans = [c for c in json.loads(row["channels"] or "[]") if not c.startswith(label.split(" ")[0])]
                chans.append(label)
                db.x("UPDATE alerts SET channels=? WHERE id=?", (json.dumps(chans), aid))
                self.bus.emit("alert_update", {"id": aid, "channels": chans})

        asyncio.ensure_future(self.notifier.deliver(rule, alert, on_status))

    # ---- live monitor ------------------------------------------------------------------
    async def live_add(self, query):
        ent = await self.resolve(query)
        target = self.target_from(ent)
        if all(t["id"] != target["id"] for t in self.live_targets):
            self.live_targets.append(target)
            self.db.kv_set("live_targets", self.live_targets)
        self.emit_status()
        return target

    def live_remove(self, peer_id):
        self.live_targets = [t for t in self.live_targets if str(t["id"]) != str(peer_id)]
        self.db.kv_set("live_targets", self.live_targets)
        self.emit_status()

    def live_set(self, running):
        self.require()
        if running and not self.live_targets:
            raise UserError("Add at least one target first.")
        self.live_running = bool(running)
        self.db.kv_set("live_running", self.live_running)
        self.emit_status()

    # ---- rules ----------------------------------------------------------------------------
    async def rule_save(self, data):
        self.require()
        rule = {
            "id": data.get("id"), "name": (data.get("name") or "").strip()[:80] or "Untitled rule",
            "enabled": data.get("enabled", True), "watch": data.get("watch"),
            "target_id": data.get("target_id"), "target_label": data.get("target_label"),
            "trigger": data.get("trigger"), "pattern": (data.get("pattern") or "").strip(),
            "severity": data.get("severity") if data.get("severity") in ("high", "medium", "low") else "medium",
            "notify": {k: bool((data.get("notify") or {}).get(k)) for k in ("desktop", "email", "webhook")},
            "recipients": (data.get("recipients") or "").strip(), "webhook": (data.get("webhook") or "").strip(),
            "throttle_min": max(0, min(int(data.get("throttle_min") or 0), 1440)),
        }
        if rule["watch"] == "anywhere":
            rule["target_id"], rule["target_label"] = None, "All chats"
        elif (data.get("target") or "").strip():
            ent = await self.resolve(data["target"])
            if rule["watch"] == "user" and not isinstance(ent, types.User):
                raise UserError("That is a group or channel — choose “Group / channel” instead.")
            if rule["watch"] == "chat" and isinstance(ent, types.User):
                raise UserError("That is a user — choose “User” instead.")
            t = self.target_from(ent)
            rule["target_id"], rule["target_label"] = t["id"], t["label"]
        if rule["notify"]["webhook"] and not rule["webhook"].startswith(("http://", "https://")):
            raise UserError("Enter a webhook URL starting with https://")
        err = A.validate_rule(rule)
        if err:
            raise UserError(err)
        rule_id = self.db.save_rule(rule)
        self.rules = self.db.rules()
        return rule_id

    def rule_delete(self, rule_id):
        self.db.x("DELETE FROM rules WHERE id=?", (rule_id,))
        self.rules = self.db.rules()

    def rule_toggle(self, rule_id, enabled):
        self.db.x("UPDATE rules SET enabled=? WHERE id=?", (1 if enabled else 0, rule_id))
        self.rules = self.db.rules()

    # ---- lookups ------------------------------------------------------------------------------
    async def search(self, query):
        client = self.require()
        q = (query or "").strip()
        if len(q) < 2:
            raise UserError("Type at least 2 characters.")
        res = await client(functions.contacts.SearchRequest(q=q, limit=50))
        out = []
        self.db.observe([(u.id, display_name(u), u.username) for u in res.users if not u.deleted], "search")
        for u in res.users:
            flags = [n for n, v in (("Premium", u.premium), ("Verified", u.verified),
                                    ("Scam", u.scam), ("Fake", u.fake)) if v]
            out.append({"id": u.id, "kind": chat_kind(u), "name": display_name(u), "username": u.username or "",
                        "members": None, "flags": flags, "photo": has_photo(u)})
        for c in res.chats:
            flags = [n for n, v in (("Verified", getattr(c, "verified", False)), ("Scam", getattr(c, "scam", False)),
                                    ("Fake", getattr(c, "fake", False))) if v]
            if getattr(c, "left", False):
                flags.append("Not joined")
            out.append({"id": utils.get_peer_id(c), "kind": chat_kind(c), "name": display_name(c),
                        "username": getattr(c, "username", None) or "",
                        "members": getattr(c, "participants_count", None), "flags": flags, "photo": has_photo(c)})
        return out

    async def chat_info(self, ent):
        client = self.require()
        info = {"id": utils.get_peer_id(ent), "title": display_name(ent), "kind": chat_kind(ent),
                "username": getattr(ent, "username", None) or "", "members": getattr(ent, "participants_count", None),
                "about": "", "date": to_iso(ent.date) if getattr(ent, "date", None) else None,
                "photo": has_photo(ent), "joined": not getattr(ent, "left", False)}
        try:
            if isinstance(ent, types.Channel):
                full = await client(functions.channels.GetFullChannelRequest(ent))
                fc = full.full_chat
                info["members"] = fc.participants_count
                info["about"] = fc.about or ""
                info["online"] = getattr(fc, "online_count", None)
                info["admins"] = getattr(fc, "admins_count", None)
                info["banned"] = getattr(fc, "kicked_count", None)
                info["slowmode"] = getattr(fc, "slowmode_seconds", None)
                info["pinned"] = getattr(fc, "pinned_msg_id", None)
                info["hidden_members"] = bool(getattr(fc, "participants_hidden", False))
                linked = getattr(fc, "linked_chat_id", None)
                if linked:
                    lc = next((c for c in full.chats if c.id == linked), None)
                    if lc is not None:
                        info["linked"] = {"id": utils.get_peer_id(lc), "title": display_name(lc),
                                          "username": getattr(lc, "username", None) or "", "kind": chat_kind(lc)}
            elif isinstance(ent, types.Chat):
                full = await client(functions.messages.GetFullChatRequest(ent.id))
                parts = getattr(full.full_chat.participants, "participants", None)
                info["members"] = len(parts) if parts is not None else ent.participants_count
                info["about"] = full.full_chat.about or ""
        except Exception:  # noqa: BLE001
            pass
        info["flags"] = [n for n, v in (
            ("Verified", getattr(ent, "verified", False)), ("Scam", getattr(ent, "scam", False)),
            ("Fake", getattr(ent, "fake", False)), ("Forum", getattr(ent, "forum", False)),
            ("Restricted", getattr(ent, "restricted", False)), ("Protected content", getattr(ent, "noforwards", False)),
            ("Join request", getattr(ent, "join_request", False)), ("Hidden members", info.get("hidden_members")),
        ) if v]
        info["restrictions"] = [f"{r.platform}: {r.reason} — {r.text}" for r in (getattr(ent, "restriction_reason", None) or [])]
        try:
            info["total_messages"] = (await client.get_messages(ent, limit=0)).total
        except Exception:  # noqa: BLE001
            pass
        return info

    async def join_chat(self, target):
        client = self.require()
        m = INVITE_RX.search(target or "")
        try:
            if m:
                await client(functions.messages.ImportChatInviteRequest(m.group(1)))
            else:
                ent = await self.resolve(target)
                if not isinstance(ent, types.Channel):
                    raise UserError("Only groups and channels can be joined.")
                await client(functions.channels.JoinChannelRequest(ent))
        except errors.UserAlreadyParticipantError:
            pass
        except UserError:
            raise
        except Exception as exc:  # noqa: BLE001
            if "InviteRequestSent" in type(exc).__name__:
                raise UserError("Join request sent — an admin of the chat has to approve it.")
            raise UserError(friendly(exc)) from exc
        self._dialogs_loaded = False
        return True

    async def context(self, chat_id, msg_id, before=15, after=5):
        """Messages around msg_id in a chat, oldest first."""
        client = self.require()
        try:
            ent = await client.get_entity(int(chat_id))
        except Exception as exc:  # noqa: BLE001
            raise UserError("This chat is not reachable from the current account.") from exc
        older = await client.get_messages(ent, limit=max(0, before), offset_id=int(msg_id)) if before else []
        newer = await client.get_messages(ent, limit=max(0, after) + 1, offset_id=int(msg_id) - 1, reverse=True) if after >= 0 else []
        msgs = [m for m in list(reversed(list(older))) + list(newer) if m is not None and not isinstance(m, types.MessageService)]
        out = []
        for m in msgs:
            rec = self.public_msg(self.record(m, ent, m.sender))
            rec["focus"] = m.id == int(msg_id)
            out.append(rec)
        return {"chat": {"id": utils.get_peer_id(ent), "title": display_name(ent), "username": getattr(ent, "username", None) or "",
                         "kind": chat_kind(ent)},
                "messages": out, "has_more": len(older) >= before > 0}

    async def profile_photo(self, user_id, index):
        client = self.require()
        folder = account_dir(self.account["id"]) / "avatars"
        folder.mkdir(exist_ok=True)
        path = folder / f"{user_id}_p{index}.jpg"
        if path.exists() and time.time() - path.stat().st_mtime < 86400:
            return path.read_bytes() or None
        data = None
        async with self._avatar_sem:
            try:
                ent = await client.get_entity(int(user_id))
                photos = await client.get_profile_photos(ent, limit=int(index) + 1)
                if len(photos) > int(index):
                    data = await client.download_media(photos[int(index)], file=bytes)
            except Exception:  # noqa: BLE001
                data = None
        path.write_bytes(data or b"")
        return data

    async def profile(self, query):
        client = self.require()
        ent = await self.resolve(query)
        if not isinstance(ent, types.User):
            return {"redirect": "history", "query": query}
        full = await client(functions.users.GetFullUserRequest(ent))
        fu = full.full_user
        status, seen_at = status_info(ent.status)
        usernames = [f"@{u.username}" for u in (ent.usernames or []) if u.username]
        if ent.username and f"@{ent.username}" not in usernames:
            usernames.insert(0, f"@{ent.username}")
        common, common_ents = [], []
        try:
            res = await client(functions.messages.GetCommonChatsRequest(user_id=ent, max_id=0, limit=100))
            common_ents = list(res.chats)
            for c in res.chats:
                common.append({"id": utils.get_peer_id(c), "title": display_name(c), "kind": chat_kind(c),
                               "username": getattr(c, "username", None) or "",
                               "members": getattr(c, "participants_count", None)})
        except Exception:  # noqa: BLE001
            pass
        photos, photo_list = 0, []
        try:
            ph = await client.get_profile_photos(ent, limit=12)
            photos = ph.total
            photo_list = [{"index": i, "date": to_iso(x.date), "video": bool(getattr(x, "video_sizes", None))}
                          for i, x in enumerate(ph)]
        except Exception:  # noqa: BLE001
            pass
        recs = []
        for chat in common_ents[:20]:
            try:
                async for m in client.iter_messages(chat, from_user=ent, limit=30):
                    if not isinstance(m, types.MessageService):
                        recs.append(self.record(m, chat, ent))
            except Exception:  # noqa: BLE001
                continue
        if recs:
            self.db.add_messages(recs, "profile")
            for rec in recs:
                self.db.add_entities(extract_entities(rec["text"]), rec["chat_title"])
        extra = {}
        bot_info = getattr(fu, "bot_info", None)
        if ent.bot and bot_info is not None:
            extra["bot_description"] = getattr(bot_info, "description", "") or ""
            extra["bot_commands"] = [{"command": c.command, "description": c.description}
                                     for c in (getattr(bot_info, "commands", None) or [])]
            if getattr(ent, "bot_active_users", None):
                extra["bot_users"] = ent.bot_active_users
        pc_id = getattr(fu, "personal_channel_id", None)
        if pc_id:
            pc = next((c for c in full.chats if c.id == pc_id), None)
            if pc is not None:
                extra["personal_channel"] = {"id": utils.get_peer_id(pc), "title": display_name(pc),
                                             "username": getattr(pc, "username", None) or ""}
        bday = getattr(fu, "birthday", None)
        if bday is not None:
            extra["birthday"] = (f"{bday.year}-{bday.month:02d}-{bday.day:02d}" if getattr(bday, "year", None)
                                 else f"{bday.day:02d}.{bday.month:02d}")
        extra["restrictions"] = [f"{r.platform}: {r.reason} — {r.text}" for r in (ent.restriction_reason or [])]
        if getattr(ent, "lang_code", None):
            extra["lang"] = ent.lang_code
        if getattr(fu, "private_forward_name", None):
            extra["forward_name"] = fu.private_forward_name
        biz = getattr(fu, "business_location", None)
        if biz is not None and getattr(biz, "address", None):
            extra["business_address"] = biz.address
        extra["mutual_contact"] = bool(getattr(ent, "mutual_contact", False))
        extra["blocked"] = bool(getattr(fu, "blocked", False))
        db = self.db
        db.observe([(ent.id, display_name(ent), u.lstrip("@")) for u in (usernames or [""])], "profile")
        history = db.q("SELECT name, username, MIN(first_seen) AS first_seen, MAX(last_seen) AS last_seen,"
                       " GROUP_CONCAT(DISTINCT source) AS sources FROM identities WHERE user_id=?"
                       " GROUP BY name, username ORDER BY first_seen", (ent.id,))
        listed = db.q("SELECT m.chat_id, MAX(m.chat_title) AS chat_title, MAX(m.role) AS role, MIN(m.joined) AS joined,"
                      " MAX(j.created) AS checked FROM members m LEFT JOIN jobs j ON j.id = m.job_id WHERE m.user_id=?"
                      " GROUP BY m.chat_id", (ent.id,))
        local = db.q(
            "SELECT chat_id, MAX(chat_title) AS chat_title, COUNT(DISTINCT msg_id) AS n, MIN(date) AS first,"
            " MAX(date) AS last FROM messages WHERE sender_id=? GROUP BY chat_id", (ent.id,))
        seen = {}
        for c in common:
            seen[c["id"]] = {"id": c["id"], "title": c["title"], "kind": c["kind"], "username": c["username"],
                             "members": c["members"], "member": True, "posts": 0, "first": None, "last": None}
        for row in listed:
            item = seen.setdefault(row["chat_id"], {"id": row["chat_id"], "title": row["chat_title"], "kind": "Group",
                                                    "username": "", "members": None, "member": False, "posts": 0,
                                                    "first": None, "last": None})
            item.update(listed=True, role=row["role"], joined=row["joined"], checked=row["checked"])
        for row in local:
            item = seen.setdefault(row["chat_id"], {"id": row["chat_id"], "title": row["chat_title"], "kind": "",
                                                    "username": "", "members": None, "member": False})
            item.update(posts=row["n"], first=row["first"], last=row["last"])
        seen_list = sorted(seen.values(), key=lambda s: (s["last"] or "", s["posts"]), reverse=True)
        hours = [0] * 24
        for row in db.q("SELECT CAST(strftime('%H', date) AS INTEGER) AS h, COUNT(*) AS n FROM"
                        " (SELECT DISTINCT chat_id, msg_id, date FROM messages WHERE sender_id=?) GROUP BY h", (ent.id,)):
            if row["h"] is not None:
                hours[row["h"]] = row["n"]
        recent = db.q("SELECT chat_id, chat_title, msg_id, date, text, media FROM messages WHERE sender_id=?"
                      " GROUP BY chat_id, msg_id ORDER BY date DESC LIMIT 200", (ent.id,))
        totals = db.one("SELECT COUNT(*) AS n, MIN(date) AS first, MAX(date) AS last FROM"
                        " (SELECT DISTINCT chat_id, msg_id, date FROM messages WHERE sender_id=?)", (ent.id,))
        return {
            "id": ent.id, "name": display_name(ent), "first_name": ent.first_name or "",
            "last_name": ent.last_name or "", "usernames": usernames, "phone": ent.phone or "",
            "bio": fu.about or "", "status": status, "seen_at": seen_at, "photo": has_photo(ent), "photos": photos,
            "dc": getattr(getattr(ent, "photo", None), "dc_id", None),
            "flags": {"bot": bool(ent.bot), "premium": bool(ent.premium), "verified": bool(ent.verified),
                      "scam": bool(ent.scam), "fake": bool(ent.fake), "restricted": bool(ent.restricted),
                      "contact": bool(ent.contact)},
            "common_count": fu.common_chats_count, "seen_in": seen_list, "hours_utc": hours,
            "recent": recent, "totals": totals, "photo_list": photo_list, "extra": extra, "scanned": len(recs),
            "identity_history": history,
            "watched": any(str(t["id"]) == str(ent.id) for t in self.live_targets),
        }

    # ---- background jobs ------------------------------------------------------------------------
    def _emit_job(self, jid):
        job = self.jobs.get(jid)
        if not job:
            return
        self.bus.emit("job", {"id": jid, "kind": job["kind"], "status": "running", "progress": job["progress"],
                              "count": job["count"], "info": job["info"], "wait_until": job.get("wait_until", 0)})

    def _progress(self, jid, force=False, **kw):
        job = self.jobs[jid]
        job["progress"].update(kw)
        if force or time.monotonic() - job.get("emitted", 0) > 0.3:
            job["emitted"] = time.monotonic()
            self._emit_job(jid)

    def _store(self, jid, recs):
        if not recs:
            return
        job = self.jobs[jid]
        self.db.add_messages(recs, job["kind"], jid)
        for rec in recs:
            self.db.add_entities(extract_entities(rec["text"]), rec["chat_title"])
        job["count"] += len(recs)

    async def job_start(self, kind, params):
        self.require()
        runners = {"history": self._job_history, "sweep": self._job_sweep, "tracker": self._job_tracker}
        if kind not in runners:
            raise UserError("Unknown job type.")
        if kind == "sweep":
            terms = [t.strip() for t in params.get("keywords") or [] if t.strip()]
            if not terms:
                raise UserError("Add at least one keyword.")
            if params.get("mode") == "regex":
                try:
                    re.compile("|".join(f"(?:{t})" for t in terms))
                except re.error as exc:
                    raise UserError(f"Invalid regex: {exc}")
        elif not (params.get("target") or "").strip():
            raise UserError("Enter a target first.")
        parse_day(params.get("from"))
        parse_day(params.get("to"))
        cur = self.db.x("INSERT INTO jobs(kind, params, status, created) VALUES (?,?,?,?)",
                        (kind, json.dumps(params, ensure_ascii=False), "running", now_iso()))
        jid = cur.lastrowid
        self.jobs[jid] = {"kind": kind, "progress": {"done": 0, "total": 0, "label": "Starting…"}, "count": 0,
                          "info": {}, "task": None}
        self.jobs[jid]["task"] = asyncio.ensure_future(self._run_job(jid, runners[kind], params))
        return jid

    def job_cancel(self, jid):
        job = self.jobs.get(jid)
        if job:
            job["task"].cancel()

    async def _run_job(self, jid, fn, params):
        job = self.jobs[jid]
        db = self.db
        status, err = "done", None
        try:
            await fn(jid, params, job)
        except asyncio.CancelledError:
            status = "cancelled"
        except Exception as exc:  # noqa: BLE001
            if not isinstance(exc, UserError):
                log.exception("Job %s failed", jid)
            status, err = "error", friendly(exc)
        job["progress"]["label"] = {"done": "Finished", "cancelled": "Cancelled", "error": "Failed"}[status]
        try:
            db.x("UPDATE jobs SET status=?, finished=?, error=?, count=?, progress=?, info=? WHERE id=?",
                 (status, now_iso(), err, job["count"], json.dumps(job["progress"]),
                  json.dumps(job["info"], ensure_ascii=False, default=str), jid))
        except Exception:  # noqa: BLE001
            pass
        self.jobs.pop(jid, None)
        self.bus.emit("job", {"id": jid, "kind": job["kind"], "status": status, "error": err,
                              "count": job["count"], "progress": job["progress"], "info": job["info"]})

    async def _job_history(self, jid, p, job):
        client = self.client
        target = p["target"].strip()
        limit = clamp_limit(p.get("limit"), 500)
        d_from, d_to = parse_day(p.get("from")), parse_day(p.get("to"), end=True)
        m = INVITE_RX.search(target)
        if m:
            inv = await client(functions.messages.CheckChatInviteRequest(m.group(1)))
            if isinstance(inv, types.ChatInvite):
                job["info"] = {"title": inv.title, "kind": "Channel" if inv.broadcast else "Group",
                               "members": inv.participants_count, "about": getattr(inv, "about", "") or "",
                               "joined": False, "note": "Invite preview only — join the chat in Telegram to read its history."}
                return
            ent = inv.chat
        else:
            ent = await self.resolve(target)
        job["info"] = info = await self.chat_info(ent)
        if p.get("members", True):
            await self._fetch_members(jid, ent, job, clamp_limit(p.get("members_limit"), 5000))
        self._progress(jid, force=True, done=0, total=limit, label=f"Reading {info['title']}")
        batch = []
        try:
            async for msg in client.iter_messages(ent, limit=limit, offset_date=d_to):
                if d_from and msg.date < d_from:
                    break
                if isinstance(msg, types.MessageService):
                    continue
                batch.append(self.record(msg, ent, msg.sender))
                if len(batch) >= 100:
                    self._store(jid, batch)
                    batch = []
                    self._progress(jid, done=job["count"], label=f"Reading {info['title']} · {msg.date:%Y-%m-%d}")
        except (errors.ChannelPrivateError, errors.ChatAdminRequiredError, errors.ChatForbiddenError) as exc:
            info["note"] = f"Telegram refused to return messages ({type(exc).__name__}). Join the chat in Telegram and try again."
        self._store(jid, batch)
        if not job["count"] and not info.get("note"):
            if d_from or d_to:
                info["note"] = "No messages in the selected date range."
            elif not info.get("joined"):
                info["note"] = ("Telegram returned no messages: this chat hides its history from non-members. "
                                "Join it and run again.")
            elif not info.get("total_messages"):
                info["note"] = "This chat has no messages."
        self._progress(jid, force=True, done=job["count"])

    def _member_row(self, u):
        part = getattr(u, "participant", None)
        if isinstance(part, (types.ChannelParticipantCreator, types.ChatParticipantCreator)):
            role = "Creator"
        elif isinstance(part, (types.ChannelParticipantAdmin, types.ChatParticipantAdmin)):
            role = "Admin"
        elif isinstance(part, types.ChannelParticipantBanned):
            role = "Restricted"
        else:
            role = "Member"
        rank = getattr(part, "rank", None)
        status, seen = status_info(u.status)
        flags = [n for n, v in (("Bot", u.bot), ("Premium", u.premium), ("Verified", u.verified), ("Scam", u.scam),
                                ("Fake", u.fake), ("Deleted", u.deleted), ("Contact", u.contact)) if v]
        joined = getattr(part, "date", None)
        return {"user_id": u.id, "name": display_name(u), "username": u.username or "", "phone": u.phone or "",
                "role": f"{role} · {rank}" if rank else role, "joined": to_iso(joined) if joined else None,
                "status": status, "seen_at": seen, "flags": flags, "photo": has_photo(u)}

    async def _fetch_members(self, jid, ent, job, limit):
        client = self.client
        info = job["info"]
        self._progress(jid, force=True, done=0, total=0, label="Reading member list…")
        rows = []

        async def collect(flt=None):
            async for u in client.iter_participants(ent, limit=limit, filter=flt):
                rows.append(self._member_row(u))
                if len(rows) % 200 == 0:
                    self._progress(jid, label=f"Reading member list · {len(rows)}")

        try:
            await collect()
        except errors.FloodWaitError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.info("Member list unavailable: %s", exc)
            rows.clear()
            if isinstance(ent, types.Channel) and ent.broadcast:
                info["members_note"] = "Channel subscriber lists are only visible to the channel's admins."
            else:
                info["members_note"] = "Telegram hides this member list (hidden by the admins, or you have not joined)."
                try:
                    await collect(types.ChannelParticipantsAdmins())
                    if rows:
                        info["members_note"] += " Showing administrators only."
                except Exception:  # noqa: BLE001
                    pass
        if rows:
            self.db.add_members(jid, info["id"], rows, info.get("title", ""))
        info["members_fetched"] = len(rows)

    async def _job_sweep(self, jid, p, job):
        client = self.client
        terms = [t.strip() for t in p["keywords"] if t.strip()]
        mode = p.get("mode", "any")
        limit = clamp_limit(p.get("limit"), 500)
        d_from, d_to = parse_day(p.get("from")), parse_day(p.get("to"), end=True)
        seen = set()

        def keep(msg):
            if isinstance(msg, types.MessageService) or not msg.message:
                return False
            key = (msg.chat_id, msg.id)
            if key in seen:
                return False
            seen.add(key)
            return True

        if mode == "regex":
            rx = re.compile("|".join(f"(?:{t})" for t in terms), re.I)
            depth = clamp_limit(p.get("depth"), 300)
            dialogs = [d async for d in client.iter_dialogs() if d.is_group or d.is_channel]
            job["info"] = {"dialogs": len(dialogs), "mode": "regex"}
            for i, d in enumerate(dialogs):
                if job["count"] >= limit:
                    break
                self._progress(jid, force=True, done=i, total=len(dialogs), label=d.name)
                batch = []
                try:
                    async for msg in client.iter_messages(d.entity, limit=depth, offset_date=d_to):
                        if d_from and msg.date < d_from:
                            break
                        if keep(msg) and rx.search(msg.message):
                            batch.append(self.record(msg, d.entity, msg.sender))
                            if job["count"] + len(batch) >= limit:
                                break
                except errors.FloodWaitError as exc:
                    self.on_flood_wait(exc.seconds)
                    await asyncio.sleep(exc.seconds)
                except Exception as exc:  # noqa: BLE001
                    log.info("Skipping %s: %s", d.name, exc)
                self._store(jid, batch)
            self._progress(jid, force=True, done=len(dialogs), total=len(dialogs))
            return

        lowered = [t.lower() for t in terms]
        search_terms = terms if mode == "any" else terms[:1]
        job["info"] = {"mode": mode, "scope": "All chats (global search)"}
        for i, term in enumerate(search_terms):
            if job["count"] >= limit:
                break
            self._progress(jid, force=True, done=i, total=len(search_terms), label=f"Searching “{term}”")
            batch = []
            async for msg in client.iter_messages(None, search=term, limit=limit - job["count"], offset_date=d_to):
                if d_from and msg.date < d_from:
                    break
                if not keep(msg):
                    continue
                if mode == "all" and not all(t in msg.message.lower() for t in lowered):
                    continue
                batch.append(self.record(msg, msg.chat, msg.sender))
                if len(batch) >= 100:
                    self._store(jid, batch)
                    batch = []
                    self._progress(jid, label=f"Searching “{term}” · {msg.date:%Y-%m-%d}")
            self._store(jid, batch)
        self._progress(jid, force=True, done=len(search_terms), total=len(search_terms))

    async def _job_tracker(self, jid, p, job):
        client = self.client
        ent = await self.resolve(p["target"])
        if not isinstance(ent, types.User):
            raise UserError("User Tracker needs a user, not a group or channel.")
        limit = clamp_limit(p.get("limit"), 1000)
        scope = p.get("scope", "common")
        d_from = parse_day(p.get("from"))
        if scope == "common":
            res = await client(functions.messages.GetCommonChatsRequest(user_id=ent, max_id=0, limit=100))
            chats = list(res.chats)
        else:
            chats = [d.entity async for d in client.iter_dialogs() if d.is_group]
        job["info"] = {"user": display_name(ent), "user_id": ent.id,
                       "username": f"@{ent.username}" if ent.username else "",
                       "scope": "Shared groups" if scope == "common" else "All my groups", "groups": len(chats)}
        for i, chat in enumerate(chats):
            if job["count"] >= limit:
                break
            self._progress(jid, force=True, done=i, total=len(chats), label=display_name(chat))
            batch = []
            try:
                async for msg in client.iter_messages(chat, from_user=ent, limit=limit - job["count"]):
                    if d_from and msg.date < d_from:
                        break
                    if isinstance(msg, types.MessageService):
                        continue
                    batch.append(self.record(msg, chat, ent))
            except errors.FloodWaitError as exc:
                self.on_flood_wait(exc.seconds)
                await asyncio.sleep(exc.seconds)
            except Exception as exc:  # noqa: BLE001
                log.info("Skipping %s: %s", display_name(chat), exc)
            self._store(jid, batch)
        self._progress(jid, force=True, done=len(chats), total=len(chats))

    # ---- dashboard ---------------------------------------------------------------------------------
    def dashboard(self):
        db = self.db
        since = ago_iso(hours=24)
        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        hours = [(now - timedelta(hours=23 - i)).strftime("%Y-%m-%dT%H") for i in range(24)]
        rows = {r["hr"]: r for r in db.q(
            "SELECT substr(date, 1, 13) AS hr, COUNT(*) AS n, SUM(risk='high') AS high FROM messages"
            " WHERE date >= ? GROUP BY hr", (hours[0] + ":00:00Z",))}
        series = [{"t": h + ":00:00Z", "n": rows.get(h, {}).get("n", 0), "high": rows.get(h, {}).get("high", 0) or 0}
                  for h in hours]
        watch = []
        for t in self.live_targets:
            row = db.one("SELECT MAX(date) AS last FROM messages WHERE sender_id=? OR chat_id=?", (t["id"], t["id"]))
            watch.append(dict(t, last=row["last"]))
        hits = []
        for m in db.messages("risk='high'", limit=6):
            _, kw = classify(m["text"], self.settings["risk"])
            hits.append(dict(m, keyword=kw or ""))
        return {
            "total": db.count(),
            "last24": db.count("date >= ?", (since,)),
            "high24": db.count("risk='high' AND date >= ?", (since,)),
            "targets": len(self.live_targets),
            "live": self.live_running,
            "rules": sum(1 for r in self.rules if r["enabled"]),
            "unread": db.one("SELECT COUNT(*) AS n FROM alerts WHERE read=0")["n"],
            "entities": db.one("SELECT COUNT(*) AS n FROM entities")["n"],
            "entity_types": db.q("SELECT type, COUNT(*) AS n FROM entities GROUP BY type ORDER BY n DESC"),
            "series": series, "watch": watch, "hits": hits,
            "alerts": db.alerts(limit=5),
        }
