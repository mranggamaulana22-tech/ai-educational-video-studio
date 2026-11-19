"""Script Reviewer Agent: catatan belajar + naskah -> hasil review terstruktur (.review.json).

Pemakaian (dari folder utama proyek):
  python tools\\run_script_reviewer.py catatan\\NAMA.txt naskah\\NAMA.draft.txt naskah\\NAMA.txt --day "HARI 2/15" --course "Intro to Software Engineering"
  python tools\\run_script_reviewer.py --self-test
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import agentkit  # noqa: E402
import llm  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
VALID_VERDICTS = {"pass", "revise"}
VALID_SEVERITIES = {"error", "warning"}
REQUIRED_CHECKS = ("accuracy", "storytelling", "clarity", "consistency", "duration")


def make_review_checker(segment_ids=None):
    def check_review(d):
        if not isinstance(d, dict):
            return "Output harus berupa objek JSON."
        if "script" in d:
            return 'Reviewer tidak boleh mengembalikan field "script".'
        verdict = d.get("verdict")
        if verdict not in VALID_VERDICTS:
            return 'Field "verdict" wajib bernilai "pass" atau "revise".'
        checks = d.get("checks")
        if not isinstance(checks, dict):
            return 'Field "checks" wajib berupa objek boolean.'
        for name in REQUIRED_CHECKS:
            if not isinstance(checks.get(name), bool):
                return f'Field "checks.{name}" wajib bernilai boolean (true/false).'
        feedback_items = d.get("feedback_items")
        if not isinstance(feedback_items, list):
            return 'Field "feedback_items" wajib berupa daftar (list).'
        valid_ids = (set(segment_ids) | {"global"}) if segment_ids is not None else None
        for index, item in enumerate(feedback_items):
            if not isinstance(item, dict):
                return f"feedback_items[{index}] harus berupa objek."
            if valid_ids is not None and item.get("segment_id") not in valid_ids:
                return f'feedback_items[{index}].segment_id "{item.get("segment_id")}" tidak dikenal.'
            if not isinstance(item.get("segment_id"), str) or not item["segment_id"].strip():
                return f"feedback_items[{index}].segment_id wajib diisi."
            if item.get("severity") not in VALID_SEVERITIES:
                return f'feedback_items[{index}].severity harus "error" atau "warning".'
            if not isinstance(item.get("suggestion"), str) or not item["suggestion"].strip():
                return f"feedback_items[{index}].suggestion wajib diisi."
        if verdict == "revise" and not feedback_items:
            return 'Jika verdict "revise", feedback_items minimal harus berisi 1 saran perbaikan.'
        if not isinstance(d.get("summary"), str) or not d["summary"].strip():
            return 'Field "summary" wajib diisi.'
        return ""

    return check_review


def review_script(provider, model, notes, info_text, draft_script, segments=None):
    prompt_path = ROOT / "prompts" / "script_reviewer" / "v1.md"
    if not prompt_path.exists():
        prompt_path = ROOT / "prompts" / "script_reviewer.md"
    system = prompt_path.read_text(encoding="utf-8-sig")
    segment_text = f"\n\nSEGMEN:\n{json.dumps(segments, ensure_ascii=False, indent=2)}" if segments else ""
    user = f"CATATAN:\n{notes}\n\nInfo:\n{info_text}{segment_text}\n\nNASKAH:\n{draft_script}"
    segment_ids = [s.get("id") for s in segments or [] if isinstance(s, dict)]
    return agentkit.ask(provider, model, system, user, make_review_checker(segment_ids))


def run_self_test():
    sample_path = ROOT / "shared" / "contracts" / "script_reviewer.sample.json"
    sample = json.loads(sample_path.read_text(encoding="utf-8-sig"))
    segment_ids = [s["id"] for s in sample["input"]["segments"]]
    err = make_review_checker(segment_ids)(sample["output"])
    if err:
        print(f"[GAGAL] Fixture script_reviewer tidak valid: {err}")
        return 1
    print("[OK] Kontrak & fixture Script Reviewer valid.")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("notes", nargs="?")
    ap.add_argument("draft", nargs="?")
    ap.add_argument("out", nargs="?", help="Path keluaran JSON hasil review (.review.json)")
    ap.add_argument("--segments-json", help="Opsional: file JSON berisi array segments")
    ap.add_argument("--review-json", help="Opsional: simpan JSON hasil review lengkap")
    ap.add_argument("--day")
    ap.add_argument("--course")
    ap.add_argument("--format", dest="video_format")
    ap.add_argument("--hook")
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
    draft = Path(a.draft).read_text(encoding="utf-8-sig").strip()
    if not notes or not draft:
        print("[GAGAL] File catatan atau draf naskah kosong.")
        return 1

    segments = None
    segment_path = Path(a.segments_json) if a.segments_json else Path(a.draft).with_suffix(".segments.json")
    if segment_path.exists():
        raw_segments = json.loads(segment_path.read_text(encoding="utf-8-sig"))
        segments = raw_segments.get("segments") if isinstance(raw_segments, dict) else raw_segments

    info = [f"Durasi target: {a.seconds} detik"]
    if a.day:
        info.append(f"Hari: {a.day}")
    if a.course:
        info.append(f"Kursus: {a.course}")
    if a.video_format:
        info.append(f"Format video: {a.video_format}")
    if a.hook:
        info.append(f"Hook rencana: {a.hook}")
    info.append(f"Topik besok: {a.nxt}" if a.nxt else "Topik besok: (tidak ada)")
    info_text = "\n".join(info)

    print("Script Reviewer memeriksa naskah...")
    res = review_script(a.provider, a.model, notes, info_text, draft, segments=segments)
    for item in res.get("feedback_items") or []:
        print(f"    - [{item['severity']}] ({item['segment_id']}) {item['suggestion']}")
    print(f"    Hasil review: {res.get('verdict', '?')}")

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
    if a.review_json:
        rp = Path(a.review_json)
        rp.parent.mkdir(parents=True, exist_ok=True)
        rp.write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[OK] Hasil review tersimpan: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())