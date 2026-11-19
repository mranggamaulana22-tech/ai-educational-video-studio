"""Jalankan Storyboard Agent lewat API: naskah + waktu kata -> storyboard JSON v1.3 yang sudah divalidasi.

Pemakaian (dari folder utama proyek):
  python tools\\run_storyboard_agent.py naskah\\NAMA.txt apps\\remotion\\public\\audio\\NAMA.words.json apps\\remotion\\src\\storyboards\\NAMA.json
Pilihan:
  --provider gemini|openrouter|deepseek   --model NAMA_MODEL
  --day "HARI 1/15" --course "Intro to Software Engineering"   (lencana atas)
  --retries 2   (berapa kali minta AI memperbaiki bila ditolak validator)
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import llm  # noqa: E402
import make_agent_input  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
VALIDATOR = ROOT / "apps" / "remotion" / "scripts" / "validate-storyboard.mjs"
PROMPT = ROOT / "prompts" / "storyboard_agent.md"
APPLY = ROOT / "tools" / "apply_word_times.py"
DEFAULT_COMPONENT_VERSION = "1.0.0"


def extract_json(text):
    t = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", t, re.S)
    if m:
        t = m.group(1).strip()
    a, b = t.find("{"), t.rfind("}")
    if a >= 0 and b > a:
        t = t[a : b + 1]
    return json.loads(t)


def clean_subtitles(sb):
    """Samakan gaya subtitle: tanpa penanda warna, tanda baca menempel ke kata sebelumnya."""
    for sub in sb.get("subtitles", []):
        t = re.sub(r"\{\{\w+:([^}]*)\}\}", r"\1", sub.get("text", ""))
        t = re.sub(r"\s+([,.!?:;])", r"\1", t)
        sub["text"] = " ".join(t.split())
    return sb


def resolve_storyboard_v13(sb):
    """Resolver sistem (DL-10): pastikan schemaVersion 1.3 serta componentId & componentVersion terisi sistem."""
    sb["schemaVersion"] = "1.3"
    for scene in sb.get("scenes", []):
        if not isinstance(scene, dict):
            continue
        comp_id = scene.get("componentId") or scene.get("component") or ""
        scene["componentId"] = comp_id
        scene["componentVersion"] = DEFAULT_COMPONENT_VERSION
        scene.pop("component", None)
    return sb


def validate(path):
    r = subprocess.run(["node", str(VALIDATOR), str(path)], capture_output=True, text=True, encoding="utf-8")
    return r.returncode == 0, (r.stdout + r.stderr).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("words")
    ap.add_argument("out")
    ap.add_argument("--provider", default="gemini", choices=list(llm.PROVIDERS))
    ap.add_argument("--model", default=None)
    ap.add_argument("--day", default=None)
    ap.add_argument("--course", default=None)
    ap.add_argument("--retries", type=int, default=2)
    a = ap.parse_args()

    naskah = " ".join(Path(a.script).read_text(encoding="utf-8-sig").split())
    words = json.loads(Path(a.words).read_text(encoding="utf-8-sig"))
    system = PROMPT.read_text(encoding="utf-8-sig")
    user = "NASKAH:\n" + naskah + "\n\nInfo audio dan potongan ucapan:\n" + make_agent_input.build(words)
    if a.day and a.course:
        user += f'\n\nLencana: day "{a.day}", course "{a.course}"'

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    messages = [("user", user)]
    ok, report = False, ""
    for attempt in range(a.retries + 1):
        print(f"[{attempt + 1}/{a.retries + 1}] Minta {a.provider} membuat storyboard...")
        reply = llm.generate_json(a.provider, system, messages, a.model)
        try:
            sb = extract_json(reply)
        except json.JSONDecodeError as e:
            report = f"Jawaban bukan JSON valid: {e}"
            print("   ", report)
            messages += [("model", reply), ("user", report + "\nKeluarkan hanya JSON lengkap yang valid.")]
            continue
        sb = resolve_storyboard_v13(clean_subtitles(sb))
        out.write_text(json.dumps(sb, ensure_ascii=False, indent=2), encoding="utf-8")
        ok, report = validate(out)
        print(report)
        if ok:
            break
        long_scenes = [ln for ln in report.splitlines() if "8000 ms" in ln]
        if long_scenes:
            print("    Ada scene lebih dari 8 detik, minta AI memecahnya...")
        fix = "Validator menolak storyboard ini:\n" + report + "\nPerbaiki dan keluarkan JSON lengkap yang baru (pastikan setiap scene 3000-8000 ms dan tidak ada celah waktu), hanya JSON."
        messages += [("model", reply), ("user", fix)]
    if not ok:
        print(f"\n[GAGAL] Belum lolos validator setelah {a.retries + 1} percobaan. Hasil terakhir ada di {out}.")
        return 1

    print("\nMemasang waktu kata asli...")
    r = subprocess.run([sys.executable, str(APPLY), str(out), a.words], capture_output=True, text=True, encoding="utf-8")
    print(r.stdout[-600:] + r.stderr)
    if r.returncode != 0:
        return 1
    ok, report = validate(out)
    print(report)
    print(f"\n[OK] Storyboard v1.3 siap: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())