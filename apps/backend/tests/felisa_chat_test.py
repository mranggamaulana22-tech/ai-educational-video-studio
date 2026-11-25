"""Tes obrolan Felisa (tanpa jaringan). Jalankan dari apps/backend:  python -m tests.felisa_chat_test"""
import sys, tempfile
from pathlib import Path

tmp = Path(tempfile.mkdtemp())
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import config, felisa_chat as fc  # noqa: E402

config.STORAGE = tmp / "storage"
calls = {"llm": 0, "tts": 0}


def fake_llm(text, lang, name, studio=""):
    calls["llm"] += 1
    return f"Halo {name}, aku dengar: {text} [{studio}]"


def fake_tts(text):
    calls["tts"] += 1
    return b"MP3"


def run(q, **kw):
    return fc.chat(q, "id", "Rangga", fake_llm, fake_tts, today=kw.get("today", "2026-11-24"), brief=kw.get("brief"))


r = run("Halo Felisa, apa kabar hari ini?")
assert r["ok"] and not r["cached"] and r["audio_url"] and calls == {"llm": 1, "tts": 1}
r2 = run("halo felisa apa kabar hari ini")          # beda tanda baca/huruf besar
assert r2["cached"] and r2["audio_url"] == r["audio_url"] and calls == {"llm": 1, "tts": 1}
r3 = run("Halo Felisa apa kabar hari ini ya")       # sangat mirip
assert r3["cached"] and calls["llm"] == 1
r4 = run("Jelaskan apa itu API")
assert not r4["cached"] and calls["llm"] == 2
assert fc.chat("", "id")["ok"] is False

# kuota suara habis -> teks saja, lalu audio dibuat saat kuota ada lagi
config._env = lambda n, d="": {"FELISA_CHAT_MAX_VOICE": "1"}.get(n, d)
r5 = run("Apa warna langit")
assert r5["ok"] and r5["audio_url"] is None and r5["voice_limited"] and r5["voice_reason"] == "limit"
r6 = run("Apa warna langit", today="2026-11-25")
assert r6["cached"] and r6["audio_url"] and not r6["voice_limited"]

# TTS gagal -> alasan galat terlihat, bukan "limit"
def bad_tts(text):
    raise RuntimeError("elevenlabs_402")
rx = fc.chat("tanya suara rusak sekali", "id", "R", fake_llm, bad_tts, today="2026-11-30")
assert rx["voice_limited"] and rx["voice_reason"] == "elevenlabs_402"

# batas giliran
config._env = lambda n, d="": {"FELISA_CHAT_MAX_TURNS": "1"}.get(n, d)
run("pertanyaan satu dua tiga", today="2026-12-01")
assert run("pertanyaan lain sekali", today="2026-12-01") == {"ok": False, "error": "batas_harian"}
assert run("pertanyaan satu dua tiga", today="2026-12-01")["cached"]  # cache tetap jalan

# LLM gagal
def bad(*a, **k):
    raise RuntimeError("x")
assert fc.chat("tanya baru lagi", "id", "R", bad, fake_tts, today="2026-12-02") == {"ok": False, "error": "llm_gagal"}
# --- status studio: LLM dapat data, cache mengikuti data
config._env = lambda n, d="": d
b1 = {"project_count": 2, "waiting_approval": [{"title": "Hari 2", "approval_point": "script"}], "running": [], "failed": [], "ready": [1]}
b2 = dict(b1, waiting_approval=[])
n0 = calls["llm"]
r = run("gimana status proyek hari ini", brief=b1, today="2026-12-05")
assert "Hari 2" in r["reply"] and calls["llm"] == n0 + 1
assert run("gimana status proyek hari ini", brief=b1, today="2026-12-05")["cached"]          # data sama -> cache
r = run("gimana status proyek hari ini", brief=b2, today="2026-12-05")
assert not r["cached"] and "Hari 2" not in r["reply"] and calls["llm"] == n0 + 2             # data berubah -> LLM lagi
n1 = calls["llm"]
run("ceritain lelucon dong", brief=b1, today="2026-12-05")
assert "[]" in fc.chat("ceritain lelucon dong lagi sekali", "id", "R", fake_llm, fake_tts, today="2026-12-05", brief=b1)["reply"]  # bukan soal status: tanpa data

# --- laporan event
tt = calls["tts"]
e = fc.say_event("waiting_approval", "script", "Hari 2", "id", fake_tts, today="2026-12-06")
assert e["ok"] and e["audio_url"] and "Bos" in e["reply"] and calls["tts"] == tt + 1
e2 = fc.say_event("waiting_approval", "script", "Hari 2", "id", fake_tts, today="2026-12-06")
assert e2["audio_url"] == e["audio_url"] and calls["tts"] == tt + 1                           # cache
assert fc.say_event("stage_started", "script", "x", "id", fake_tts)["ok"] is False
assert "Boss" in fc.say_event("stage_failed", "render", "V", "en", fake_tts, today="2026-12-06")["reply"]
print("OK")