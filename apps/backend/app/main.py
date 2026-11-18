"""API backend AI Educational Video Studio. Jalankan:  uvicorn app.main:app --reload  (dari apps/backend)"""
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import db, service, stages
from .models import Artifact, Run, Series, Video


@asynccontextmanager
async def lifespan(app):
    if db.engine is None:
        db.init()
    yield


app = FastAPI(title="AI Educational Video Studio", lifespan=lifespan)


class SeriesIn(BaseModel):
    name: str
    course: str = ""
    total_days: int = 15


class VideoIn(BaseModel):
    name: str  # slug, dipakai sebagai nama file
    title: str = ""
    day: int = 1
    series_id: int | None = None
    next_topic: str = ""
    voice: str = "Kore"
    provider: str = "gemini"
    model: str = ""


class VideoPatch(BaseModel):
    title: str | None = None
    day: int | None = None
    next_topic: str | None = None
    voice: str | None = None
    provider: str | None = None
    model: str | None = None


class TextIn(BaseModel):
    text: str


def get_video(session: Session, video_id: int) -> Video:
    v = session.get(Video, video_id)
    if not v:
        raise HTTPException(404, "Video tidak ditemukan")
    return v


def video_dict(session, v: Video):
    return {
        "id": v.id, "name": v.name, "title": v.title, "day": v.day, "series_id": v.series_id,
        "next_topic": v.next_topic, "voice": v.voice, "provider": v.provider, "model": v.model,
        "stages": service.summary(session, v),
    }


def labels(session, v: Video):
    s = session.get(Series, v.series_id) if v.series_id else None
    return (f"HARI {v.day}/{s.total_days}" if s else f"HARI {v.day}"), (s.course if s else "")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/series")
def create_series(body: SeriesIn, session: Session = Depends(db.get_session)):
    if session.scalars(select(Series).where(Series.name == body.name)).first():
        raise HTTPException(409, "Nama seri sudah ada")
    s = Series(**body.model_dump())
    session.add(s)
    session.commit()
    return {"id": s.id, **body.model_dump()}


@app.get("/series")
def list_series(session: Session = Depends(db.get_session)):
    return [{"id": s.id, "name": s.name, "course": s.course, "total_days": s.total_days} for s in session.scalars(select(Series))]


@app.post("/videos")
def create_video(body: VideoIn, session: Session = Depends(db.get_session)):
    if session.scalars(select(Video).where(Video.name == body.name)).first():
        raise HTTPException(409, "Nama video sudah ada")
    v = Video(**body.model_dump())
    session.add(v)
    session.commit()
    return video_dict(session, v)


@app.get("/videos")
def list_videos(session: Session = Depends(db.get_session)):
    return [video_dict(session, v) for v in session.scalars(select(Video).order_by(Video.day, Video.id))]


@app.get("/videos/{video_id}")
def read_video(video_id: int, session: Session = Depends(db.get_session)):
    return video_dict(session, get_video(session, video_id))


@app.patch("/videos/{video_id}")
def patch_video(video_id: int, body: VideoPatch, session: Session = Depends(db.get_session)):
    v = get_video(session, video_id)
    for k, val in body.model_dump(exclude_none=True).items():
        setattr(v, k, val)
    session.commit()
    return video_dict(session, v)


@app.post("/videos/{video_id}/scan")
def scan(video_id: int, session: Session = Depends(db.get_session)):
    """Daftarkan file yang sudah ada (mis. dari pipeline.py) ke database."""
    v = get_video(session, video_id)
    return {"registered": service.scan_existing(session, v), "video": video_dict(session, v)}


def _save_text(session, v: Video, stage: str, text: str):
    path = stages.paths(v.name)[stage]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.strip() + "\n", encoding="utf-8")
    art = service.register_artifact(session, v, stage, source="manual")
    return {"stage": stage, "version": art.version, "video": video_dict(session, v)}


@app.put("/videos/{video_id}/notes")
def put_notes(video_id: int, body: TextIn, session: Session = Depends(db.get_session)):
    return _save_text(session, get_video(session, video_id), "notes", body.text)


@app.put("/videos/{video_id}/script")
def put_script(video_id: int, body: TextIn, session: Session = Depends(db.get_session)):
    """Edit naskah manual: jadi versi baru, hasil tahap setelahnya (suara dst.) ditandai usang."""
    return _save_text(session, get_video(session, video_id), "script", body.text)


@app.get("/videos/{video_id}/text/{stage}")
def get_text(video_id: int, stage: str, session: Session = Depends(db.get_session)):
    if stage not in ("notes", "script"):
        raise HTTPException(400, "Hanya notes atau script")
    a = service.latest(session, video_id, stage)
    if not a:
        raise HTTPException(404, "Belum ada")
    from pathlib import Path

    return {"version": a.version, "status": a.status, "text": Path(a.path).read_text(encoding="utf-8")}


@app.post("/videos/{video_id}/run/{stage}")
def run_stage(video_id: int, stage: str, tasks: BackgroundTasks, session: Session = Depends(db.get_session)):
    if stage not in stages.ORDER:
        raise HTTPException(400, f"Tahap tidak dikenal: {stage}")
    v = get_video(session, video_id)
    why = service.can_run(session, v, stage)
    if why:
        raise HTTPException(409, why)
    busy = session.scalars(select(Run).where(Run.video_id == v.id, Run.status.in_(["queued", "running"]))).first()
    if busy:
        raise HTTPException(409, f"Tahap '{busy.stage}' masih berjalan (run {busy.id}).")
    run = Run(video_id=v.id, stage=stage)
    session.add(run)
    session.commit()
    day_label, course = labels(session, v)
    tasks.add_task(service.execute_run, db.SessionLocal, run.id, day_label, course)
    return {"run_id": run.id, "status": "queued"}


@app.get("/runs/{run_id}")
def read_run(run_id: int, session: Session = Depends(db.get_session)):
    r = session.get(Run, run_id)
    if not r:
        raise HTTPException(404, "Run tidak ditemukan")
    return {"id": r.id, "video_id": r.video_id, "stage": r.stage, "status": r.status, "artifact_id": r.artifact_id, "log": r.log}


@app.post("/videos/{video_id}/approve/{point}")
def approve_point(video_id: int, point: str, session: Session = Depends(db.get_session)):
    v = get_video(session, video_id)
    try:
        art = service.approve(session, v, point)
    except ValueError as e:
        raise HTTPException(409, str(e))
    return {"point": point, "stage": art.stage, "version": art.version, "video": video_dict(session, v)}


@app.get("/videos/{video_id}/artifacts")
def artifacts(video_id: int, session: Session = Depends(db.get_session)):
    get_video(session, video_id)
    rows = session.scalars(select(Artifact).where(Artifact.video_id == video_id).order_by(Artifact.stage, Artifact.version))
    return [{"id": a.id, "stage": a.stage, "version": a.version, "status": a.status, "source": a.source,
             "created_at": a.created_at.isoformat()} for a in rows]


@app.get("/artifacts/{artifact_id}/file")
def artifact_file(artifact_id: int, session: Session = Depends(db.get_session)):
    a = session.get(Artifact, artifact_id)
    if not a:
        raise HTTPException(404, "Tidak ditemukan")
    return FileResponse(a.path)
