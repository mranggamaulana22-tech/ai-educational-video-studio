"""Logika inti: versi hasil tahap, penandaan usang, persetujuan, dan orchestrator tahap."""
import json
import shutil
import subprocess
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config, stages
from .models import Artifact, Run, Video


def now():
    return datetime.now(timezone.utc)


def latest(session: Session, video_id: int, stage: str):
    return session.scalars(
        select(Artifact).where(Artifact.video_id == video_id, Artifact.stage == stage).order_by(Artifact.version.desc())
    ).first()


def register_artifact(session: Session, video: Video, stage: str, source="auto"):
    """Simpan file kerja tahap ini sebagai versi baru (disalin ke storage), lalu tandai tahap berikutnya usang."""
    src = stages.paths(video.name)[stage]
    if not src.exists():
        raise FileNotFoundError(f"File hasil tahap '{stage}' tidak ada: {src}")
    prev = latest(session, video.id, stage)
    version = (prev.version + 1) if prev else 1
    dest = config.STORAGE / video.name / stage / f"v{version}{src.suffix}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    art = Artifact(video_id=video.id, stage=stage, version=version, path=str(dest), source=source)
    session.add(art)
    mark_downstream_stale(session, video.id, stage)
    session.commit()
    return art


def mark_downstream_stale(session: Session, video_id: int, stage: str):
    """Tahap setelah 'stage' yang sudah punya hasil menjadi usang (persetujuannya ikut dicabut)."""
    for s in stages.ORDER[stages.ORDER.index(stage) + 1 :]:
        a = latest(session, video_id, s)
        if a and a.status != "stale":
            a.status = "stale"
            a.approved_at = None


def approve(session: Session, video: Video, point: str):
    if point not in stages.APPROVAL_POINTS:
        raise ValueError(f"Titik persetujuan tidak dikenal: {point}")
    stage = stages.APPROVAL_POINTS[point]
    art = latest(session, video.id, stage)
    # Kompatibilitas mundur: jika 'review' belum ada tapi 'script' sudah ada (mis. alur manual/legacy), setujui 'script'.
    if not art and point == "script":
        stage = "script"
        art = latest(session, video.id, stage)
    if not art:
        raise ValueError(f"Belum ada hasil tahap '{stage}' untuk disetujui.")
    if art.status == "stale":
        raise ValueError(f"Hasil tahap '{stage}' sudah usang (ada perubahan di tahap sebelumnya). Jalankan ulang dulu.")
    art.status = "approved"
    art.approved_at = now()
    session.commit()
    return art


def _is_approved(session: Session, video_id: int, point: str) -> bool:
    target = stages.APPROVAL_POINTS[point]
    art = latest(session, video_id, target)
    if art and art.status == "approved":
        return True
    # Kompatibilitas mundur untuk titik 'script' bila memakai artifak 'script' langsung
    if point == "script":
        alt = latest(session, video_id, "script")
        return bool(alt and alt.status == "approved")
    return False


def can_run(session: Session, video: Video, stage: str):
    """Kembalikan pesan alasan bila tahap belum boleh dijalankan, atau '' bila boleh."""
    if stage in stages.MANUAL:
        return f"Tahap '{stage}' dikerjakan manual (isi materi lewat PUT /videos/{{id}}/material)."

    idx = stages.ORDER.index(stage)
    prev = stages.ORDER[idx - 1]
    prev_art = latest(session, video.id, prev)

    # Kompatibilitas mundur: jika ideas belum ada, script tetap boleh memakai notes langsung.
    if stage == "script" and not prev_art:
        prev = "notes"
        prev_art = latest(session, video.id, prev)

    # Kompatibilitas mundur: jika tahap 'review' belum ada tapi 'script' sudah disetujui langsung,
    # izinkan 'audio' memakai hasil 'script' secara langsung.
    if stage == "audio" and not prev_art:
        prev = "script"
        prev_art = latest(session, video.id, prev)

    if not prev_art or prev_art.status == "stale":
        return f"Tahap sebelumnya ('{prev}') belum siap atau sudah usang."

    need = stages.REQUIRES_APPROVAL.get(stage)
    if stage == "script" and not latest(session, video.id, "ideas"):
        # Legacy: sebelum tahap ideas ada, script cukup menunggu persetujuan notes.
        need = "notes"
    if need and not _is_approved(session, video.id, need):
        # Kompatibilitas mundur: jika notes diinput manual (PUT /notes), langsung izinkan script jalan.
        if need == "notes" and prev_art.source == "manual":
            return ""
        return f"Titik persetujuan '{need}' belum disetujui."

    return ""

def select_idea(session: Session, video: Video, index=0):
    """Pilih satu ide dari plan, simpan pilihannya, dan setujui titik approval ideas."""
    plan_path = stages.paths(video.name)["ideas"]
    if not plan_path.exists():
        raise ValueError("Rencana ide belum tersedia.")
    try:
        plan = json.loads(plan_path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Rencana ide tidak valid: {exc}") from exc
    videos = plan.get("videos") if isinstance(plan, dict) else None
    if not isinstance(videos, list) or not videos:
        raise ValueError("Rencana ide tidak memiliki daftar videos.")
    if not isinstance(index, int) or index < 0 or index >= len(videos):
        raise ValueError(f"Index ide harus antara 0 dan {len(videos) - 1}.")
    idea = videos[index]
    if not isinstance(idea, dict):
        raise ValueError("Data ide yang dipilih tidak valid.")

    art = latest(session, video.id, "ideas")
    if not art:
        raise ValueError("Artifact ideas belum terdaftar.")
    if art.status == "stale":
        raise ValueError("Rencana ide sudah usang. Jalankan ulang tahap ideas.")
    selected_path = stages.paths(video.name)["selected_idea"]
    selected_path.parent.mkdir(parents=True, exist_ok=True)
    selected_path.write_text(
        json.dumps({"index": index, "idea": idea}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    video.title = str(idea.get("title") or video.title)
    if index + 1 < len(videos) and isinstance(videos[index + 1], dict):
        video.next_topic = str(videos[index + 1].get("title") or "")
    else:
        video.next_topic = ""
    art.status = "approved"
    art.approved_at = now()
    session.commit()
    return idea


def execute_run(SessionLocal, run_id: int, day_label="", course=""):
    """Dijalankan di latar belakang: jalankan skrip tahap, simpan log, catat hasil sebagai versi baru."""
    with SessionLocal() as session:
        run = session.get(Run, run_id)
        video = session.get(Video, run.video_id)
        run.status, run.started_at = "running", now()
        session.commit()
        try:
            cmd, shell, cwd = stages.build_command(run.stage, video, day_label, course)
            proc = subprocess.run(
                cmd, cwd=str(cwd), shell=shell, capture_output=True, text=True, encoding="utf-8", errors="replace"
            )
            run.log = (proc.stdout + "\n" + proc.stderr).strip()[-20000:]
            if proc.returncode != 0:
                run.status = "failed"
            else:
                art = register_artifact(session, video, run.stage)
                run.status, run.artifact_id = "ok", art.id
        except Exception as e:  # noqa: BLE001
            run.status = "failed"
            run.log = (run.log or "") + f"\n[ERROR] {e}"
        run.finished_at = now()
        session.commit()


def advance_workflow(SessionLocal, video_id: int, day_label="", course=""):
    """Orchestrator: jalankan berurutan semua tahap otomatis yang siap sampai berhenti di approval gate / selesai."""
    executed_runs = []
    while True:
        with SessionLocal() as session:
            video = session.get(Video, video_id)
            if not video:
                break
            next_stage = None
            for s in stages.ORDER:
                if s in stages.MANUAL:
                    continue
                art = latest(session, video.id, s)
                if (not art or art.status == "stale") and not can_run(session, video, s):
                    next_stage = s
                    break
            if not next_stage:
                break
            if next_stage == "notes" and not stages.paths(video.name)["session"].exists():
                break
            run = Run(video_id=video.id, stage=next_stage)
            session.add(run)
            session.commit()
            run_id = run.id

        execute_run(SessionLocal, run_id, day_label, course)
        with SessionLocal() as session:
            done = session.get(Run, run_id)
            executed_runs.append({"id": done.id, "stage": done.stage, "status": done.status})
            if done.status != "ok":
                break
    return executed_runs


def scan_existing(session: Session, video: Video):
    """Daftarkan file yang sudah ada di lokasi kerja (mis. hasil pipeline.py) sebagai versi 'imported'."""
    found = []
    for stage, path in stages.paths(video.name).items():
        if stage in stages.ORDER and path.exists() and not latest(session, video.id, stage):
            register_artifact(session, video, stage, source="imported")
            found.append(stage)
    return found


def stage_is_auto(stage):
    return stage not in stages.MANUAL


def waiting_approval_point(session: Session, video: Video):
    """Kembalikan nama titik persetujuan yang sedang menunggu manusia, atau None."""
    for point, target_stage in stages.APPROVAL_POINTS.items():
        art = latest(session, video.id, target_stage)
        if art and art.status == "draft":
            return point
    return None


def waiting_approval_detail(session: Session, video: Video):
    point = waiting_approval_point(session, video)
    reason = ""
    if point == "script":
        review_path = stages.paths(video.name)["review_json"]
        if review_path.exists():
            try:
                review = json.loads(review_path.read_text(encoding="utf-8-sig"))
            except (OSError, json.JSONDecodeError):
                review = {}
            if review.get("verdict") == "revise":
                reason = "belum lolos review"
    return {"waiting_approval": point, "waiting_approval_reason": reason}


def summary(session: Session, video: Video):
    out = {}
    for s in stages.ORDER:
        why = can_run(session, video, s)
        a = latest(session, video.id, s)
        r = session.scalars(select(Run).where(Run.video_id == video.id, Run.stage == s).order_by(Run.id.desc())).first()
        out[s] = {
            "artifact_id": a.id if a else None,
            "version": a.version if a else None,
            "status": a.status if a else "empty",
            "source": a.source if a else None,
            "can_run": (not why) if stage_is_auto(s) else False,
            "why_not": why if stage_is_auto(s) else "",
            "last_run": {"id": r.id, "status": r.status} if r else None,
        }
    return out