"""Alert rules: matching, e-mail (SMTP) and webhook delivery with throttling."""
import asyncio
import html
import logging
import re
import smtplib
import ssl
import time
from email.message import EmailMessage
from email.utils import formatdate, make_msgid

import aiohttp

log = logging.getLogger("tgsherlock.alerts")

TRIGGER_LABELS = {
    "any": "Any message",
    "keywords": "Keywords",
    "regex": "Regex",
    "media": "Has media",
    "entity": "Entity found",
}

_rx_cache = {}


def _regex(pattern):
    if pattern not in _rx_cache:
        try:
            _rx_cache[pattern] = re.compile(pattern, re.I)
        except re.error:
            _rx_cache[pattern] = None
    return _rx_cache[pattern]


def validate_rule(r: dict):
    if r.get("watch") not in ("user", "chat", "anywhere"):
        return "Choose what to watch."
    if r.get("watch") != "anywhere" and not r.get("target_id"):
        return "Pick a user or group to watch."
    if r.get("trigger") not in TRIGGER_LABELS:
        return "Choose a trigger."
    if r.get("trigger") in ("keywords", "regex") and not (r.get("pattern") or "").strip():
        return "Enter keywords or a pattern."
    if r.get("trigger") == "regex" and _regex(r["pattern"]) is None:
        return "The regular expression is not valid."
    return None


def rule_watches(rule, sender_id, chat_id) -> bool:
    if not rule["enabled"]:
        return False
    if rule["watch"] == "anywhere":
        return True
    if rule["watch"] == "user":
        return sender_id is not None and int(rule["target_id"]) == int(sender_id)
    return chat_id is not None and int(rule["target_id"]) == int(chat_id)


def rule_matches(rule, rec, entities) -> bool:
    text = rec.get("text") or ""
    trig = rule["trigger"]
    pattern = (rule.get("pattern") or "").strip()
    if trig == "any":
        return True
    if trig == "keywords":
        t = text.lower()
        return any(k.strip().lower() in t for k in pattern.split(",") if k.strip())
    if trig == "regex":
        rx = _regex(pattern)
        return bool(rx and rx.search(text))
    if trig == "media":
        return bool(rec.get("media"))
    if trig == "entity":
        wanted = {p.strip().lower() for p in pattern.split(",") if p.strip()}
        types = {etype.lower() for _, etype in entities}
        return bool(types & wanted) if wanted else bool(types)
    return False


def describe(rec, rule) -> str:
    who = rec.get("sender_name") or (f"@{rec['sender_username']}" if rec.get("sender_username") else str(rec.get("sender_id")))
    where = rec.get("chat_title") or "a private chat"
    if rule["trigger"] == "keywords":
        t = (rec.get("text") or "").lower()
        hit = next((k.strip() for k in rule["pattern"].split(",") if k.strip() and k.strip().lower() in t), "")
        return f"“{hit}” mentioned by {who} in {where}"
    if rule["trigger"] == "entity":
        return f"Indicator posted by {who} in {where}"
    if rule["trigger"] == "media":
        return f"{who} shared media in {where}"
    return f"{who} posted in {where}"


# ---------------------------------------------------------------------------
# e-mail
# ---------------------------------------------------------------------------

def _send_mail_sync(smtp: dict, recipients, subject: str, text: str, html_body: str):
    host, port = smtp.get("host"), int(smtp.get("port") or 0)
    if not host or not port:
        raise RuntimeError("SMTP host and port are not configured.")
    if not recipients:
        raise RuntimeError("No recipients configured.")
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp.get("sender") or smtp.get("user") or "tgsherlock@localhost"
    msg["To"] = ", ".join(recipients)
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid("tgsherlock")
    msg.set_content(text)
    msg.add_alternative(html_body, subtype="html")
    ctx = ssl.create_default_context()
    security = smtp.get("security", "starttls")
    if security == "ssl":
        server = smtplib.SMTP_SSL(host, port, timeout=20, context=ctx)
    else:
        server = smtplib.SMTP(host, port, timeout=20)
    try:
        server.ehlo()
        if security == "starttls":
            server.starttls(context=ctx)
            server.ehlo()
        if smtp.get("user"):
            server.login(smtp["user"], smtp.get("password") or "")
        server.send_message(msg)
    finally:
        try:
            server.quit()
        except Exception:  # noqa: BLE001
            pass


def split_recipients(value: str):
    return [r.strip() for r in re.split(r"[,;\s]+", value or "") if "@" in r]


def _alert_html(alerts):
    rows = []
    colors = {"high": "#c0392b", "medium": "#b7791f", "low": "#2b6cb0"}
    for a in alerts:
        rows.append(
            f"<tr><td style='padding:10px;border-bottom:1px solid #e5e7eb;vertical-align:top'>"
            f"<span style='color:#fff;background:{colors.get(a['severity'], '#555')};border-radius:10px;"
            f"padding:2px 8px;font-size:12px'>{html.escape(a['severity'].title())}</span></td>"
            f"<td style='padding:10px;border-bottom:1px solid #e5e7eb'><b>{html.escape(a['title'])}</b><br>"
            f"<span style='color:#374151'>{html.escape(a['text'] or '')}</span><br>"
            f"<span style='color:#6b7280;font-size:12px'>{html.escape(a['date'])} · rule: "
            f"{html.escape(a['rule_name'])}</span></td></tr>")
    return ("<div style='font-family:Arial,sans-serif'><h2 style='margin:0 0 12px'>TGSherlock alert</h2>"
            "<table style='border-collapse:collapse;width:100%'>" + "".join(rows) + "</table></div>")


def _alert_text(alerts):
    parts = []
    for a in alerts:
        parts.append(f"[{a['severity'].upper()}] {a['title']}\n{a['text']}\n{a['date']} · rule: {a['rule_name']}\n")
    return "\n".join(parts)


class Notifier:
    """Delivers alerts by e-mail / webhook. E-mails are throttled per rule into digests."""

    def __init__(self, settings):
        self.settings = settings
        self.last_mail = {}   # rule_id -> monotonic timestamp
        self.pending = {}     # rule_id -> (rule, [alerts])
        self._task = None
        self._session = None

    def start(self):
        if self._task is None:
            self._task = asyncio.ensure_future(self._flusher())

    async def close(self):
        if self._task:
            self._task.cancel()
            self._task = None
        if self._session:
            await self._session.close()
            self._session = None

    async def _http(self):
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15))
        return self._session

    async def deliver(self, rule, alert, on_status):
        """on_status(label) is called with the delivery result for each channel."""
        notify = rule.get("notify") or {}
        if notify.get("webhook") and rule.get("webhook"):
            asyncio.ensure_future(self._webhook(rule["webhook"], alert, on_status))
        if notify.get("email"):
            throttle = max(0, int(rule.get("throttle_min") or 0)) * 60
            last = self.last_mail.get(rule["id"], 0)
            if throttle and time.monotonic() - last < throttle:
                self.pending.setdefault(rule["id"], (rule, []))[1].append(alert)
                on_status("Email queued (digest)")
            else:
                self.last_mail[rule["id"]] = time.monotonic()
                await self._email(rule, [alert], on_status)

    async def _email(self, rule, alerts, on_status=None):
        smtp = self.settings["smtp"]
        recipients = split_recipients(rule.get("recipients") or smtp.get("to"))
        sev = alerts[0]["severity"].upper()
        subject = (f"[TGSherlock][{sev}] {alerts[0]['title']}" if len(alerts) == 1
                   else f"[TGSherlock] {len(alerts)} alerts · {rule['name']}")
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(None, _send_mail_sync, smtp, recipients, subject,
                                       _alert_text(alerts), _alert_html(alerts))
            if on_status:
                on_status("Email sent")
        except Exception as exc:  # noqa: BLE001
            log.warning("E-mail delivery failed: %s", exc)
            if on_status:
                on_status("Email failed")

    async def _webhook(self, url, alert, on_status):
        text = f"[{alert['severity'].upper()}] {alert['title']}\n{alert['text']}"
        payload = {"text": text, "content": text[:1900], "alert": alert}
        try:
            session = await self._http()
            async with session.post(url, json=payload) as resp:
                on_status("Webhook sent" if resp.status < 400 else f"Webhook failed ({resp.status})")
        except Exception as exc:  # noqa: BLE001
            log.warning("Webhook delivery failed: %s", exc)
            on_status("Webhook failed")

    async def _flusher(self):
        while True:
            await asyncio.sleep(30)
            for rule_id in list(self.pending):
                rule, alerts = self.pending[rule_id]
                throttle = max(1, int(rule.get("throttle_min") or 0)) * 60
                if time.monotonic() - self.last_mail.get(rule_id, 0) >= throttle and alerts:
                    del self.pending[rule_id]
                    self.last_mail[rule_id] = time.monotonic()
                    await self._email(rule, alerts)

    async def send_test(self, to=None):
        smtp = self.settings["smtp"]
        recipients = split_recipients(to or smtp.get("to"))
        loop = asyncio.get_running_loop()
        sample = [{"severity": "low", "title": "Test alert", "text": "Your SMTP settings work.",
                   "date": time.strftime("%Y-%m-%d %H:%M:%S"), "rule_name": "Test"}]
        await loop.run_in_executor(None, _send_mail_sync, smtp, recipients, "[TGSherlock] Test email",
                                   _alert_text(sample), _alert_html(sample))
        return recipients
