"""Definisi tahap alur dan cara menjalankannya (memakai skrip di folder tools/ yang sudah ada)."""
import json
import shutil
import sys
from pathlib import Path

from . import config

R = config.ROOT
REM = config.REMOTION

# Urutan tahap lengkap sesuai PRD v1.3. Mengubah tahap di depan membuat tahap di belakangnya "usang" (stale).
ORDER = ["material", "analysis", "notes", "ideas", "script", "review", "audio", "words", "storyboard", "render"]

# Empat titik persetujuan manual (PRD): nama titik -> tahap yang disetujui
APPROVAL_POINTS = {
    "notes": "notes",
    "ideas": "ideas",
    "script": "review",
    "audio": "audio",
    "video": "render",
}

# Tahap yang baru boleh dijalankan setelah titik persetujuan tertentu
REQUIRES_APPROVAL = {
    "ideas": "notes",
    "script": "ideas",
    "audio": "script",
    "words": "audio",
    "storyboard": "audio",
    "render": "audio",
}

# Tahap yang diisi manusia (bukan dijalankan sebagai skrip AI)
MANUAL = {"material"}


def paths(name):
    """Lokasi file kerja tiap proyek di storage/projects/{name}/."""
    migrate_legacy_files(name)
    base = R / "storage" / "projects" / name
    a = REM / "public" / "audio"
    return {
        "material": base / "material.txt",
        "analysis": base / "analysis.json",
        "session": base / "session.json",
        "notes": base / "notes.txt",
        "notes_json": base / "notes.v2.json",
        "ideas": base / "plan.json",
        "selected_idea": base / "selected_idea.json",
        "script": base / "script.draft.txt",
        "review": base / "script.txt",
        "review_json": base / "review.json",
        "audio": a / f"{name}.wav",
        "words": a / f"{name}.words.json",
        "storyboard": base / "storyboard.json",
        "render": base / "render.mp4",
    }


def migrate_legacy_files(name):
    """Salin file kerja lama ke folder proyek baru tanpa menimpa file baru."""
    base = R / "storage" / "projects" / name
    base.mkdir(parents=True, exist_ok=True)
    pairs = [
        (R / "catatan" / f"{name}.material.txt", base / "material.txt"),
        (R / "catatan" / f"{name}.analysis.json", base / "analysis.json"),
        (R / "catatan" / f"{name}.session.json", base / "session.json"),
        (R / "catatan" / f"{name}.txt", base / "notes.txt"),
        (R / "catatan" / f"{name}.notes.v2.json", base / "notes.v2.json"),
        (R / "rencana" / f"{name}.plan.json", base / "plan.json"),
        (R / "rencana" / f"{name}.selected_idea.json", base / "selected_idea.json"),
        (R / "naskah" / f"{name}.draft.txt", base / "script.draft.txt"),
        (R / "naskah" / f"{name}.txt", base / "script.txt"),
        (R / "naskah" / f"{name}.review.json", base / "review.json"),
        (REM / "src" / "storyboards" / f"{name}.json", base / "storyboard.json"),
        (REM / "out" / f"{name}.mp4", base / "render.mp4"),
    ]
    for source, destination in pairs:
        if source.exists() and source.is_file() and not destination.exists():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)

    legacy_render_dir = R / "storage" / name / "render"
    if legacy_render_dir.exists():
        candidates = sorted(
            legacy_render_dir.glob("*.mp4"),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        if candidates and not (base / "render.mp4").exists():
            shutil.copy2(candidates[0], base / "render.mp4")


def build_command(stage, video, day_label="", course=""):
    """Kembalikan (perintah, shell, cwd) untuk menjalankan tahap otomatis."""
    p = paths(video.name)
    py = sys.executable
    prov = ["--provider", video.provider] + (["--model", video.model] if video.model else [])

    if stage == "analysis":
        cmd = [py, "tools/run_material_analyst.py", str(p["material"]), str(p["analysis"]), *prov]
        if video.title:
            cmd += ["--title", video.title]
        return cmd, False, R

    if stage == "notes":
        # Menghasilkan p["notes_json"] (.notes.v2.json) sekaligus p["notes_json"].with_suffix(".md"),
        # lalu menyalin ringkasan .md ke p["notes"] (.txt) agar siap dipakai Scriptwriter.
        sess_arg = ["--session", str(p["session"])] if p["session"].exists() else []
        code = (
            "import shutil, subprocess, sys; "
            f"rc = subprocess.call({[py, 'tools/run_learning_notes.py', str(p['material']), str(p['analysis']), str(p['notes_json']), *prov, *sess_arg]!r}); "
            "sys.exit(rc) if rc != 0 else None; "
            f"shutil.copy2({str(p['notes_json'].with_suffix('.md'))!r}, {str(p['notes'])!r})"
        )
        return [py, "-c", code], False, R

    if stage == "ideas":
        # Bungkus catatan .txt ke format minimal notes JSON jika notes_json belum ada, lalu jalankan Content Planner.
        code = (
            "import json, pathlib, subprocess, sys; "
            f"nj = pathlib.Path({str(p['notes_json'])!r}); "
            f"nt = pathlib.Path({str(p['notes'])!r}); "
            "nj.parent.mkdir(parents=True, exist_ok=True); "
            "nj.write_text(json.dumps({'title': 'Catatan Belajar', 'sections': [{'id': 's1', 'heading': 'Materi Utama', 'body_md': nt.read_text(encoding='utf-8')}]}, ensure_ascii=False), encoding='utf-8') if not nj.exists() else None; "
            f"rc = subprocess.call({[py, 'tools/run_content_planner.py', str(p['notes_json']), str(p['ideas']), '--max-videos', '3', '--prefix', video.name, *prov]!r}); "
            "sys.exit(rc)"
        )
        return [py, "-c", code], False, R

    if stage == "script":
        cmd = [py, "tools/run_scriptwriter.py", str(p["notes"]), str(p["script"]), "--no-review", *prov]
        idea_path = p["selected_idea"] if p["selected_idea"].exists() else p["ideas"]
        if idea_path.exists():
            plan = json.loads(idea_path.read_text(encoding="utf-8-sig"))
            idea = plan.get("idea") if "idea" in plan else plan
            if isinstance(idea, dict):
                if idea.get("format"):
                    cmd += ["--format", str(idea["format"])]
                if idea.get("hook"):
                    cmd += ["--hook", str(idea["hook"])]
        if day_label:
            cmd += ["--day", day_label]
        if course:
            cmd += ["--course", course]
        if video.next_topic:
            cmd += ["--next", video.next_topic]
        return cmd, False, R

    if stage == "review":
        review_cmd = [
            py,
            "tools/run_script_reviewer.py",
            str(p["notes"]),
            str(p["script"]),
            str(p["review_json"]),
            "--segments-json",
            str(p["script"].with_suffix(".segments.json")),
            *prov,
        ]
        if day_label:
            review_cmd += ["--day", day_label]
        if course:
            review_cmd += ["--course", course]
        if video.next_topic:
            review_cmd += ["--next", video.next_topic]
        code = (
            "import json, pathlib, shutil, subprocess, sys; "
            f"review_json = pathlib.Path({str(p['review_json'])!r}); "
            f"script = pathlib.Path({str(p['script'])!r}); "
            f"review = pathlib.Path({str(p['review'])!r}); "
            f"cmd = {review_cmd!r}; "
            "rc = subprocess.call(cmd); "
            "sys.exit(rc) if rc != 0 else None; "
            "data = json.loads(review_json.read_text(encoding='utf-8')); "
            "data['review_status'] = 'belum lolos review' if data.get('verdict') == 'revise' else 'lolos review'; "
            "data['needs_human_review'] = data.get('verdict') == 'revise'; "
            "review_json.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8'); "
            "review.parent.mkdir(parents=True, exist_ok=True); "
            "shutil.copy2(script, review)"
        )
        return [py, "-c", code], False, R

    if stage == "audio":
        return [py, "tools/tts_gemini.py", str(p["review"]), str(p["audio"]), "--voice", video.voice], False, R

    if stage == "words":
        return [py, "tools/align_audio.py", str(p["audio"]), str(p["words"])], False, R

    if stage == "storyboard":
        cmd = [py, "tools/run_storyboard_agent.py", str(p["review"]), str(p["words"]), str(p["storyboard"]), *prov]
        if day_label and course:
            cmd += ["--day", day_label, "--course", course]
        return cmd, False, R

    if stage == "render":
        rem_storyboard = REM / "src" / "storyboards" / f"{video.name}.json"
        legacy_output = REM / "out" / f"{video.name}.mp4"
        code = (
            "import shutil, subprocess, sys, pathlib; "
            f"src = pathlib.Path({str(p['storyboard'])!r}); "
            f"dst = pathlib.Path({str(rem_storyboard)!r}); "
            f"legacy = pathlib.Path({str(legacy_output)!r}); "
            f"target = pathlib.Path({str(p['render'])!r}); "
            "dst.parent.mkdir(parents=True, exist_ok=True); "
            "shutil.copy2(src, dst); "
            f"rel = dst.relative_to(pathlib.Path({str(REM)!r})).as_posix(); "
            f"rc = subprocess.call(['npx', 'remotion', 'render', 'HtmlCssJs', 'out/{video.name}.mp4', '--props=' + rel, '--concurrency=2'], cwd={str(REM)!r}, shell=True); "
            "sys.exit(rc) if rc != 0 else None; "
            "target.parent.mkdir(parents=True, exist_ok=True); "
            "shutil.copy2(legacy, target)"
        )
        return [sys.executable, "-c", code], False, R

    raise ValueError(f"Tahap tidak dikenal: {stage}")