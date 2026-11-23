"""Ubah naskah (file teks) jadi suara dengan Gemini TTS, simpan sebagai .wav.

Pemakaian (dari folder utama proyek):
  python tools\\tts_gemini.py NASKAH.txt apps\\remotion\\public\\audio\\NAMA.wav
Pilihan: --voice Kore  --model gemini-3.1-flash-tts-preview  --style "..."  --timeout 180

API key dibaca dari variabel GEMINI_API_KEY atau dari baris GEMINI_API_KEY=... di file .env
(di folder utama proyek). Jangan pernah menempel key di chat atau meng-commit .env.
"""
import argparse
import base64
import http.client
import json
import os
import sys
import urllib.error
import urllib.request
import wave
from pathlib import Path

DEFAULT_MODEL = "gemini-3.1-flash-tts-preview"
DEFAULT_STYLE = "Bacakan dalam Bahasa Indonesia dengan nada ramah, santai, dan bersemangat, seperti menjelaskan ke teman: "
DEFAULT_TIMEOUT = 180


def read_key():
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key
    env = Path(".env")
    if env.exists():
        for line in env.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def synthesize(text, key, model, voice, style, timeout=DEFAULT_TIMEOUT):
    base = os.environ.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com")
    url = f"{base}/v1beta/models/{model}:generateContent"
    body = {
        "contents": [{"parts": [{"text": style + text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"[GAGAL] Gemini menjawab {e.code}:\n{e.read().decode('utf-8', 'replace')[:1500]}")
    except urllib.error.URLError as e:
        raise SystemExit(f"[GAGAL] Tidak bisa menghubungi Gemini: {e.reason}")
    except TimeoutError:
        raise SystemExit(f"[GAGAL] Tidak bisa menghubungi Gemini: timeout setelah {timeout} detik")
    except (OSError, http.client.HTTPException) as e:
        raise SystemExit(f"[GAGAL] Tidak bisa menghubungi Gemini: koneksi terputus ({type(e).__name__})")

    try:
        part = data["candidates"][0]["content"]["parts"][0]["inlineData"]
    except (KeyError, IndexError):
        raise SystemExit("[GAGAL] Jawaban tidak berisi audio:\n" + json.dumps(data, ensure_ascii=False)[:1500])
    rate = 24000
    mime = part.get("mimeType", "")
    if "rate=" in mime:
        rate = int(mime.split("rate=")[1].split(";")[0])
    return base64.b64decode(part["data"]), rate


def main():
    ap = argparse.ArgumentParser(description="Naskah -> suara (Gemini TTS)")
    ap.add_argument("script", help="file naskah .txt")
    ap.add_argument("out", help="file hasil .wav")
    ap.add_argument("--voice", default="Kore")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--style", default=DEFAULT_STYLE)
    ap.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT, help="batas tunggu jawaban Gemini (detik)")
    args = ap.parse_args()

    src = Path(args.script)
    if not src.exists():
        print(f"[GAGAL] File naskah tidak ditemukan: {src}")
        return 1
    text = " ".join(src.read_text(encoding="utf-8-sig").split())
    if not text:
        print("[GAGAL] Naskah kosong.")
        return 1
    key = read_key()
    if not key:
        print("[GAGAL] GEMINI_API_KEY belum diisi (variabel lingkungan atau file .env).")
        return 1

    print(f"Membuat suara ({len(text)} huruf, model {args.model}, suara {args.voice})...")
    pcm, rate = synthesize(text, key, args.model, args.voice, args.style, args.timeout)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    secs = len(pcm) / 2 / rate
    print(f"[OK] {secs:.1f} detik, {rate} Hz. Disimpan: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())