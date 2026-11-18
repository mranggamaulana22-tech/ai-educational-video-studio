"""Content Planner: catatan terstruktur -> rencana video + file catatan per video (siap untuk pipeline --notes).

Pemakaian (dari folder utama proyek):
  python tools\\run_content_planner.py catatan\\NAMA.notes.json rencana\\NAMA.plan.json --start-day 3 --total 15 --max-videos 5 --prefix sdlc
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


def slug(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:28].strip("-") or "video"


def make_check(notes, start_day, max_videos):
    known = {t["title"].strip().lower(): t["title"] for t in notes["topics"]}

    def check(d):
        v = d.get("videos") if isinstance(d, dict) else None
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
            tp = x.get("topics")
            if not isinstance(tp, list) or not tp:
                return f'Video "{x["title"]}" harus punya topics (judul topik dari catatan).'
            for t in tp:
                if str(t).strip().lower() not in known:
                    return f'Topik "{t}" tidak ada di catatan. Gunakan judul persis: ' + "; ".join(known.values())
                used.add(str(t).strip().lower())
        missing = [known[k] for k in known if k not in used]
        if missing and len(v) < max_videos:
            return "Topik belum dipakai di video mana pun: " + "; ".join(missing)
        return ""

    return check


def notes_text(notes, titles):
    by = {t["title"].strip().lower(): t for t in notes["topics"]}
    lines = [f"Kursus: {notes.get('course', '')}", f"Modul: {notes.get('module', '')}", ""]
    for title in titles:
        t = by[str(title).strip().lower()]
        lines.append(f"Topik: {t['title']}")
        if t.get("summary"):
            lines.append(t["summary"])
        lines += [f"- {p}" for p in t["key_points"]]
        for df in t.get("definitions") or []:
            lines.append(f"- Istilah {df.get('term', '')}: {df.get('meaning', '')}")
        for ex in t.get("examples") or []:
            lines.append(f"- Contoh: {ex}")
        lines.append("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("notes")
    ap.add_argument("out")
    ap.add_argument("--start-day", type=int, default=1)
    ap.add_argument("--total", type=int, default=15, help="jumlah hari seri (untuk lencana HARI x/N)")
    ap.add_argument("--max-videos", type=int, default=5)
    ap.add_argument("--prefix", default="seri")
    ap.add_argument("--provider", default="gemini", choices=list(llm.PROVIDERS))
    ap.add_argument("--model")
    a = ap.parse_args()

    notes = json.loads(Path(a.notes).read_text(encoding="utf-8-sig"))
    system = (agentkit.ROOT / "prompts" / "content_planner.md").read_text(encoding="utf-8-sig")
    user = (
        f"CATATAN (JSON):\n{json.dumps(notes, ensure_ascii=False)}\n\n"
        f"Info:\nHari awal: {a.start_day}\nJumlah video maksimal: {a.max_videos}"
    )
    print("Content Planner menyusun rencana video...")
    plan = agentkit.ask(a.provider, a.model, system, user, make_check(notes, a.start_day, a.max_videos))

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    root = agentkit.ROOT
    course = notes.get("course", "")
    videos = plan["videos"]
    print("\nRencana video:")
    for i, v in enumerate(videos):
        name = f"{a.prefix}-hari{v['day']}-{slug(v['title'])}"
        v["name"] = name
        v["next"] = videos[i + 1]["title"] if i + 1 < len(videos) else ""
        f = root / "catatan" / f"{name}.txt"
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(notes_text(notes, v["topics"]), encoding="utf-8")
        print(f"  Hari {v['day']}: {v['title']}  ({', '.join(v['topics'])})")
        if v.get("angle"):
            print(f"     sudut: {v['angle']}")
    out.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n[OK] Rencana disimpan: {out}")
    print("Perintah pipeline per video (jalankan satu per satu):")
    for v in videos:
        nxt = f' --next "{v["next"]}"' if v["next"] else ""
        print(
            f'  .\\.venv-audio\\Scripts\\python.exe tools\\pipeline.py {v["name"]} --notes '
            f'--day "HARI {v["day"]}/{a.total}" --course "{course}"{nxt}'
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
