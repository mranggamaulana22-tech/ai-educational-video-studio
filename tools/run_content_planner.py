"""Content Planner: catatan terstruktur -> rencana video + file catatan per video (siap untuk pipeline --notes).

Pemakaian (dari folder utama proyek):
  python tools\\run_content_planner.py catatan\\NAMA.notes.json rencana\\NAMA.plan.json --start-day 3 --total 15 --max-videos 5 --prefix sdlc
  python tools\\run_content_planner.py --self-test
Hasil: rencana\\NAMA.plan.json dan catatan\\<prefix>-hariN-<judul>.txt untuk tiap video.
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import agentkit  # noqa: E402
import llm  # noqa: E402

VALID_FORMATS = {"myth_vs_fact", "step_by_step", "analogy", "comparison", "concept_breakdown"}


def slug(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:28].strip("-") or "video"


def _extract_entries(notes):
    """Dukung format LearningNotes v2 (sections) maupun catatan v1 (topics)."""
    if isinstance(notes.get("sections"), list) and notes["sections"]:
        entries = []
        for s in notes["sections"]:
            entries.append(
                {
                    "id": s.get("id", ""),
                    "title": s.get("heading", ""),
                    "body": s.get("body_md", ""),
                    "key_terms": [
                        {"term": kt.get("term", ""), "meaning": kt.get("definition", "")}
                        for kt in (s.get("key_terms") or [])
                    ],
                    "examples": [
                        ex.get("text", "") if isinstance(ex, dict) else str(ex)
                        for ex in (s.get("examples") or [])
                    ],
                }
            )
        return entries

    entries = []
    for i, t in enumerate(notes.get("topics") or [], 1):
        lines = []
        if t.get("summary"):
            lines.append(t["summary"])
        lines += [f"- {p}" for p in (t.get("key_points") or [])]
        entries.append(
            {
                "id": t.get("id", f"t{i}"),
                "title": t.get("title", ""),
                "body": "\n".join(lines),
                "key_terms": t.get("definitions") or [],
                "examples": t.get("examples") or [],
            }
        )
    return entries


def make_check(notes, start_day, max_videos):
    entries = _extract_entries(notes)
    known = {e["title"].strip().lower(): e["title"] for e in entries if e["title"].strip()}
    known_ids = {e["id"].strip(): e["id"] for e in entries if e["id"].strip()}

    def check(d):
        if not isinstance(d, dict) or not isinstance(d.get("series"), str) or not d["series"].strip():
            return 'JSON harus punya "series" (nama seri/kursus).'
        v = d.get("videos")
        if not isinstance(v, list) or not v:
            return 'JSON harus punya "videos" (daftar, minimal 1).'
        if len(v) > max_videos:
            return f"Terlalu banyak video ({len(v)}); maksimal {max_videos}."
        used = set()
        for i, x in enumerate(v):
            if not isinstance(x, dict) or not isinstance(x.get("title"), str) or not x["title"].strip():
                return f"Video #{i + 1} harus punya title."
            if x.get("day") != start_day + i:
                return f"Video #{i + 1} harus bernomor day {start_day + i} (berurutan)."
            fmt = x.get("format")
            if fmt not in VALID_FORMATS:
                return f'Video #{i + 1} wajib punya "format" valid ({", ".join(sorted(VALID_FORMATS))}).'
            hook = x.get("hook")
            if not isinstance(hook, str) or not hook.strip():
                return f'Video #{i + 1} wajib punya "hook" (kalimat pembuka 3 detik pertama).'
            if len(hook.split()) > 16:
                return f'Hook video #{i + 1} terlalu panjang ({len(hook.split())} kata; maksimal 14 kata).'
            tp = x.get("topics")
            if not isinstance(tp, list) or not tp:
                return f'Video "{x["title"]}" harus punya topics (judul topik/heading dari catatan).'
            for t in tp:
                if str(t).strip().lower() not in known:
                    return f'Topik "{t}" tidak ada di catatan. Gunakan judul persis: ' + "; ".join(known.values())
                used.add(str(t).strip().lower())
            if isinstance(x.get("section_ids"), list) and known_ids:
                for sid in x["section_ids"]:
                    if str(sid).strip() not in known_ids:
                        return f'section_id "{sid}" tidak ada di catatan.'
        missing = [known[k] for k in known if k not in used]
        if missing and len(v) < max_videos:
            return "Topik belum dipakai di video mana pun: " + "; ".join(missing)
        return ""

    return check


def notes_text(notes, titles):
    entries = _extract_entries(notes)
    by = {e["title"].strip().lower(): e for e in entries}
    course = notes.get("course") or notes.get("title") or ""
    module = notes.get("module") or ""
    lines = [f"Kursus: {course}", f"Modul: {module}", ""]
    for title in titles:
        e = by[str(title).strip().lower()]
        lines.append(f"Topik: {e['title']}")
        if e.get("body"):
            lines.append(e["body"])
        for df in e.get("key_terms") or []:
            lines.append(f"- Istilah {df.get('term', '')}: {df.get('meaning', '')}")
        for ex in e.get("examples") or []:
            lines.append(f"- Contoh: {ex}")
        lines.append("")
    return "\n".join(lines)


def run_self_test():
    sample_path = agentkit.ROOT / "shared" / "contracts" / "content_planner.sample.json"
    sample = json.loads(sample_path.read_text(encoding="utf-8-sig"))
    inp = sample["input"]
    err = make_check(inp["notes"], inp["start_day"], inp["max_videos"])(sample["output"])
    if err:
        print(f"[GAGAL] Fixture content_planner tidak valid: {err}")
        return 1
    print("[OK] Kontrak & fixture Content Planner (DL-8 format & hook) valid.")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("notes", nargs="?")
    ap.add_argument("out", nargs="?")
    ap.add_argument("--start-day", type=int, default=1)
    ap.add_argument("--total", type=int, default=15, help="jumlah hari seri (untuk lencana HARI x/N)")
    ap.add_argument("--max-videos", type=int, default=5)
    ap.add_argument("--prefix", default="seri")
    ap.add_argument("--provider", default="gemini", choices=list(llm.PROVIDERS))
    ap.add_argument("--model")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()

    if a.self_test:
        return run_self_test()
    if not a.notes or not a.out:
        ap.error("Argumen notes dan out wajib diisi kecuali memakai --self-test.")

    notes = json.loads(Path(a.notes).read_text(encoding="utf-8-sig"))
    prompt_path = agentkit.ROOT / "prompts" / "content_planner" / "v1.md"
    if not prompt_path.exists():
        prompt_path = agentkit.ROOT / "prompts" / "content_planner.md"
    system = prompt_path.read_text(encoding="utf-8-sig")
    user = (
        f"CATATAN (JSON):\n{json.dumps(notes, ensure_ascii=False)}\n\n"
        f"Info:\nHari awal: {a.start_day}\nJumlah video maksimal: {a.max_videos}"
    )
    print("Content Planner menyusun rencana video...")
    plan = agentkit.ask(a.provider, a.model, system, user, make_check(notes, a.start_day, a.max_videos))

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    root = agentkit.ROOT
    course = notes.get("course") or notes.get("title") or ""
    videos = plan["videos"]
    print("\nRencana video:")
    for i, v in enumerate(videos):
        name = f"{a.prefix}-hari{v['day']}-{slug(v['title'])}"
        v["name"] = name
        v["next"] = videos[i + 1]["title"] if i + 1 < len(videos) else ""
        f = root / "catatan" / f"{name}.txt"
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(notes_text(notes, v["topics"]), encoding="utf-8")
        print(f"  Hari {v['day']} [{v['format']}]: {v['title']}  ({', '.join(v['topics'])})")
        print(f"     hook: {v['hook']}")
        if v.get("angle"):
            print(f"     sudut: {v['angle']}")
    out.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n[OK] Rencana disimpan: {out}")
    print("Perintah pipeline per video (jalankan satu per satu):")
    for v in videos:
        nxt = f' --next "{v["next"]}"' if v["next"] else ""
        fmt = f' --format "{v["format"]}"' if v.get("format") else ""
        hook = f' --hook "{v["hook"].replace(chr(34), "")}"' if v.get("hook") else ""
        print(
            f'  .\\.venv-audio\\Scripts\\python.exe tools\\pipeline.py {v["name"]} --notes '
            f'--day "HARI {v["day"]}/{a.total}" --course "{course}"{fmt}{hook}{nxt}'
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())