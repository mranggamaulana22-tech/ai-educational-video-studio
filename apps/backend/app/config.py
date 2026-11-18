"""Pengaturan backend. DATABASE_URL dibaca dari variabel lingkungan atau file .env di folder utama proyek."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # folder utama proyek


def _env(name, default=""):
    v = os.environ.get(name, "").strip()
    if v:
        return v
    f = ROOT / ".env"
    if f.exists():
        for line in f.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return default


DATABASE_URL = _env("DATABASE_URL", "")
STORAGE = ROOT / "storage"  # salinan tiap versi hasil tahap (naskah, suara, video, ...)
REMOTION = ROOT / "apps" / "remotion"
