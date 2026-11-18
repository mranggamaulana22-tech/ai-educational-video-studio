"""Scriptwriter + Reviewer: catatan belajar -> naskah (.txt) siap dibacakan.

Pemakaian (dari folder utama proyek):
  python tools\\run_scriptwriter.py catatan\\NAMA.txt naskah\\NAMA.txt --day "HARI 2/15" --course "Intro to Software Engineering" --next "SDLC"
Pilihan: --seconds 55  --provider gemini  --model NAMA  --no-review
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import llm  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MIN_WORDS, MAX_WORDS = 90, 170


def parse(reply):
    t = reply.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", t, re.S)
    if m:
        t = m.group(1).strip()
    a, b = t.find("{"), t.rfind("}")
    if a >= 0 and b > a:
        t = t[a : b + 1]
    return json.loads(t)


def clean(text):
    t = re.sub(r"[*#_`>]+", "", text)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def count_words(text):
    return len(text.split())


def ask(provider, model, system, user, check, tries=3):
    """Panggil AI; jawaban diperiksa oleh check(data) -> pesan masalah atau ''."""
    messages = [("user", user)]
    for i in range(tries):
        reply = llm.generate_json(provider, system, messages, model)
        try:
            data = parse(reply)
            problem = check(data)
        except (json.JSONDecodeError, TypeError) as e:
            data, problem = None, f"Jawaban bukan JSON valid ({e}). Keluarkan hanya JSON."
        if not problem:
            return data
        print(f"    Ditolak: {problem}")
        messages += [("model", reply), ("user", problem + " Perbaiki dan keluarkan JSON lengkap yang baru, hanya JSON.")]
    raise SystemExit("[GAGAL] AI tidak menghasilkan naskah yang memenuhi aturan setelah beberapa percobaan.")


def check_script(d):
    if not isinstance(d, dict) or not isinstance(d.get("script"), str) or not d["script"].strip():
        return 'JSON harus punya field "script" (teks).'
    n = count_words(clean(d["script"]))
    if n < MIN_WORDS or n > MAX_WORDS:
        return f"Naskah {n} kata; harus {MIN_WORDS}-{MAX_WORDS} kata."
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("notes")
    ap.add_argument("out")
    ap.add_argument("--day")
    ap.add_argument("--course")
    ap.add_argument("--next", dest="nxt")
    ap.add_argument("--seconds", type=int, default=55)
    ap.add_argument("--provider", default="gemini", choices=list(llm.PROVIDERS))
    ap.add_argument("--model")
    ap.add_argument("--no-review", action="store_true")
    a = ap.parse_args()

    notes = Path(a.notes).read_text(encoding="utf-8-sig").strip()
    if not notes:
        print("[GAGAL] File catatan kosong.")
        return 1
    info = [f"Durasi target: {a.seconds} detik"]
    if a.day:
        info.append(f"Hari: {a.day}")
    if a.course:
        info.append(f"Kursus: {a.course}")
    info.append(f"Topik besok: {a.nxt}" if a.nxt else "Topik besok: (tidak ada)")
    info_text = "\n".join(info)

    writer = (ROOT / "prompts" / "scriptwriter_agent.md").read_text(encoding="utf-8-sig")
    print("[1/2] Scriptwriter menulis naskah...")
    d = ask(a.provider, a.model, writer, f"CATATAN:\n{notes}\n\nInfo:\n{info_text}", check_script)
    script = clean(d["script"])
    title = d.get("title", "")
    print(f"    Judul: {title} | {count_words(script)} kata")

    if not a.no_review:
        reviewer = (ROOT / "prompts" / "script_reviewer.md").read_text(encoding="utf-8-sig")
        print("[2/2] Reviewer memeriksa naskah...")
        r = ask(
            a.provider, a.model, reviewer,
            f"CATATAN:\n{notes}\n\nInfo:\n{info_text}\n\nNASKAH:\n{script}", check_script,
        )
        for issue in r.get("issues", []) or []:
            print("    -", issue)
        print(f"    Hasil review: {r.get('verdict', '?')}")
        script = clean(r["script"])

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(script + "\n", encoding="utf-8")
    secs = count_words(script) / 2.5
    print(f"\n[OK] Naskah {count_words(script)} kata (sekitar {secs:.0f} detik) disimpan: {out}")
    print("Baca dan edit seandainya perlu (titik persetujuan naskah), lalu lanjut ke pipeline.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
