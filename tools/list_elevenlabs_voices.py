r"""Daftar suara ElevenLabs di akunmu (nama, voice ID, kategori). Kunci TIDAK ditampilkan.

Pemakaian (dari folder utama proyek):
  .\.venv-audio\Scripts\python.exe tools\list_elevenlabs_voices.py
Pilih voice dengan kategori "premade" (suara bawaan) untuk akun gratis, lalu salin ID-nya
ke .env sebagai ELEVENLABS_VOICE_ID=...
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_key():
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if key:
        return key
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if line.startswith("ELEVENLABS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def main():
    key = read_key()
    if not key:
        print("[GAGAL] ELEVENLABS_API_KEY belum diisi (variabel lingkungan atau .env).")
        return 1
    req = urllib.request.Request(
        "https://api.elevenlabs.io/v1/voices",
        headers={"xi-api-key": key, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"[GAGAL] ElevenLabs menjawab {e.code}: {e.read().decode('utf-8', 'replace')[:600]}")
        return 1
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        print(f"[GAGAL] Tidak bisa menghubungi ElevenLabs: {e}")
        return 1

    voices = data.get("voices", [])
    if not voices:
        print("Tidak ada suara yang dikembalikan.")
        return 0
    voices.sort(key=lambda v: (0 if v.get("category") == "premade" else 1, str(v.get("name", "")).lower()))
    print(f"{'KATEGORI':<12} {'NAMA':<26} VOICE ID / CIRI")
    for v in voices:
        labels = v.get("labels") or {}
        traits = ", ".join(str(labels[k]) for k in ("gender", "accent", "descriptive", "use_case") if labels.get(k))
        print(f"{str(v.get('category', '?')):<12} {str(v.get('name', '?'))[:25]:<26} {v.get('voice_id', '?')}  [{traits}]")
    print("\nPilih yang kategorinya 'premade' lalu isi ELEVENLABS_VOICE_ID di .env dengan ID-nya.")
    return 0


if __name__ == "__main__":
    sys.exit(main())