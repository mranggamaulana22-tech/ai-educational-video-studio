"""API backend AI Educational Video Studio. Jalankan:  uvicorn app.main:app --reload  (dari apps/backend)"""
from contextlib import asynccontextmanager
import io
import json
from pathlib import Path
import subprocess
import sys

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config, db, service, stages
from .models import Artifact, Run, Series, Video

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "tools"))
import agentkit  # noqa: E402
import llm  # noqa: E402


@asynccontextmanager
async def lifespan(app):
    if db.engine is None:
        db.init()
    yield


app = FastAPI(title="AI Educational Video Studio", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Suara bawaan Gemini TTS (pilihan narator)
VOICES = [
    "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede", "Callirrhoe", "Autonoe",
    "Enceladus", "Iapetus", "Umbriel", "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi",
    "Laomedeia", "Achernar", "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird",
    "Zubenelgenubi", "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
]
SAMPLE_TEXT = "Halo, aku narator videomu. Hari ini kita belajar tentang tahapan membuat software dari ide sampai siap dipakai."
TEXT_STAGES = ("material", "analysis", "notes", "ideas", "script", "review", "storyboard")


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


class SelectIdeaIn(BaseModel):
    index: int = 0


class TutorTurnIn(BaseModel):
    message: str


def get_video(session: Session, video_id: int) -> Video:
    v = session.get(Video, video_id)
    if not v:
        raise HTTPException(404, "Video tidak ditemukan")
    return v


def video_dict(session, v: Video):
    return {
        "id": v.id,
        "name": v.name,
        "title": v.title,
        "day": v.day,
        "series_id": v.series_id,
        "next_topic": v.next_topic,
        "voice": v.voice,
        "provider": v.provider,
        "model": v.model,
        **service.waiting_approval_detail(session, v),
        "stages": service.summary(session, v),
    }


def labels(session, v: Video):
    s = session.get(Series, v.series_id) if v.series_id else None
    return (f"HARI {v.day}/{s.total_days}" if s else f"HARI {v.day}"), (s.course if s else "")


def _read_tutor_sources(video: Video):
    p = stages.paths(video.name)
    if not p["material"].exists():
        raise HTTPException(409, "Materi belum tersedia.")
    if not p["analysis"].exists():
        raise HTTPException(409, "Analisis materi belum tersedia.")
    material = agentkit.read_text(str(p["material"]))
    analysis = json.loads(p["analysis"].read_text(encoding="utf-8-sig"))
    return p, material, analysis


def _thin_concept_ids(analysis: dict):
    ids = set()
    for item in analysis.get("needs_expansion", []) or []:
        if isinstance(item, dict) and item.get("concept_id"):
            ids.add(str(item["concept_id"]))
    for item in analysis.get("gaps", []) or []:
        text = str(item).lower()
        for concept in analysis.get("key_concepts", []) or []:
            if concept.get("name", "").lower() and concept["name"].lower() in text:
                ids.add(str(concept["id"]))
    return ids


def _initial_tutor_session(analysis: dict):
    thin_ids = _thin_concept_ids(analysis)
    concepts = []
    for concept in analysis.get("key_concepts", []) or []:
        if not isinstance(concept, dict):
            continue
        cid = str(concept.get("id", "")).strip()
        if not cid:
            continue
        concepts.append({
            "id": cid,
            "name": str(concept.get("name", cid)),
            "status": "belum",
            "is_thin": cid in thin_ids,
            "analogies": [],
            "unverified_notes": [],
        })
    return {
        "video_id": None,
        "ended": False,
        "summary": "",
        "concepts": concepts,
        "messages": [],
    }


def _ask_tutor_json(video: Video, material: str, analysis: dict, session_data: dict):
    system = (
        "Kamu adalah Tutor-Led untuk pembelajaran. Memimpin percakapan berdasarkan analysis.json: "
        "buka dengan peta singkat konsep dan tandai konsep tipis. Jelaskan satu konsep dengan analogi dan "
        "contoh kerja Software Engineer. Lempar maksimal satu pertanyaan cek pemahaman saat diperlukan, "
        "bukan kuis berat. Pengguna bebas menyela. Dilarang mengarang fakta di luar materi; tandai fakta tambahan "
        "sebagai unverified_facts. Balas HANYA JSON dengan schema: "
        '{"reply":"...","concept_updates":[{"id":"c1","status":"paham","new_analogies":[],"unverified_facts":[]}],'
        '"session_summary":"..."}'
    )
    payload = {
        "material": material,
        "analysis": analysis,
        "session": session_data,
    }
    try:
        result = agentkit.ask(
            video.provider,
            video.model or None,
            system,
            json.dumps(payload, ensure_ascii=False),
            lambda d: "" if isinstance(d, dict) and isinstance(d.get("reply"), str) else "Schema tutor tidak valid.",
        )
    except SystemExit as exc:
        raise HTTPException(502, str(exc)) from exc
    return result


def _save_tutor_session(p: dict, session_data: dict):
    p["session"].parent.mkdir(parents=True, exist_ok=True)
    p["session"].write_text(json.dumps(session_data, ensure_ascii=False, indent=2), encoding="utf-8")


def _apply_tutor_updates(session_data: dict, result: dict):
    by_id = {str(c["id"]): c for c in session_data.get("concepts", [])}
    for update in result.get("concept_updates", []) or []:
        if not isinstance(update, dict):
            continue
        concept = by_id.get(str(update.get("id", "")))
        if not concept:
            continue
        if update.get("status") in {"belum", "sebagian", "paham"}:
            concept["status"] = update["status"]
        for analogy in update.get("new_analogies", []) or []:
            if analogy and analogy not in concept["analogies"]:
                concept["analogies"].append(str(analogy))
        for fact in update.get("unverified_facts", []) or []:
            if fact and fact not in concept["unverified_notes"]:
                concept["unverified_notes"].append(str(fact))
    session_data["summary"] = str(result.get("session_summary") or session_data.get("summary") or "")


@app.get("/videos/{video_id}/tutor/session")
def get_tutor_session(video_id: int, session: Session = Depends(db.get_session)):
    video = get_video(session, video_id)
    p, material, analysis = _read_tutor_sources(video)
    if p["session"].exists():
        try:
            session_data = json.loads(p["session"].read_text(encoding="utf-8-sig"))
        except (OSError, json.JSONDecodeError):
            session_data = None
    else:
        session_data = None
    if not session_data:
        session_data = _initial_tutor_session(analysis)
        session_data["video_id"] = video_id
        result = _ask_tutor_json(video, material, analysis, session_data)
        _apply_tutor_updates(session_data, result)
        session_data["messages"].append({
            "role": "tutor",
            "text": str(result.get("reply", "")),
            "verifikasi_tags": [
                fact for concept in session_data["concepts"] for fact in concept["unverified_notes"]
            ],
        })
        _save_tutor_session(p, session_data)
    return session_data


@app.post("/videos/{video_id}/tutor/turn")
def tutor_turn(video_id: int, body: TutorTurnIn, session: Session = Depends(db.get_session)):
    video = get_video(session, video_id)
    p, material, analysis = _read_tutor_sources(video)
    if not body.message.strip():
        raise HTTPException(400, "Pesan tidak boleh kosong.")
    session_data = get_tutor_session(video_id, session)
    session_data["messages"].append({"role": "user", "text": body.message.strip(), "verifikasi_tags": []})
    result = _ask_tutor_json(video, material, analysis, session_data)
    _apply_tutor_updates(session_data, result)
    session_data["messages"].append({
        "role": "tutor",
        "text": str(result.get("reply", "")),
        "verifikasi_tags": [
            fact for concept in session_data["concepts"] for fact in concept["unverified_notes"]
        ],
    })
    _save_tutor_session(p, session_data)
    return session_data


@app.post("/videos/{video_id}/tutor/finish")
def finish_tutor_session(video_id: int, tasks: BackgroundTasks, session: Session = Depends(db.get_session)):
    video = get_video(session, video_id)
    p, _material, _analysis = _read_tutor_sources(video)
    session_data = get_tutor_session(video_id, session)
    session_data["ended"] = True
    _save_tutor_session(p, session_data)

    busy = session.scalars(select(Run).where(Run.video_id == video.id, Run.status.in_(["queued", "running"]))).first()
    if busy:
        raise HTTPException(409, f"Tahap '{busy.stage}' masih berjalan (run {busy.id}).")
    why = service.can_run(session, video, "notes")
    if why:
        raise HTTPException(409, why)
    run = Run(video_id=video.id, stage="notes")
    session.add(run)
    session.commit()
    day_label, course = labels(session, video)
    tasks.add_task(service.execute_run, db.SessionLocal, run.id, day_label, course)
    return {"status": "queued", "session": session_data, "run_id": run.id}


@app.post("/videos/{video_id}/tutor/reset")
def reset_tutor_session(video_id: int, session: Session = Depends(db.get_session)):
    video = get_video(session, video_id)
    p, material, analysis = _read_tutor_sources(video)
    session_data = _initial_tutor_session(analysis)
    session_data["video_id"] = video_id
    result = _ask_tutor_json(video, material, analysis, session_data)
    _apply_tutor_updates(session_data, result)
    session_data["messages"].append({
        "role": "tutor",
        "text": str(result.get("reply", "")),
        "verifikasi_tags": [],
    })
    _save_tutor_session(p, session_data)
    return session_data


@app.get("/voices")
def voices():
    return VOICES


@app.get("/voices/{voice}/sample")
def voice_sample(voice: str):
    """Contoh suara narator (dibuat sekali dengan Gemini TTS lalu disimpan)."""
    if voice not in VOICES:
        raise HTTPException(404, "Suara tidak dikenal")
    out = config.STORAGE / "voice-samples" / f"{voice}.wav"
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        txt = out.with_suffix(".txt")
        txt.write_text(SAMPLE_TEXT, encoding="utf-8")
        r = subprocess.run(
            [sys.executable, "tools/tts_gemini.py", str(txt), str(out), "--voice", voice],
            cwd=str(config.ROOT), capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
        if r.returncode != 0 or not out.exists():
            raise HTTPException(502, "Gagal membuat contoh suara: " + (r.stdout + r.stderr).strip()[-400:])
    return FileResponse(out, media_type="audio/wav")


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


@app.put("/videos/{video_id}/material")
def put_material(video_id: int, body: TextIn, session: Session = Depends(db.get_session)):
    """Simpan materi mentah sebagai pemicu awal alur otomatis (material -> analysis -> notes)."""
    return _save_text(session, get_video(session, video_id), "material", body.text)


def _extract_material_text(filename: str, raw: bytes) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext in {".txt", ".md"}:
        return raw.decode("utf-8", errors="replace").strip()
    if ext == ".docx":
        import docx

        doc = docx.Document(io.BytesIO(raw))
        parts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text.strip()]
                if cells:
                    parts.append(" | ".join(cells))
        return "\n\n".join(parts).strip()
    if ext == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(raw))
        pages = [(page.extract_text() or "").strip() for page in reader.pages]
        return "\n\n".join(p for p in pages if p).strip()
    raise HTTPException(
        400,
        f"Format file '{ext or 'tanpa ekstensi'}' belum didukung. Gunakan .docx, .pdf, .txt, atau .md.",
    )


@app.post("/videos/{video_id}/material/upload")
async def upload_material(
    video_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(db.get_session),
):
    """Unggah dokumen (.docx, .pdf, .txt, .md), ekstrak teksnya, dan simpan sebagai artifak material baru."""
    video = get_video(session, video_id)
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "File yang diunggah kosong.")
    extracted = _extract_material_text(file.filename or "", raw)
    if not extracted:
        raise HTTPException(400, "Tidak ada teks yang dapat diekstrak dari dokumen tersebut.")
    return _save_text(session, video, "material", extracted)


@app.put("/videos/{video_id}/notes")
def put_notes(video_id: int, body: TextIn, session: Session = Depends(db.get_session)):
    return _save_text(session, get_video(session, video_id), "notes", body.text)


@app.put("/videos/{video_id}/ideas")
def put_ideas(video_id: int, body: TextIn, session: Session = Depends(db.get_session)):
    return _save_text(session, get_video(session, video_id), "ideas", body.text)


@app.post("/videos/{video_id}/select-idea")
def select_idea(video_id: int, body: SelectIdeaIn, session: Session = Depends(db.get_session)):
    v = get_video(session, video_id)
    try:
        idea = service.select_idea(session, v, body.index)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    return {"selected": idea, "video": video_dict(session, v)}


@app.put("/videos/{video_id}/script")
def put_script(video_id: int, body: TextIn, session: Session = Depends(db.get_session)):
    """Edit naskah manual: jadi versi baru, hasil tahap setelahnya ditandai usang."""
    return _save_text(session, get_video(session, video_id), "script", body.text)


@app.get("/videos/{video_id}/text/{stage}")
def get_text(video_id: int, stage: str, session: Session = Depends(db.get_session)):
    if stage not in TEXT_STAGES:
        raise HTTPException(400, f"Hanya mendukung tahap teks: {', '.join(TEXT_STAGES)}")
    a = service.latest(session, video_id, stage)
    if not a:
        raise HTTPException(404, "Belum ada")
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


@app.post("/videos/{video_id}/advance")
def advance_video(video_id: int, tasks: BackgroundTasks, session: Session = Depends(db.get_session)):
    """Orchestrator: jalankan seluruh tahap otomatis berikutnya sampai menyentuh titik approval manusia."""
    v = get_video(session, video_id)
    busy = session.scalars(select(Run).where(Run.video_id == v.id, Run.status.in_(["queued", "running"]))).first()
    if busy:
        raise HTTPException(409, f"Tahap '{busy.stage}' masih berjalan (run {busy.id}).")
    day_label, course = labels(session, v)
    tasks.add_task(service.advance_workflow, db.SessionLocal, v.id, day_label, course)
    return {"status": "advancing", "video_id": v.id}


@app.get("/videos/{video_id}/runs")
def video_runs(video_id: int, session: Session = Depends(db.get_session)):
    get_video(session, video_id)
    rows = session.scalars(select(Run).where(Run.video_id == video_id).order_by(Run.id.desc()).limit(20))
    return [{"id": r.id, "stage": r.stage, "status": r.status, "log": r.log,
             "started_at": r.started_at.isoformat() if r.started_at else None} for r in rows]


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