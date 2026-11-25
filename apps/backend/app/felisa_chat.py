"""Obrolan Felisa: pertanyaan -> cache -> LLM teks -> TTS (dibatasi) -> simpan jawaban + audio.

Cache: storage/felisa_chat/index.json + <kunci>.mp3 (storage tidak ikut Git).
Pertanyaan yang sama (setelah dinormalisasi, atau sangat mirip) dijawab dari cache tanpa LLM/TTS.
Batas harian lewat .env: FELISA_CHAT_MAX_TURNS (default 40), FELISA_CHAT_MAX_VOICE (default 15).
"""
import hashlib
import json
import re
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import date

from . import config

MAX_INPUT = 300
MAX_REPLY = 400
SIMILARITY = 0.85


def normalize(text):
    t = unicodedata.normalize("NFD", str(text or "").lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", t)).strip()


def _tokens(norm):
    return frozenset(norm.split())


def similarity(a, b):
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def make_key(lang, norm):
    return hashlib.sha1(f"{lang}|{norm}".encode("utf-8")).hexdigest()[:20]


def _dir():
    d = config.STORAGE / "felisa_chat"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _load(name, default):
    f = _dir() / name
    if f.exists():
        try:
            return json.loads(f.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            return default
    return default


def _save(name, data):
    f = _dir() / name
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(f)


def audio_path(key):
    return _dir() / f"{key}.mp3"


def _int(name, default):
    try:
        return int(config._env(name, str(default)))
    except ValueError:
        return default


STATUS_WORDS = {
    "status", "proyek", "project", "projects", "progres", "progress", "kemajuan", "tahap", "stage", "pipeline",
    "naskah", "script", "review", "approval", "persetujuan", "setujui", "gagal", "error", "selesai", "done",
    "laporan", "report", "kondisi", "studio", "agen", "agent", "agents", "antrean", "queue", "video", "render",
}


def is_status_question(norm):
    return bool(_tokens(norm) & STATUS_WORDS)


def summarize_brief(brief):
    """Ringkasan status studio (dari leader.build_studio_brief) untuk LLM. Hanya fakta, maksimal ~700 huruf."""
    if not brief:
        return ""

    def names(items, extra):
        return "; ".join(f"{i.get('title', '?')} ({i.get(extra, '')})" for i in items[:5]) or "tidak ada"

    text = (
        f"Jumlah proyek: {brief.get('project_count', 0)}. "
        f"Menunggu persetujuan: {names(brief.get('waiting_approval', []), 'approval_point')}. "
        f"Sedang berjalan: {names(brief.get('running', []), 'stage')}. "
        f"Gagal: {names(brief.get('failed', []), 'stage')}. "
        f"Siap/idle: {len(brief.get('ready', []))} proyek."
    )
    return text[:700]


def find_cached(index, lang, norm, ctx=""):
    key = make_key(lang, norm + ("|" + ctx if ctx else ""))
    if key in index:
        return key
    best, best_s = None, 0.0
    for k, e in index.items():
        if e.get("lang") != lang or e.get("kind") == "say" or e.get("ctx", "") != ctx:
            continue
        s = similarity(norm, e.get("norm", ""))
        if s > best_s:
            best, best_s = k, s
    return best if best_s >= SIMILARITY and len(_tokens(norm)) >= 3 else None


def llm_reply(text, lang, name, studio=""):
    """Satu giliran LLM -> teks jawaban. Lempar RuntimeError bila gagal."""
    import llm  # dari folder tools (sudah di sys.path oleh main.py)

    system = (config.ROOT / "prompts" / "leader_felisa" / "chat_v1.md").read_text(encoding="utf-8-sig")
    payload = {"lang": lang, "operator_name": name, "message": text}
    if studio:
        payload["studio"] = studio
    msg = json.dumps(payload, ensure_ascii=False)
    try:
        raw = llm.generate_json("gemini", system, [("user", msg)], None)
        reply = str(json.loads(raw).get("reply", "")).strip()
    except (SystemExit, ValueError, AttributeError) as exc:
        raise RuntimeError(f"llm_gagal: {exc}") from exc
    if not reply:
        raise RuntimeError("llm_kosong")
    return reply[:MAX_REPLY]


def tts_elevenlabs(text):
    """Teks -> bytes mp3. Lempar RuntimeError bila kunci/voice kosong atau gagal."""
    key = config._env("ELEVENLABS_API_KEY")
    voice = config._env("ELEVENLABS_VOICE_ID")
    if not key or not voice:
        raise RuntimeError("elevenlabs_belum_diisi")
    model = config._env("ELEVENLABS_MODEL", "eleven_multilingual_v2")
    url = "https://api.elevenlabs.io/v1/text-to-speech/" + urllib.parse.quote(voice, safe="") + "?output_format=mp3_44100_128"
    req = urllib.request.Request(
        url,
        data=json.dumps({"text": text, "model_id": model}).encode("utf-8"),
        method="POST",
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"elevenlabs_{e.code}") from e
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise RuntimeError("elevenlabs_jaringan") from e


def chat(text, lang="id", name="Rangga", llm_fn=llm_reply, tts_fn=tts_elevenlabs, today=None, brief=None):
    text = " ".join(str(text or "").split())[:MAX_INPUT]
    lang = "en" if lang == "en" else "id"
    norm = normalize(text)
    if not norm:
        return {"ok": False, "error": "kosong"}
    today = today or date.today().isoformat()
    # Pertanyaan soal status memakai data studio; cache-nya hanya berlaku selama data itu tidak berubah.
    studio = summarize_brief(brief) if brief and is_status_question(norm) else ""
    ctx = hashlib.sha1(studio.encode("utf-8")).hexdigest()[:8] if studio else ""
    index = _load("index.json", {})
    usage = _load("usage.json", {})
    day = usage.get(today, {"turns": 0, "voice": 0})
    max_turns, max_voice = _int("FELISA_CHAT_MAX_TURNS", 40), _int("FELISA_CHAT_MAX_VOICE", 15)

    why = {"voice": ""}  # alasan audio tidak dibuat: "limit" atau kode galat (mis. elevenlabs_402)

    def result(key, entry, cached, voice_limited=False):
        has_audio = audio_path(key).exists()
        limited = voice_limited and not has_audio
        return {
            "ok": True,
            "reply": entry["reply"],
            "cached": cached,
            "audio_url": f"/felisa/chat/audio/{key}.mp3" if has_audio else None,
            "voice_limited": limited,
            "voice_reason": why["voice"] if limited else "",
        }

    def try_voice(key, entry):
        """Buat audio bila kuota suara hari ini masih ada. True bila berhasil."""
        if day["voice"] >= max_voice:
            why["voice"] = "limit"
            return False
        try:
            data = tts_fn(entry["reply"])
        except RuntimeError as exc:
            why["voice"] = str(exc) or "tts_gagal"
            print(f"[felisa_chat] suara gagal dibuat: {why['voice']}")
            return False
        audio_path(key).write_bytes(data)
        day["voice"] += 1
        return True

    hit = find_cached(index, lang, norm, ctx)
    if hit:
        entry = index[hit]
        entry["hits"] = entry.get("hits", 0) + 1
        limited = False
        if not audio_path(hit).exists():  # dulu gagal bersuara; coba lagi bila kuota ada
            limited = not try_voice(hit, entry)
        usage[today] = day
        _save("index.json", index)
        _save("usage.json", usage)
        return result(hit, entry, True, limited)

    if day["turns"] >= max_turns:
        return {"ok": False, "error": "batas_harian"}
    try:
        reply = llm_fn(text, lang, name, studio)
    except RuntimeError as exc:
        print(f"[felisa_chat] LLM gagal: {str(exc)[:600]}")
        return {"ok": False, "error": "llm_gagal"}
    day["turns"] += 1
    key = make_key(lang, norm + ("|" + ctx if ctx else ""))
    entry = {"q": text, "norm": norm, "lang": lang, "reply": reply, "hits": 0, "created": today, "ctx": ctx}
    index[key] = entry
    limited = not try_voice(key, entry)
    usage[today] = day
    _save("index.json", index)
    _save("usage.json", usage)
    return result(key, entry, False, limited)


def _stage_label(stage):
    return str(stage or "").replace("_", " ").strip() or "produksi"


def event_line(event_type, stage="", title="", lang="id"):
    """Kalimat laporan Felisa untuk satu event studio. None bila event tidak perlu diucapkan."""
    title = " ".join(str(title or "").split())[:60]
    st = _stage_label(stage)
    if lang == "en":
        for_t = f" for {title}" if title else ""
        lines = {
            "stage_failed": f"Boss, the {st} step{for_t} just failed. I logged it, let's take a look together.",
            "waiting_approval": f"Boss, the {st} result{for_t} is ready. Just waiting on your approval.",
            "tutor_ready": "Boss, the Tutor session is ready whenever you are.",
            "stage_completed": f"The {st} step{for_t} is done, Boss. Nice work.",
        }
    else:
        for_t = f" untuk {title}" if title else ""
        lines = {
            "stage_failed": f"Bos, tahap {st}{for_t} gagal nih. Udah kucatat, yuk kita lihat bareng.",
            "waiting_approval": f"Bos, hasil tahap {st}{for_t} udah siap. Tinggal nunggu persetujuanmu.",
            "tutor_ready": "Bos, sesi belajar bareng Tutor udah siap kapan pun kamu mau.",
            "stage_completed": f"Tahap {st}{for_t} udah selesai, Bos. Mantap.",
        }
    return lines.get(event_type)


def say(text, lang="id", tts_fn=tts_elevenlabs, today=None):
    """Ucapkan teks tetap (tanpa LLM). Audio di-cache menurut teks; memakai kuota suara harian yang sama."""
    text = " ".join(str(text or "").split())[:MAX_REPLY]
    lang = "en" if lang == "en" else "id"
    norm = "say|" + normalize(text)
    if norm == "say|":
        return {"ok": False, "error": "kosong"}
    today = today or date.today().isoformat()
    index = _load("index.json", {})
    usage = _load("usage.json", {})
    day = usage.get(today, {"turns": 0, "voice": 0})
    key = make_key(lang, norm)
    reason = ""
    if not audio_path(key).exists():
        if day["voice"] >= _int("FELISA_CHAT_MAX_VOICE", 15):
            reason = "limit"
        else:
            try:
                audio_path(key).write_bytes(tts_fn(text))
                day["voice"] += 1
            except RuntimeError as exc:
                reason = str(exc) or "tts_gagal"
                print(f"[felisa_chat] suara laporan gagal dibuat: {reason}")
    index[key] = {"q": "(laporan)", "norm": norm, "lang": lang, "reply": text, "kind": "say", "hits": index.get(key, {}).get("hits", 0) + 1, "created": today}
    usage[today] = day
    _save("index.json", index)
    _save("usage.json", usage)
    has_audio = audio_path(key).exists()
    return {
        "ok": True,
        "reply": text,
        "cached": True,
        "audio_url": f"/felisa/chat/audio/{key}.mp3" if has_audio else None,
        "voice_limited": not has_audio,
        "voice_reason": "" if has_audio else reason,
    }


def say_event(event_type, stage="", title="", lang="id", tts_fn=tts_elevenlabs, today=None):
    line = event_line(event_type, stage, title, lang)
    if not line:
        return {"ok": False, "error": "event_tidak_diucapkan"}
    return say(line, lang, tts_fn, today)