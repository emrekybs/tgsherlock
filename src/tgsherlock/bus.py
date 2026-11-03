"""In-process event bus feeding Server-Sent Events to the browser."""
import asyncio
import json


class Bus:
    def __init__(self):
        self.queues = set()

    def subscribe(self):
        q = asyncio.Queue(maxsize=500)
        self.queues.add(q)
        return q

    def unsubscribe(self, q):
        self.queues.discard(q)

    def emit(self, kind, data=None):
        payload = json.dumps({"type": kind, "data": data}, ensure_ascii=False, default=str)
        for q in list(self.queues):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                pass
