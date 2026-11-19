"""Scriptwriter: catatan belajar -> naskah (.txt) siap dibacakan (dengan opsi memanggil Script Reviewer terpisah).

Pemakaian (dari folder utama proyek):
  python tools\\run_scriptwriter.py catatan\\NAMA.txt naskah\\NAMA.txt --day "HARI 2/15" --course "Intro to Software Engineering" --next "SDLC"
Pilihan: --seconds 55  --provider gemini  --model NAMA  --no-review
"""
import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import agentkit  # noqa: E402
import llm  # noqa: E402
import run_script_reviewer  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MIN_WORDS, MAX_WORDS = run_script_reviewer.MIN_WORDS, run_script_reviewer.MAX_WORDS
MAX_SENTENCE = run_script_reviewer.MAX_SENTENCE
clean = run_script_reviewer.clean_script_text
count_words = run_script_reviewer.count_words
long_sentences = run_script_reviewer.long_sentences


def make_check():
    state = {"style_rejects": 0}

    def check_script(d):
        if not isinstance(d, dict) or not isinstance(d.get("script"), str) or not d["script"].strip():
            return 'JSON harus punya field "script" (teks).'
        text = clean(d["script"])
        n = count_words(text)
        if n < MIN_WORDS or n > MAX_WORDS:
            return f"Naskah {n} kata; harus {MIN_WORDS}-{MAX_WORDS} kata."
        longs = long_sentences(text)
        if longs and state["style_rejects"] < 2:  # soal gaya: maks 2 kali minta ulang, lalu diterima
            state["style_rejects"] += 1
            return f'Ada {len(longs)} kalimat lebih dari {MAX_SENTENCE} kata, mis.: "{longs[0]}". Pecah jadi kalimat pendek (maks 14 kata).'
        return ""

    return check_script


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
    d = agentkit.ask(a.provider, a.model, writer, f"CATATAN:\n{notes}\n\nInfo:\n{info_text}", make_check())
    script = clean(d["script"])
    title = d.get("title", "")
    print(f"    Judul: {title} | {count_words(script)} kata")

    if not a.no_review:
        print("[2/2] Reviewer (modul terpisah) memeriksa naskah...")
        r = run_script_reviewer.review_script(a.provider, a.model, notes, info_text, script)
        for issue in r.get("issues") or []:
            print("    -", issue)
        print(f"    Hasil review: {r.get('verdict', '?')}")
        script = r["script"]

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(script + "\n", encoding="utf-8")
    secs = count_words(script) / 2.5
    print(f"\n[OK] Naskah {count_words(script)} kata (sekitar {secs:.0f} detik) disimpan: {out}")
    print("Baca dan edit seandainya perlu (titik persetujuan naskah), lalu lanjut ke pipeline.")
    return 0


if __name__ == "__main__":
    sys.exit(main())