"""Definisi tahap alur dan cara menjalankannya (memakai skrip di folder tools/ yang sudah ada)."""
import json
import sys

from . import config

R = config.ROOT
REM = config.REMOTION

# Urutan tahap lengkap sesuai PRD v1.3. Mengubah tahap di depan membuat tahap di belakangnya "usang" (stale).
ORDER = ["material", "analysis", "notes", "ideas", "script", "review", "audio", "words", "storyboard", "render"]

# Empat titik persetujuan manual (PRD): nama titik -> tahap yang disetujui
APPROVAL_POINTS = {
    "notes": "notes",
    "script": "review",
    "audio": "audio",
    "video": "render",
}

# Tahap yang baru boleh dijalankan setelah titik persetujuan tertentu
REQUIRES_APPROVAL = {
    "script": "notes",
    "audio": "script",
    "words": "audio",
    "storyboard": "audio",
    "render": "audio",
}

# Tahap yang diisi manusia (bukan dijalankan sebagai skrip AI)
MANUAL = {"material"}


def paths(name):
    """Lokasi file kerja tiap tahap (kompatibel dengan pipeline.py dan runner agen v1)."""
    a = REM / "public" / "audio"
    return {
        "material": R / "catatan" / f"{name}.material.txt",
        "analysis": R / "catatan" / f"{name}.analysis.json",
        "notes": R / "catatan" / f"{name}.txt",
        "notes_json": R / "catatan" / f"{name}.notes.v2.json",
        "ideas": R / "rencana" / f"{name}.plan.json",
        "script": R / "naskah" / f"{name}.draft.txt",
        "review": R / "naskah" / f"{name}.txt",
        "review_json": R / "naskah" / f"{name}.review.json",
        "audio": a / f"{name}.wav",
        "words": a / f"{name}.words.json",
        "storyboard": REM / "src" / "storyboards" / f"{name}.json",
        "render": REM / "out" / f"{name}.mp4",
    }


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
        code = (
            "import shutil, subprocess, sys; "
            f"rc = subprocess.call({[py, 'tools/run_learning_notes.py', str(p['material']), str(p['analysis']), str(p['notes_json']), *prov]!r}); "
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
        if p["ideas"].exists():
            plan = json.loads(p["ideas"].read_text(encoding="utf-8-sig"))
            videos = plan.get("videos", [])
            selected = plan.get("selected")
            idea = selected if isinstance(selected, dict) else None
            if idea is None and isinstance(selected, int) and 0 <= selected < len(videos):
                idea = videos[selected]
            if idea is None and videos:
                idea = videos[0]
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
        cmd = [
            py,
            "tools/run_script_reviewer.py",
            str(p["notes"]),
            str(p["script"]),
            str(p["review"]),
            "--review-json",
            str(p["review_json"]),
            *prov,
        ]
        if day_label:
            cmd += ["--day", day_label]
        if course:
            cmd += ["--course", course]
        if video.next_topic:
            cmd += ["--next", video.next_topic]
        return cmd, False, R

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
        rel = p["storyboard"].relative_to(REM).as_posix()
        cmd = f'npx remotion render HtmlCssJs "out/{video.name}.mp4" --props="{rel}" --concurrency=2'
        return cmd, True, REM

    raise ValueError(f"Tahap tidak dikenal: {stage}")