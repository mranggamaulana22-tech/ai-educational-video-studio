"""Koordinator interaktif ringan untuk Leader Felisa."""

import json
import re
import sys
from pathlib import Path

from sqlalchemy import select

from . import config, db, service, stages
from .events import emit_studio_event
from .models import Artifact, Run, Video

sys.path.insert(0, str(config.ROOT / "tools"))
import llm  # noqa: E402


PIPELINE_STAGES = stages.ORDER
APPROVAL_POINTS = ("notes", "ideas", "script", "audio", "video")


def _video_title(video):
    return video.title or video.name


def _latest_run(session, video_id, stage):
    return session.scalars(
        select(Run)
        .where(Run.video_id == video_id, Run.stage == stage)
        .order_by(Run.id.desc())
    ).first()


def build_studio_brief(session):
    videos = list(session.scalars(select(Video).order_by(Video.day, Video.id)))
    waiting = []
    ready = []
    failed = []
    running = []

    for video in videos:
        for point, stage in stages.APPROVAL_POINTS.items():
            artifact = session.scalars(
                select(Artifact)
                .where(Artifact.video_id == video.id, Artifact.stage == stage)
                .order_by(Artifact.version.desc())
            ).first()
            if artifact and artifact.status == "draft":
                waiting.append({"video_id": video.id, "title": _video_title(video), "approval_point": point})
                break

        if waiting and waiting[-1]["video_id"] == video.id:
            continue

        last_run = session.scalars(
            select(Run).where(Run.video_id == video.id).order_by(Run.id.desc())
        ).first()
        if last_run and last_run.status in ("queued", "running"):
            running.append({"video_id": video.id, "title": _video_title(video), "stage": last_run.stage})
        elif last_run and last_run.status == "failed":
            failed.append({"video_id": video.id, "title": _video_title(video), "stage": last_run.stage})
        else:
            ready.append({"video_id": video.id, "title": _video_title(video)})

    if not videos:
        reply = "Belum ada proyek aktif. Kamu bisa membuat proyek baru sebelum Felisa mengarahkan tahap berikutnya."
    elif waiting:
        names = ", ".join(f"{item['title']} ({item['approval_point']})" for item in waiting)
        reply = f"Ada {len(waiting)} proyek menunggu persetujuan: {names}. Saya siap membuka titik approval yang paling dekat."
    elif running:
        names = ", ".join(f"{item['title']} - {item['stage']}" for item in running)
        reply = f"Saat ini ada {len(running)} proses berjalan: {names}. Saya terus memantau hasilnya."
    elif failed:
        names = ", ".join(f"{item['title']} - {item['stage']}" for item in failed)
        reply = f"Ada {len(failed)} proses yang gagal: {names}. Buka tahap terkait untuk meninjau log."
    else:
        reply = f"{len(videos)} proyek aktif siap dipantau. Tidak ada persetujuan atau kegagalan yang tertunda."

    return {
        "reply": reply,
        "project_count": len(videos),
        "waiting_approval": waiting,
        "running": running,
        "failed": failed,
        "ready": ready,
        "projects": [{"id": v.id, "name": v.name, "title": _video_title(v)} for v in videos],
    }


def _active_video(session, active_video_id):
    if active_video_id:
        video = session.get(Video, int(active_video_id))
        if video:
            return video
    return session.scalars(select(Video).order_by(Video.day, Video.id)).first()


def _base_payload(reply, intent, video_id=None, stage="", approval_point="", project_title="", requires_confirmation=False):
    return {
        "reply": reply,
        "intent": intent,
        "video_id": video_id,
        "stage": stage,
        "approval_point": approval_point,
        "project_title": project_title,
        "requires_confirmation": requires_confirmation,
    }


def interpret_command(session, text, active_video_id=None):
    text = (text or "").strip()
    lowered = text.lower()
    brief = build_studio_brief(session)
    video = _active_video(session, active_video_id)
    video_id = video.id if video else None
    title = _video_title(video) if video else ""

    if re.search(r"\b(status|ringkas|ringkasan|laporan)\b", lowered):
        return _base_payload(brief["reply"], "status", video_id, project_title=title)

    if re.search(r"\b(gudang|storage|arsip)\b", lowered):
        return _base_payload("Aku buka Gudang agar kamu bisa meninjau proyek, arsip, dan versi hasil.", "open_storage", video_id, project_title=title)

    if re.search(r"\btutor\b", lowered):
        return _base_payload("Aku arahkan kamu ke Sesi Belajar Tutor pada tahap Notes.", "open_tutor", video_id, stage="notes", project_title=title)

    if re.search(r"\b(setujui|approve|approval)\b", lowered):
        waiting = brief["waiting_approval"]
        point = waiting[0]["approval_point"] if waiting else ""
        if not point:
            return _base_payload("Belum ada titik persetujuan yang menunggu. Periksa dulu status proyek.", "status", video_id, project_title=title)
        stage = stages.APPROVAL_POINTS[point]
        return _base_payload(
            f"Konfirmasi persetujuan {point} untuk \"{waiting[0]['title']}\"?",
            "approve",
            waiting[0]["video_id"],
            stage=stage,
            approval_point=point,
            project_title=waiting[0]["title"],
            requires_confirmation=True,
        )

    if re.search(r"\b(lanjut|lanjutkan|advance)\b", lowered):
        target_id = video_id
        target_title = title
        return _base_payload(
            f"Konfirmasi lanjutkan orkestrator untuk \"{target_title}\"?",
            "advance",
            target_id,
            project_title=target_title,
            requires_confirmation=True,
        )

    jalankan = re.search(r"\bjalankan\s+(material|analysis|notes|ideas|script|review|audio|words|storyboard|render)\b", lowered)
    if jalankan:
        stage_name = jalankan.group(1)
        return _base_payload(
            f"Konfirmasi jalankan tahap {stage_name} untuk \"{title}\"?",
            "run_stage",
            video_id,
            stage=stage_name,
            project_title=title,
            requires_confirmation=True,
        )

    if re.search(r"\b(buat|buatkan|create)\b.*\b(proyek|project|video)\b", lowered):
        project_title = re.sub(r"\b(buat|buatkan|create|proyek|project|video)\b", "", lowered).strip(" :-")
        project_name = re.sub(r"[^a-z0-9]+", "-", project_title).strip("-") if project_title else ""
        return _base_payload(
            "Pembuatan proyek perlu dikonfirmasi beserta nama proyek yang akan dibuat.",
            "create_project",
            project_title=project_title,
            requires_confirmation=True,
        )

    # Fallback LLM hanya bila provider dan API key tersedia.
    try:
        provider = video.provider if video else "gemini"
        model = video.model or None if video else None
        prompt_path = config.ROOT / "prompts" / "leader_felisa" / "v1.md"
        system = prompt_path.read_text(encoding="utf-8-sig")
        reply = llm.generate_json(
            provider,
            system,
            [("user", json.dumps({"command": text, "brief": brief, "active_video_id": active_video_id}, ensure_ascii=False))],
            model,
        )
        payload = json.loads(reply)
        if not isinstance(payload, dict):
            raise ValueError
        payload.setdefault("reply", "Saya masih meninjau perintah itu.")
        payload.setdefault("intent", "unknown")
        payload.setdefault("video_id", video_id)
        payload.setdefault("stage", "")
        payload.setdefault("approval_point", "")
        payload.setdefault("project_title", title)
        payload.setdefault("requires_confirmation", False)
        if payload["intent"] in ("advance", "run_stage", "create_project"):
            payload["requires_confirmation"] = True
        return payload
    except Exception:
        return _base_payload(
            "Saya belum mengenali perintah itu. Coba: Status proyek, Lanjutkan tahap, Setujui, Tutor, Gudang, atau Jalankan analysis.",
            "unknown",
            video_id,
            project_title=title,
        )


def execute_action(session, tasks, action_payload):
    action = action_payload.get("action") or action_payload.get("intent")
    video_id = action_payload.get("video_id")

    if action == "advance":
        if not video_id:
            raise ValueError("advance membutuhkan video_id.")
        video = session.get(Video, int(video_id))
        if not video:
            raise ValueError("Proyek tidak ditemukan.")
        busy = session.scalars(select(Run).where(Run.video_id == video.id, Run.status.in_(["queued", "running"]))).first()
        if busy:
            raise ValueError(f"Tahap '{busy.stage}' masih berjalan.")
        day_label = f"HARI {video.day}"
        series = video.series
        course = series.course if series else ""
        tasks.add_task(service.advance_workflow, db.SessionLocal, video.id, day_label, course)
        emit_studio_event("leader_message", video_id=video.id, video_title=_video_title(video), detail=f"Felisa mengarahkan advance untuk { _video_title(video)}.", action_hint="open_stage")
        return {"status": "advancing", "action": "advance", "video_id": video.id}

    if action == "approve":
        video = session.get(Video, int(video_id)) if video_id else None
        if not video:
            raise ValueError("Proyek persetujuan tidak ditemukan.")
        point = action_payload.get("approval_point")
        if point not in APPROVAL_POINTS:
            raise ValueError("Titik persetujuan tidak valid.")
        service_module = __import__(f"{__package__}.service", fromlist=["approve"])
        artifact = service_module.approve(session, video, point)
        emit_studio_event("leader_message", video_id=video.id, video_title=_video_title(video), stage=artifact.stage, detail=f"Persetujuan {point} telah dilaksanakan atas arahan Felisa.", action_hint="open_approval")
        return {"status": "approved", "action": "approve", "video_id": video.id, "approval_point": point}

    if action == "run_stage":
        video = session.get(Video, int(video_id)) if video_id else None
        stage_name = action_payload.get("stage")
        if not video or stage_name not in PIPELINE_STAGES:
            raise ValueError("Proyek atau tahap tidak valid.")
        busy = session.scalars(select(Run).where(Run.video_id == video.id, Run.status.in_(["queued", "running"]))).first()
        if busy:
            raise ValueError(f"Tahap '{busy.stage}' masih berjalan.")
        why = __import__(f"{__package__}.service", fromlist=["can_run"]).can_run(session, video, stage_name)
        if why:
            raise ValueError(why)
        run = Run(video_id=video.id, stage=stage_name)
        session.add(run)
        session.commit()
        day_label = f"HARI {video.day}"
        course = video.series.course if video.series else ""
        tasks.add_task(service.execute_run, db.SessionLocal, run.id, day_label, course)
        emit_studio_event("leader_message", video_id=video.id, video_title=_video_title(video), stage=stage_name, detail=f"Felisa menjalankan tahap {stage_name}.", action_hint="open_stage")
        return {"status": "queued", "action": "run_stage", "video_id": video.id, "stage": stage_name, "run_id": run.id}

    if action == "create_project":
        name = str(action_payload.get("name") or action_payload.get("project_name") or "").strip()
        if not name:
            title_slug = re.sub(r"[^a-z0-9]+", "-", str(action_payload.get("project_title") or "").lower()).strip("-")
            name = title_slug[:120]
        if not re.fullmatch(r"[a-z0-9\-]+", name):
            raise ValueError("Nama proyek harus huruf kecil, angka, atau minus.")
        if session.scalars(select(Video).where(Video.name == name)).first():
            raise ValueError("Nama proyek sudah ada.")
        stages.migrate_legacy_files(name)
        video = Video(
            name=name,
            title=str(action_payload.get("project_title") or name),
            day=int(action_payload.get("day") or 1),
            series_id=action_payload.get("series_id"),
            next_topic=str(action_payload.get("next_topic") or ""),
            voice=str(action_payload.get("voice") or "Kore"),
            provider=str(action_payload.get("provider") or "gemini"),
            model=str(action_payload.get("model") or ""),
        )
        session.add(video)
        session.commit()
        emit_studio_event(
            "leader_message",
            video_id=video.id,
            video_title=_video_title(video),
            detail=f"Felisa membuat proyek baru \"{_video_title(video)}\".",
            action_hint="open_stage",
        )
        return {"status": "created", "action": "create_project", "video_id": video.id}

    raise ValueError("Aksi Leader tidak dikenali.")
