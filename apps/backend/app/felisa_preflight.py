"""Cek kesiapan studio sebelum produksi: kunci terisi, sisa kuota suara, FFmpeg. Tanpa jaringan, tanpa kuota."""
import shutil
from datetime import date

from . import config, felisa_chat


def _filled(name):
    return bool(str(config._env(name, "") or "").strip())


PREFLIGHT_LINES = {
    "id": {"ok": "Semua siap, Bos. Kita bisa mulai bikin videonya.",
           "issue": "Bos, ada yang belum siap. Cek daftarnya di bawah ya."},
    "en": {"ok": "All set, Boss. We're ready to build.",
           "issue": "Boss, something isn't ready yet. Check the list below."},
}


def preflight_line(result, lang="id"):
    """Kalimat tetap (4 variasi total) supaya audionya di-cache dan hemat kuota suara."""
    return PREFLIGHT_LINES["en" if lang == "en" else "id"]["ok" if result.get("level") == "ok" else "issue"]


def run_preflight(today=None, which=shutil.which, env_filled=_filled):
    today = today or date.today().isoformat()
    checks = []

    def add(key, ok, level, detail):
        checks.append({"key": key, "ok": bool(ok), "level": "ok" if ok else level, "detail": detail})

    llm_keys = {"gemini": "GEMINI_API_KEY", "openrouter": "OPENROUTER_API_KEY", "deepseek": "DEEPSEEK_API_KEY"}
    have = [p for p, k in llm_keys.items() if env_filled(k)]
    add("llm_primary", "gemini" in have, "error", "GEMINI_API_KEY terisi" if "gemini" in have else "GEMINI_API_KEY kosong")
    add("llm_backup", any(p != "gemini" for p in have), "warn",
        "LLM cadangan: " + ", ".join(p for p in have if p != "gemini") if any(p != "gemini" for p in have)
        else "Belum ada LLM cadangan (OPENROUTER_API_KEY / DEEPSEEK_API_KEY)")
    tts_ok = env_filled("ELEVENLABS_API_KEY") and env_filled("ELEVENLABS_VOICE_ID")
    add("tts_keys", tts_ok, "warn", "ElevenLabs terisi" if tts_ok else "ElevenLabs belum lengkap, Felisa hanya teks")

    usage = felisa_chat._load("usage.json", {}).get(today, {"turns": 0, "voice": 0})
    max_voice = felisa_chat._int("FELISA_CHAT_MAX_VOICE", 15)
    left = max(0, max_voice - int(usage.get("voice", 0)))
    add("voice_quota", left > 0, "warn", f"Sisa suara hari ini: {left}/{max_voice}")
    add("ffmpeg", bool(which("ffmpeg")), "error", "FFmpeg ditemukan" if which("ffmpeg") else "FFmpeg tidak ditemukan di PATH")

    level = "error" if any(c["level"] == "error" for c in checks) else "warn" if any(c["level"] == "warn" for c in checks) else "ok"
    return {"ok": level != "error", "level": level, "voice_left": left, "checks": checks}