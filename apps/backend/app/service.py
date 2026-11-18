"""Logika inti: versi hasil tahap, penandaan usang, persetujuan, dan menjalankan tahap."""
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
    if not art:
        raise ValueError(f"Belum ada hasil tahap '{stage}' untuk disetujui.")
    if art.status == "stale":
        raise ValueError(f"Hasil tahap '{stage}' sudah usang (ada perubahan di tahap sebelumnya). Jalankan ulang dulu.")
    art.status = "approved"
    art.approved_at = now()
    session.commit()
    return art


def can_run(session: Session, video: Video, stage: str):
    """Kembalikan pesan alasan bila tahap belum boleh dijalankan, atau '' bila boleh."""
    if stage in stages.MANUAL:
        return f"Tahap '{stage}' dikerjakan manual (isi catatan lewat PUT /videos/{{id}}/notes)."
    idx = stages.ORDER.index(stage)
    prev = stages.ORDER[idx - 1]
    if not latest(session, video.id, prev):
        return f"Tahap sebelumnya ('{prev}') belum ada hasilnya."
    need = stages.REQUIRES_APPROVAL.get(stage)
    if need:
        a = latest(session, video.id, stages.APPROVAL_POINTS[need])
        if not a or a.status != "approved":
            return f"Titik persetujuan '{need}' belum disetujui."
    return ""


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


def scan_existing(session: Session, video: Video):
    """Daftarkan file yang sudah ada di lokasi kerja (mis. hasil pipeline.py) sebagai versi 'imported'."""
    found = []
    for stage, path in stages.paths(video.name).items():
        if path.exists() and not latest(session, video.id, stage):
            register_artifact(session, video, stage, source="imported")
            found.append(stage)
    return found


def stage_is_auto(stage):
    return stage not in stages.MANUAL


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
