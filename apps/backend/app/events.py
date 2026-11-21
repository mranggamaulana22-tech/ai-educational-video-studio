"""Event bus ringan untuk penyiaran status studio lewat Server-Sent Events."""

import asyncio
import threading
import uuid
from collections import deque
from datetime import datetime, timezone


ALLOWED_TYPES = {
    "stage_started",
    "stage_completed",
    "stage_failed",
    "waiting_approval",
    "tutor_ready",
    "leader_message",
}


class StudioEventBus:
    def __init__(self):
        self._history = deque(maxlen=50)
        self._subscribers = set()
        self._lock = threading.RLock()

    def subscribe(self):
        queue = asyncio.Queue()
        loop = asyncio.get_running_loop()
        subscriber = (loop, queue)
        with self._lock:
            self._subscribers.add(subscriber)
            initial = list(self._history)
        return subscriber, initial

    def unsubscribe(self, subscriber):
        with self._lock:
            self._subscribers.discard(subscriber)

    def emit(self, payload):
        with self._lock:
            self._history.append(payload)
            subscribers = list(self._subscribers)
        for loop, queue in subscribers:
            if loop.is_closed():
                continue
            loop.call_soon_threadsafe(queue.put_nowait, payload)

    def history(self):
        with self._lock:
            return list(self._history)


studio_events = StudioEventBus()


def _felisa_message(event_type, stage, detail, video_title):
    project = f" untuk \"{video_title}\"" if video_title else ""
    stage_label = stage.replace("_", " ").title() if stage else "tahap produksi"

    if event_type == "stage_started":
        return detail or f"Aku mulai menjalankan {stage_label}{project}. Kamu bisa lanjutkan aktivitas, aku pantau prosesnya."
    if event_type == "stage_completed":
        return detail or f"{stage_label} untuk \"{video_title}\" sudah selesai dan hasilnya siap diteruskan."
    if event_type == "stage_failed":
        return detail or f"{stage_label}{project} belum berhasil. Saya sudah mencatat masalahnya untuk ditinjau."
    if event_type == "waiting_approval":
        return detail or f"Produksi{project} sudah sampai titik persetujuan. Saya menunggumu membuka tempat review."
    if event_type == "tutor_ready":
        return detail or f"Sesi belajar{project} sudah selesai. Catatan berikutnya siap disusun."
    return detail or f"Ada pembaruan baru{project}. Silakan cek ringkasan aktivitas studio."


def emit_studio_event(
    event_type,
    video_id=None,
    video_title="",
    stage="",
    detail="",
    action_hint="",
):
    if event_type not in ALLOWED_TYPES:
        raise ValueError(f"Tipe event tidak dikenal: {event_type}")
    payload = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": event_type,
        "video_id": video_id,
        "video_title": video_title,
        "stage": stage,
        "felisa_message": _felisa_message(event_type, stage, detail, video_title),
        "action_hint": action_hint,
    }
    studio_events.emit(payload)
    return payload
