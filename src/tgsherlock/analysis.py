"""Risk classification and indicator (entity) extraction."""
import re

ENTITY_PATTERNS = [
    ("Invite link", re.compile(r"(?:https?://)?(?:t\.me|telegram\.me)/(?:\+|joinchat/)[A-Za-z0-9_-]{8,}")),
    ("URL", re.compile(r"https?://[^\s<>\"'()\[\]]+")),
    ("Email", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("IP", re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b")),
    ("Crypto wallet", re.compile(r"\b(?:bc1[ac-hj-np-z02-9]{25,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}"
                                  r"|0x[a-fA-F0-9]{40}|T[1-9A-HJ-NP-Za-km-z]{33})\b")),
    ("Phone", re.compile(r"(?<![\w+])\+\d[\d \-().]{7,16}\d")),
    ("Username", re.compile(r"(?<![\w@./])@[A-Za-z][A-Za-z0-9_]{4,31}\b")),
    ("Hashtag", re.compile(r"(?<![\w&/#])#[^\s#.,!?;:()\[\]{}\"']{2,40}")),
]

ENTITY_TYPES = [name for name, _ in ENTITY_PATTERNS]


def extract_entities(text: str):
    """Return a list of (value, type) pairs found in text, de-duplicated."""
    if not text:
        return []
    found, seen = [], set()
    taken = []  # spans already claimed by a more specific type
    for etype, rx in ENTITY_PATTERNS:
        for m in rx.finditer(text):
            if any(s <= m.start() < e for s, e in taken):
                continue
            value = m.group(0).rstrip(".,;:")
            if etype == "Phone" and len(re.sub(r"\D", "", value)) < 9:
                continue
            key = (value.lower(), etype)
            if key in seen:
                continue
            seen.add(key)
            taken.append((m.start(), m.end()))
            found.append((value, etype))
    return found


def _contains(text_l: str, word: str) -> bool:
    word = word.strip().lower()
    return bool(word) and word in text_l


def classify(text: str, risk_cfg: dict):
    """Return (level, matched_keyword). level: high | watch | clean."""
    if not text:
        return "clean", None
    t = text.lower()
    for w in risk_cfg.get("high", []):
        if _contains(t, w):
            return "high", w
    for w in risk_cfg.get("watch", []):
        if _contains(t, w):
            return "watch", w
    return "clean", None
