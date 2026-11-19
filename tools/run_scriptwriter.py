"""Scriptwriter Agent (PRD 9E & DL-8): catatan belajar -> naskah (.txt) siap dibacakan,
dengan putaran revisi maksimal 2 kali berdasarkan feedback Script Reviewer (PRD 9F).

Pemakaian (dari folder utama proyek):
  python tools\\run_scriptwriter.py catatan\\NAMA.txt naskah\\NAMA.txt --day "HARI 2/15" --course "Intro to Software Engineering" --next "SDLC"
Pilihan:
  --seconds 55  --provider gemini  --model NAMA
  --format concept_breakdown --hook "Kalimat pembuka..."
  --review-json naskah\\NAMA.review.json
  --max-revisions 2  --no-review
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import agentkit  # noqa: E402
import llm  # noqa: E402
import run_script_reviewer  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MIN_WORDS, MAX_WORDS = 90, 170
MAX_SENTENCE = 16  # kalimat lebih panjang dari ini ditolak (aturan prompt: maks 14 kata)
ACRONYMS = ["SDLC", "SRS", "URS", "SysRS", "UAT", "API", "UI", "UX", "SQL", "HTML", "CSS", "MVP", "PRD", "TTS", "JSON", "CLI", "SDK"]
VALID_ROLES = {"hook", "body", "analogy", "closing"}
MAX_REVISIONS = 2


def clean(text):
    t = re.sub(r"[*#_`>]+", "", text)
    t = re.sub(r"\s+", " ", t).strip()
    for ac in ACRONYMS:  # singkatan selalu ditulis kapital agar dibaca huruf demi huruf
        t = re.sub(r"\b" + ac + r"\b", ac, t, flags=re.I)
    return t


def count_words(text):
    return len(text.split())


def long_sentences(text):
    parts = re.split(r"(?<=[.?!])\s+", text)
    return [p for p in parts if count_words(p) > MAX_SENTENCE]


def normalize_segments(data):
    raw_segments = data.get("segments")
    if isinstance(raw_segments, list) and len(raw_segments) >= 2:
        segments = []
        seen = set()
        for index, segment in enumerate(raw_segments, 1):
            if not isinstance(segment, dict) or not isinstance(segment.get("text"), str) or not segment["text"].strip():
                continue
            segment_id = str(segment.get("id") or f"seg-{index}").strip()
            if segment_id in seen:
                continue
            seen.add(segment_id)
            role = segment.get("role") if segment.get("role") in VALID_ROLES else ("hook" if index == 1 else "body")
            segments.append({"id": segment_id, "role": role, "text": clean(segment["text"])})
        if len(segments) >= 2:
            return segments, clean(" ".join(segment["text"] for segment in segments))

    script = clean(data.get("script", ""))
    sentences = [sentence.strip() for sentence in re.split(r"(?<=[.?!])\s+", script) if sentence.strip()]
    segments = [
        {
            "id": f"seg-{index}",
            "role": "hook" if index == 1 else ("closing" if index == len(sentences) else "body"),
            "text": sentence,
        }
        for index, sentence in enumerate(sentences, 1)
    ]
    return segments, script


def make_check():
    state = {"style_rejects": 0}

    def check_script(d):
        if not isinstance(d, dict):
            return "Output harus berupa objek JSON."
        segments, text = normalize_segments(d)
        if len(segments) < 2 or not text:
            return 'JSON harus punya "segments" atau "script" yang valid.'
        n = count_words(text)
        if n < MIN_WORDS or n > MAX_WORDS:
            return f"Naskah {n} kata; harus {MIN_WORDS}-{MAX_WORDS} kata."
        longs = long_sentences(text)
        if longs and state["style_rejects"] < 2:  # soal gaya: maks 2 kali minta ulang, lalu diterima
            state["style_rejects"] += 1
            return f'Ada {len(longs)} kalimat lebih dari {MAX_SENTENCE} kata, mis.: "{longs[0]}". Pecah jadi kalimat pendek (maks 14 kata).'
        return ""

    return check_script


def _load_writer_prompt():
    v1 = ROOT / "prompts" / "scriptwriter" / "v1.md"
    return (v1 if v1.exists() else ROOT / "prompts" / "scriptwriter_agent.md").read_text(encoding="utf-8-sig")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("notes")
    ap.add_argument("out")
    ap.add_argument("--day")
    ap.add_argument("--course")
    ap.add_argument("--format", dest="video_format")
    ap.add_argument("--hook")
    ap.add_argument("--next", dest="nxt")
    ap.add_argument("--seconds", type=int, default=55)
    ap.add_argument("--provider", default="gemini", choices=list(llm.PROVIDERS))
    ap.add_argument("--model")
    ap.add_argument("--review-json", help="Opsional: simpan JSON hasil review terakhir dari Script Reviewer")
    ap.add_argument("--max-revisions", type=int, default=MAX_REVISIONS)
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
    if a.video_format:
        info.append(f"Format video: {a.video_format}")
    if a.hook:
        info.append(f"Hook rencana: {a.hook}")
    info.append(f"Topik besok: {a.nxt}" if a.nxt else "Topik besok: (tidak ada)")
    info_text = "\n".join(info)

    writer_prompt = _load_writer_prompt()
    print("[1/2] Scriptwriter menulis draf naskah...")
    d = agentkit.ask(a.provider, a.model, writer_prompt, f"CATATAN:\n{notes}\n\nInfo:\n{info_text}", make_check())
    segments, script = normalize_segments(d)
    title = d.get("title", "")
    print(f"    Judul: {title} | {count_words(script)} kata")

    last_review = None
    if not a.no_review:
        max_rev = max(0, min(MAX_REVISIONS, a.max_revisions))
        for rev_idx in range(max_rev + 1):
            print(f"[2/2] Script Reviewer memeriksa naskah (putaran {rev_idx + 1}/{max_rev + 1})...")
            last_review = run_script_reviewer.review_script(a.provider, a.model, notes, info_text, script, segments)
            verdict = last_review.get("verdict", "revise")
            items = last_review.get("feedback_items") or []
            for item in items:
                print(f"    - [{item.get('severity')}] ({item.get('segment_id')}) {item.get('suggestion')}")
            print(f"    Verdict: {verdict} | {last_review.get('summary', '')}")

            if verdict == "pass" or rev_idx == max_rev:
                last_review["review_status"] = "lolos review" if verdict == "pass" else "belum lolos review"
                last_review["needs_human_review"] = verdict != "pass"
                break

            print(f"    Scriptwriter merevisi naskah berdasarkan feedback Reviewer ({rev_idx + 1}/{max_rev})...")
            revise_user = (
                f"CATATAN:\n{notes}\n\nInfo:\n{info_text}\n\n"
                f"SEGMEN NASKAH SEBELUMNYA:\n{json.dumps(segments, ensure_ascii=False, indent=2)}\n\n"
                f"NASKAH GABUNGAN SEBELUMNYA:\n{script}\n\n"
                f"FEEDBACK REVIEWER (wajib diperbaiki tanpa menambah fakta di luar catatan):\n"
                f"{json.dumps(items, ensure_ascii=False, indent=2)}"
            )
            d = agentkit.ask(a.provider, a.model, writer_prompt, revise_user, make_check())
            segments, script = normalize_segments(d)
            if d.get("title"):
                title = d["title"]
            print(f"    Revisi selesai: {count_words(script)} kata")

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(script + "\n", encoding="utf-8")
    out.with_suffix(".segments.json").write_text(
        json.dumps({"title": title, "segments": segments, "script": script}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    if a.review_json and last_review is not None:
        rp = Path(a.review_json)
        rp.parent.mkdir(parents=True, exist_ok=True)
        rp.write_text(json.dumps(last_review, ensure_ascii=False, indent=2), encoding="utf-8")

    secs = count_words(script) / 2.5
    print(f"\n[OK] Naskah {count_words(script)} kata (sekitar {secs:.0f} detik) disimpan: {out}")
    print("Baca dan edit seandainya perlu (titik persetujuan naskah), lalu lanjut ke pipeline.")
    return 0


if __name__ == "__main__":
    sys.exit(main())