"""Siapkan database PostgreSQL: buat database bila belum ada, lalu buat semua tabel.

Pemakaian (dari folder utama proyek):
  .\\.venv-audio\\Scripts\\python.exe tools\\setup_db.py
Butuh DATABASE_URL di file .env, contoh:
  DATABASE_URL=postgresql+psycopg://postgres:PASSWORD_KAMU@localhost:5432/video_studio
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "apps" / "backend"))

from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from app import config, db  # noqa: E402


def main():
    if not config.DATABASE_URL:
        print("[GAGAL] DATABASE_URL belum ada di file .env. Contoh isi:")
        print("DATABASE_URL=postgresql+psycopg://postgres:PASSWORD_KAMU@localhost:5432/video_studio")
        return 1
    url = make_url(config.DATABASE_URL)
    if url.get_backend_name() == "postgresql":
        admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
        try:
            with admin.connect() as c:
                exists = c.execute(text("SELECT 1 FROM pg_database WHERE datname=:n"), {"n": url.database}).first()
                if not exists:
                    c.execute(text(f'CREATE DATABASE "{url.database}"'))
                    print(f"Database '{url.database}' dibuat.")
                else:
                    print(f"Database '{url.database}' sudah ada.")
        except Exception as e:  # noqa: BLE001
            print(f"[GAGAL] Tidak bisa terhubung ke PostgreSQL: {e}")
            print("Cek: PostgreSQL berjalan? password dan port di DATABASE_URL benar?")
            return 1
    db.init()
    print("[OK] Semua tabel siap:", ", ".join(sorted(db.Base.metadata.tables)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
