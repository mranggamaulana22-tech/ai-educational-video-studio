# Backend (FastAPI + PostgreSQL)

Pasang (sekali, dari folder utama proyek, dengan .venv-audio aktif / lewat python-nya):
  .\.venv-audio\Scripts\python.exe -m pip install -r apps\backend\requirements.txt

Siapkan database: isi .env  ->  DATABASE_URL=postgresql+psycopg://postgres:PASSWORD@localhost:5432/video_studio
  .\.venv-audio\Scripts\python.exe tools\setup_db.py

Tes alur tanpa AI (SQLite sementara):
  cd apps\backend
  ..\..\.venv-audio\Scripts\python.exe -m tests.smoke_test

Jalankan server:
  cd apps\backend
  ..\..\.venv-audio\Scripts\python.exe -m uvicorn app.main:app --reload
Dokumentasi + tombol coba API: http://127.0.0.1:8000/docs

Tahap: notes -> script -> audio -> words -> storyboard -> render.
Persetujuan: notes, script, audio, video. Mengubah tahap di depan membuat hasil di belakangnya "stale".
