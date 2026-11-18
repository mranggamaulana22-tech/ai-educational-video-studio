"""Definisi tahap alur dan cara menjalankannya (memakai skrip di folder tools/ yang sudah ada)."""
import sys

from . import config

R = config.ROOT
REM = config.REMOTION

# Urutan tahap. Mengubah tahap di depan membuat hasil tahap di belakangnya "usang" (stale).
ORDER = ["notes", "script", "audio", "words", "storyboard", "render"]

# Empat titik persetujuan manual (PRD): nama titik -> tahap yang disetujui
APPROVAL_POINTS = {"notes": "notes", "script": "script", "audio": "audio", "video": "render"}

# Tahap yang baru boleh dijalankan setelah titik persetujuan tertentu
REQUIRES_APPROVAL = {"audio": "script", "words": "audio", "storyboard": "audio", "render": "audio"}

# Tahap yang dikerjakan manusia (bukan dijalankan otomatis)
MANUAL = {"notes"}


def paths(name):
    """Lokasi file kerja tiap tahap (sama dengan yang dipakai pipeline.py)."""
    a = REM / "public" / "audio"
    return {
        "notes": R / "catatan" / f"{name}.txt",
        "script": R / "naskah" / f"{name}.txt",
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
    if stage == "script":
        cmd = [py, "tools/run_scriptwriter.py", str(p["notes"]), str(p["script"]), *prov]
        if day_label:
            cmd += ["--day", day_label]
        if course:
            cmd += ["--course", course]
        if video.next_topic:
            cmd += ["--next", video.next_topic]
        return cmd, False, R
    if stage == "audio":
        return [py, "tools/tts_gemini.py", str(p["script"]), str(p["audio"]), "--voice", video.voice], False, R
    if stage == "words":
        return [py, "tools/align_audio.py", str(p["audio"]), str(p["words"])], False, R
    if stage == "storyboard":
        cmd = [py, "tools/run_storyboard_agent.py", str(p["script"]), str(p["words"]), str(p["storyboard"]), *prov]
        if day_label and course:
            cmd += ["--day", day_label, "--course", course]
        return cmd, False, R
    if stage == "render":
        rel = p["storyboard"].relative_to(REM).as_posix()
        cmd = f'npx remotion render HtmlCssJs "out/{video.name}.mp4" --props="{rel}" --concurrency=2'
        return cmd, True, REM
    raise ValueError(f"Tahap tidak dikenal: {stage}")
