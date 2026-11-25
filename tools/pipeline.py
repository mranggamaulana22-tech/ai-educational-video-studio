"""Pipeline otomatis: naskah -> suara -> waktu kata -> storyboard (AI) -> video.

Pemakaian (dari folder utama proyek, pakai python di .venv-audio):
  .\\.venv-audio\\Scripts\\python.exe tools\\pipeline.py NAMA --day "HARI 1/15" --course "Intro to Software Engineering"

Yang dibutuhkan: file naskah\\NAMA.txt, ATAU catatan belajar catatan\\NAMA.txt dengan opsi --notes
(naskah lalu dibuat otomatis oleh Scriptwriter + Reviewer). Hasil:
  apps\\frontend\\remotion\\public\\audio\\NAMA.wav            (suara)
  apps\\frontend\\remotion\\public\\audio\\NAMA.words.json     (waktu tiap kata)
  apps\\frontend\\remotion\\src\\storyboards\\NAMA.json        (storyboard dari AI)
  apps\\frontend\\remotion\\out\\NAMA.mp4                      (video)

Pilihan:
  --voice Kore            suara Gemini TTS
  --provider gemini       penyedia AI untuk storyboard (gemini|openrouter|deepseek)
  --model NAMA_MODEL      model AI untuk storyboard
  --notes                 buat naskah dari catatan\\NAMA.txt (Scriptwriter + Reviewer)
  --next "SDLC"           topik video besok (untuk teaser di naskah)
  --format concept_breakdown --hook "Kalimat pembuka..."  format dan hook rencana video (opsional)
  --skip-tts              pakai NAMA.wav yang sudah ada (mis. rekaman sendiri)
  --skip-align            pakai NAMA.words.json yang sudah ada
  --auto                  jangan berhenti menunggu persetujuan audio
  --no-render             berhenti setelah storyboard, tanpa render
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY = sys.executable
REMOTION = ROOT / "apps" / "frontend" / "remotion"


def run(title, cmd, cwd=ROOT, shell=False):
    print(f"\n=== {title} ===")
    t0 = time.time()
    r = subprocess.run(cmd, cwd=str(cwd), shell=shell)
    if r.returncode != 0:
        print(f"\n[GAGAL] Tahap '{title}' berhenti (kode {r.returncode}). Perbaiki lalu jalankan ulang perintah yang sama; tahap yang sudah ada bisa dilewati dengan --skip-tts / --skip-align.")
        sys.exit(r.returncode)
    print(f"[selesai {time.time() - t0:.0f} dtk]")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--day")
    ap.add_argument("--course")
    ap.add_argument("--voice", default="Kore")
    ap.add_argument("--provider", default="gemini")
    ap.add_argument("--model")
    ap.add_argument("--notes", action="store_true")
    ap.add_argument("--next", dest="nxt")
    ap.add_argument("--format", dest="video_format")
    ap.add_argument("--hook")
    ap.add_argument("--skip-tts", action="store_true")
    ap.add_argument("--skip-align", action="store_true")
    ap.add_argument("--auto", action="store_true")
    ap.add_argument("--no-render", action="store_true")
    a = ap.parse_args()

    n = a.name
    script = ROOT / "naskah" / f"{n}.txt"
    wav = REMOTION / "public" / "audio" / f"{n}.wav"
    words = REMOTION / "public" / "audio" / f"{n}.words.json"
    sb = REMOTION / "src" / "storyboards" / f"{n}.json"
    mp4 = REMOTION / "out" / f"{n}.mp4"

    if a.notes:
        notes = ROOT / "catatan" / f"{n}.txt"
        if not notes.exists():
            print(f"[GAGAL] Catatan tidak ada: {notes}")
            return 1
        cmd = [PY, "tools/run_scriptwriter.py", str(notes), str(script), "--provider", a.provider]
        if a.model:
            cmd += ["--model", a.model]
        if a.day:
            cmd += ["--day", a.day]
        if a.course:
            cmd += ["--course", a.course]
        if a.nxt:
            cmd += ["--next", a.nxt]
        if a.video_format:
            cmd += ["--format", a.video_format]
        if a.hook:
            cmd += ["--hook", a.hook]
        run("0. Naskah (Scriptwriter + Reviewer)", cmd)
        if not a.auto:
            print(f"\nBuka dan baca naskahnya: {script}")
            ans = input("Naskah sudah oke? Edit file-nya dulu bila perlu, lalu ketik y untuk lanjut (n untuk berhenti): ").strip().lower()
            if ans != "y":
                print("Dihentikan. Edit naskah, lalu jalankan lagi tanpa --notes.")
                return 0

    if not script.exists():
        print(f"[GAGAL] Naskah tidak ada: {script}")
        return 1

    # 1. Suara
    if a.skip_tts:
        if not wav.exists():
            print(f"[GAGAL] --skip-tts tetapi {wav} tidak ada.")
            return 1
        print("\n=== 1. Suara: dilewati (pakai file yang ada) ===")
    else:
        run("1. Suara (Gemini TTS)", [PY, "tools/tts_gemini.py", str(script), str(wav), "--voice", a.voice])

    # Persetujuan audio (titik approval 3 di PRD)
    if not a.auto and not a.skip_tts:
        print(f"\nDengarkan dulu suaranya: {wav}")
        ans = input("Suara sudah oke? Lanjut? (y/n): ").strip().lower()
        if ans != "y":
            print("Dihentikan. Ubah naskah/suara, lalu jalankan lagi.")
            return 0

    # 2. Waktu kata
    if a.skip_align and words.exists():
        print("\n=== 2. Waktu kata: dilewati (pakai file yang ada) ===")
    else:
        run("2. Waktu kata (Whisper)", [PY, "tools/align_audio.py", str(wav), str(words)])

    # 3. Storyboard oleh AI
    cmd = [PY, "tools/run_storyboard_agent.py", str(script), str(words), str(sb), "--provider", a.provider]
    if a.model:
        cmd += ["--model", a.model]
    if a.day and a.course:
        cmd += ["--day", a.day, "--course", a.course]
    run("3. Storyboard (AI + validator)", cmd)

    if a.no_render:
        print(f"\n[OK] Berhenti sebelum render. Storyboard: {sb}")
        return 0

    # 4. Render
    mp4.parent.mkdir(parents=True, exist_ok=True)
    rel_sb = sb.relative_to(REMOTION)
    run(
        "4. Render video",
        f'npx remotion render HtmlCssJs "out/{n}.mp4" --props="{rel_sb.as_posix()}" --concurrency=2',
        cwd=REMOTION,
        shell=True,
    )
    print(f"\n[OK] Video siap: {mp4}")
    print("Tonton videonya (titik approval 4). Kalau ada yang kurang, ubah dan jalankan lagi.")
    return 0


if __name__ == "__main__":
    sys.exit(main())