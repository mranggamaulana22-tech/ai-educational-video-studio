"""Tes cepat alur backend TANPA memanggil AI (tahap diganti skrip palsu). Jalankan dari apps/backend:
    python -m tests.smoke_test
Memakai database SQLite sementara, jadi tidak menyentuh PostgreSQL-mu."""
import os
import sys
import tempfile
from pathlib import Path

tmp = Path(tempfile.mkdtemp())
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, db, stages  # noqa: E402

# Semua file kerja diarahkan ke folder sementara
config.ROOT = tmp
config.STORAGE = tmp / "storage"
config.REMOTION = tmp / "apps" / "remotion"
stages.R, stages.REM = config.ROOT, config.REMOTION

db.init("sqlite:///" + str(tmp / "t.db"))
from app.main import app  # noqa: E402


def fake_command(stage, video, day_label="", course=""):
    out = stages.paths(video.name)[stage]
    out.parent.mkdir(parents=True, exist_ok=True)
    if stage == "audio" and os.environ.get("FAIL_AUDIO"):
        return [sys.executable, "-c", "import sys; print('boom'); sys.exit(3)"], False, tmp
    code = f"from pathlib import Path; Path(r'{out}').write_text('hasil {stage} voice={video.voice}')"
    return [sys.executable, "-c", code], False, tmp


stages.build_command = fake_command
c = TestClient(app)


def check(cond, msg):
    print(("OK   " if cond else "GAGAL"), msg)
    if not cond:
        sys.exit(1)


s = c.post("/series", json={"name": "SDLC", "course": "Intro", "total_days": 15}).json()
v = c.post("/videos", json={"name": "tes-video", "day": 3, "series_id": s["id"], "voice": "Puck"}).json()
vid = v["id"]
check(v["stages"]["notes"]["status"] == "empty", "video baru: semua tahap kosong")

r = c.post(f"/videos/{vid}/run/script")
check(r.status_code == 409, "script tidak bisa jalan sebelum catatan ada")
c.put(f"/videos/{vid}/notes", json={"text": "catatan belajar"})
r = c.post(f"/videos/{vid}/run/script")
check(r.status_code == 200, "script jalan setelah catatan ada")
run = c.get(f"/runs/{r.json()['run_id']}").json()
check(run["status"] == "ok", "run script berhasil (latar belakang selesai)")

r = c.post(f"/videos/{vid}/run/audio")
check(r.status_code == 409, "audio ditolak sebelum naskah disetujui")
c.post(f"/videos/{vid}/approve/script")
run = c.get(f"/runs/{c.post(f'/videos/{vid}/run/audio').json()['run_id']}").json()
check(run["status"] == "ok", "audio jalan setelah naskah disetujui")
check(Path(config.STORAGE / "tes-video/audio/v1.wav").exists(), "versi audio v1 disalin ke storage")
txt = Path(stages.paths("tes-video")["audio"]).read_text()
check("voice=Puck" in txt, "pilihan narator (voice) diteruskan ke tahap audio")

c.post(f"/videos/{vid}/approve/audio")
st = c.get(f"/videos/{vid}").json()["stages"]
check(st["audio"]["status"] == "approved", "audio disetujui")

c.put(f"/videos/{vid}/script", json={"text": "naskah diedit tangan"})
st = c.get(f"/videos/{vid}").json()["stages"]
check(st["script"]["version"] == 2 and st["script"]["source"] == "manual", "edit naskah = versi 2 (manual)")
check(st["audio"]["status"] == "stale", "audio jadi USANG setelah naskah diubah")
check(c.post(f"/videos/{vid}/approve/audio").status_code == 409, "audio usang tidak bisa disetujui")
check(c.post(f"/videos/{vid}/run/words").status_code == 409, "tahap words ditolak (audio belum disetujui ulang)")

os.environ["FAIL_AUDIO"] = "1"
c.post(f"/videos/{vid}/approve/script")
run = c.get(f"/runs/{c.post(f'/videos/{vid}/run/audio').json()['run_id']}").json()
check(run["status"] == "failed" and "boom" in run["log"], "tahap gagal tercatat lengkap dengan log")
check(c.get(f"/videos/{vid}").json()["stages"]["audio"]["version"] == 1, "gagal tidak membuat versi baru")
del os.environ["FAIL_AUDIO"]

stages.paths("lama")["script"].parent.mkdir(parents=True, exist_ok=True)
stages.paths("lama")["script"].write_text("naskah lama")
v2 = c.post("/videos", json={"name": "lama"}).json()
res = c.post(f"/videos/{v2['id']}/scan").json()
check(res["registered"] == ["script"], "scan mendaftarkan file yang sudah ada")
check(len(c.get(f"/videos/{vid}/artifacts").json()) == 4, "riwayat versi tersimpan (notes v1, script v1+v2, audio v1)")
print("\nSEMUA TES LOLOS")
