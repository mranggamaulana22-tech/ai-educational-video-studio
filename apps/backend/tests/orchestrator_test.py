"""Tes alur penuh Workflow Orchestrator v1.3 (material -> analysis -> notes -> script -> review -> audio -> words -> storyboard -> render).
Jalankan dari apps/backend:
    python -m tests.orchestrator_test
"""
import sys
import tempfile
import json
from pathlib import Path

tmp = Path(tempfile.mkdtemp())
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, db, stages  # noqa: E402

config.ROOT = tmp
config.STORAGE = tmp / "storage"
config.REMOTION = tmp / "apps" / "remotion"
stages.R, stages.REM = config.ROOT, config.REMOTION

db.init("sqlite:///" + str(tmp / "orch.db"))
from app.main import app  # noqa: E402


def fake_command(stage, video, day_label="", course=""):
    out = stages.paths(video.name)[stage]
    out.parent.mkdir(parents=True, exist_ok=True)
    if stage == "ideas":
        out.write_text(
            json.dumps(
                {
                    "series": "Seri Tes",
                    "videos": [
                        {
                            "day": 1,
                            "title": "Ide Tes",
                            "format": "concept_breakdown",
                            "hook": "Ini hook tes",
                            "topics": ["Materi Utama"],
                        }
                    ],
                }
            )
        )
        return [sys.executable, "-c", "pass"], False, tmp
    code = f"from pathlib import Path; Path(r'{out}').write_text('hasil {stage}')"
    return [sys.executable, "-c", code], False, tmp


stages.build_command = fake_command
c = TestClient(app)


def check(cond, msg):
    print(("OK   " if cond else "GAGAL"), msg)
    if not cond:
        sys.exit(1)


v = c.post("/videos", json={"name": "full-v13", "title": "SDLC Lengkap", "day": 1}).json()
vid = v["id"]

# 1. Input materi mentah -> advance otomatis menjalankan analysis lalu berhenti di depan Notes
c.put(f"/videos/{vid}/material", json={"text": "SDLC adalah siklus hidup pengembangan perangkat lunak."})
c.post(f"/videos/{vid}/advance")
st = c.get(f"/videos/{vid}").json()
check(st["stages"]["analysis"]["status"] == "draft", "analysis otomatis selesai")
check(st["stages"]["notes"]["status"] == "empty", "notes belum jalan sebelum sesi Tutor dibuat")
check(st["waiting_approval"] is None, "advance berhenti di depan Notes, bukan di approval gate")

# 2. Membuat session Tutor -> advance menjalankan notes lalu berhenti di gate 'notes'
p = stages.paths("full-v13")
p["session"].parent.mkdir(parents=True, exist_ok=True)
p["session"].write_text(
    json.dumps({"video_id": vid, "ended": True, "summary": "Sesi Tutor selesai", "concepts": [], "messages": []}),
    encoding="utf-8",
)
c.post(f"/videos/{vid}/advance")
st = c.get(f"/videos/{vid}").json()
check(st["stages"]["notes"]["status"] == "draft", "notes otomatis selesai setelah sesi Tutor")
check(st["waiting_approval"] == "notes", "orchestrator berhenti di titik persetujuan notes")
check(st["stages"]["script"]["status"] == "empty", "script belum jalan sebelum notes disetujui")

# 3. Approve notes -> advance otomatis menjalankan ideas lalu berhenti di gate 'ideas'
c.post(f"/videos/{vid}/approve/notes")
c.post(f"/videos/{vid}/advance")
st = c.get(f"/videos/{vid}").json()
check(st["stages"]["ideas"]["status"] == "draft", "content planner otomatis selesai")
check(st["stages"]["script"]["status"] == "empty", "script menunggu pemilihan ide")
check(st["waiting_approval"] == "ideas", "orchestrator berhenti di titik persetujuan ideas")
check(st["stages"]["audio"]["status"] == "empty", "audio belum jalan sebelum script disetujui")

# 3. Pilih ide -> advance otomatis menjalankan script + review lalu berhenti di gate 'script'
c.post(f"/videos/{vid}/select-idea", json={"index": 0})
c.post(f"/videos/{vid}/advance")
st = c.get(f"/videos/{vid}").json()
check(st["stages"]["script"]["status"] == "draft", "scriptwriter otomatis selesai")
check(st["stages"]["review"]["status"] == "draft", "script_reviewer otomatis selesai")
check(st["waiting_approval"] == "script", "orchestrator berhenti di titik persetujuan script (review)")
check(st["stages"]["audio"]["status"] == "empty", "audio belum jalan sebelum script disetujui")

# 4. Approve script -> advance otomatis menjalankan audio lalu berhenti di gate 'audio'
c.post(f"/videos/{vid}/approve/script")
c.post(f"/videos/{vid}/advance")
st = c.get(f"/videos/{vid}").json()
check(st["stages"]["audio"]["status"] == "draft", "audio TTS otomatis selesai")
check(st["waiting_approval"] == "audio", "orchestrator berhenti di titik persetujuan audio")

# 5. Approve audio -> advance otomatis menjalankan words + storyboard + render lalu berhenti di gate 'video'
c.post(f"/videos/{vid}/approve/audio")
c.post(f"/videos/{vid}/advance")
st = c.get(f"/videos/{vid}").json()
check(st["stages"]["words"]["status"] == "draft", "aligner words otomatis selesai")
check(st["stages"]["storyboard"]["status"] == "draft", "storyboard v1.3 otomatis selesai")
check(st["stages"]["render"]["status"] == "draft", "render video otomatis selesai")
check(st["waiting_approval"] == "video", "orchestrator berhenti di titik persetujuan akhir video")

# 6. Approve video -> selesai penuh
c.post(f"/videos/{vid}/approve/video")
st = c.get(f"/videos/{vid}").json()
check(st["waiting_approval"] is None and st["stages"]["render"]["status"] == "approved", "seluruh alur 10 tahap & 5 approval selesai")
print("\nSEMUA TES ORCHESTRATOR LOLOS")