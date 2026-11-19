"""Script Reviewer Agent: catatan belajar + naskah -> hasil review terstruktur (.review.json) + naskah final (.txt).

Pemakaian (dari folder utama proyek):
  python tools\\run_script_reviewer.py catatan\\NAMA.txt naskah\\NAMA.draft.txt naskah\\NAMA.txt --day "HARI 2/15" --course "Intro to Software Engineering"
  python tools\\run_script_reviewer.py --self-test
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import agentkit  # noqa: E402
import llm  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MIN_WORDS, MAX_WORDS = 90, 170
MAX_SENTENCE = 16
ACRONYMS = ["SDLC", "SRS", "URS", "SysRS", "UAT", "API", "UI", "UX", "SQL", "HTML", "CSS", "MVP", "PRD", "TTS", "JSON", "CLI", "SDK"]
VALID_VERDICTS = {"ok", "revised"}


def clean_script_text(text):
    t = re.sub(r"[*#_`>]+", "", text)
    t = re.sub(r"\s+", " ", t).strip()
    for ac in ACRONYMS:  # singkatan selalu ditulis kapital agar dibaca huruf demi huruf oleh TTS
        t = re.sub(r"\b" + ac + r"\b", ac, t, flags=re.I)
    return t


def count_words(text):
    return len(text.split())


def long_sentences(text):
    parts = re.split(r"(?<=[.?!])\s+", text)
    return [p for p in parts if count_words(p) > MAX_SENTENCE]


def make_review_checker():
    state = {"style_rejects": 0}

    def check_review(d):
        if not isinstance(d, dict):
            return "Output harus berupa objek JSON."
        verdict = d.get("verdict")
        if verdict not in VALID_VERDICTS:
            return 'Field "verdict" wajib bernilai "ok" atau "revised".'
        if not isinstance(d.get("issues"), list):
            return 'Field "issues" wajib berupa daftar (list).'
        if not isinstance(d.get("script"), str) or not d["script"].strip():
            return 'Field "script" wajib diisi naskah final.'

        text = clean_script_text(d["script"])
        n = count_words(text)
        if n < MIN_WORDS or n > MAX_WORDS:
            return f"Naskah {n} kata; harus {MIN_WORDS}-{MAX_WORDS} kata."
        longs = long_sentences(text)
        if longs and state["style_rejects"] < 2:
            state["style_rejects"] += 1
            return f'Ada {len(longs)} kalimat lebih dari {MAX_SENTENCE} kata, mis.: "{longs[0]}". Pecah jadi kalimat pendek (maks 14 kata).'
        return ""

    return check_review


def review_script(provider, model, notes, info_text, draft_script):
    prompt_path = ROOT / "prompts" / "script_reviewer" / "v1.md"
    if not prompt_path.exists():
        prompt_path = ROOT / "prompts" / "script_reviewer.md"
    system = prompt_path.read_text(encoding="utf-8-sig")
    user = f"CATATAN:\n{notes}\n\nInfo:\n{info_text}\n\nNASKAH:\n{draft_script}"
    res = agentkit.ask(provider, model, system, user, make_review_checker())
    res["script"] = clean_script_text(res["script"])
    return res


def run_self_test():
    sample_path = ROOT / "shared" / "contracts" / "script_reviewer.sample.json"
    sample = json.loads(sample_path.read_text(encoding="utf-8-sig"))
    err = make_review_checker()(sample["output"])
    if err:
        print(f"[GAGAL] Fixture script_reviewer tidak valid: {err}")
        return 1
    print("[OK] Kontrak & fixture Script Reviewer valid.")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("notes", nargs="?")
    ap.add_argument("draft", nargs="?")
    ap.add_argument("out", nargs="?")
    ap.add_argument("--review-json", help="Opsional: simpan JSON hasil review lengkap (verdict, issues, script)")
    ap.add_argument("--day")
    ap.add_argument("--course")
    ap.add_argument("--next", dest="nxt")
    ap.add_argument("--seconds", type=int, default=55)
    ap.add_argument("--provider", default="gemini", choices=list(llm.PROVIDERS))
    ap.add_argument("--model")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()

    if a.self_test:
        return run_self_test()
    if not a.notes or not a.draft or not a.out:
        ap.error("Argumen notes, draft, dan out wajib diisi kecuali memakai --self-test.")

    notes = Path(a.notes).read_text(encoding="utf-8-sig").strip()
    draft = clean_script_text(Path(a.draft).read_text(encoding="utf-8-sig"))
    if not notes or not draft:
        print("[GAGAL] File catatan atau draf naskah kosong.")
        return 1

    info = [f"Durasi target: {a.seconds} detik"]
    if a.day:
        info.append(f"Hari: {a.day}")
    if a.course:
        info.append(f"Kursus: {a.course}")
    info.append(f"Topik besok: {a.nxt}" if a.nxt else "Topik besok: (tidak ada)")
    info_text = "\n".join(info)

    print("Script Reviewer memeriksa naskah...")
    res = review_script(a.provider, a.model, notes, info_text, draft)
    for issue in res.get("issues") or []:
        print("    -", issue)
    print(f"    Hasil review: {res.get('verdict', '?')}")

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(res["script"] + "\n", encoding="utf-8")
    if a.review_json:
        rp = Path(a.review_json)
        rp.parent.mkdir(parents=True, exist_ok=True)
        rp.write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[OK] Naskah tervalidasi ({count_words(res['script'])} kata) disimpan: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())