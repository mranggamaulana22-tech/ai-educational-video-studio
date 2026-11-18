"""Learning Agent: materi mentah (.txt/.md/.docx) -> catatan belajar terstruktur (.notes.json + .notes.md).

Pemakaian (dari folder utama proyek):
  python tools\\run_learning_agent.py materi\\NAMA.txt catatan\\NAMA.notes.json --course "Intro to Software Engineering"
Pilihan: --provider gemini  --model NAMA
Setelah selesai, BACA catatan\\NAMA.notes.md (titik persetujuan 1) dan edit .notes.json bila ada yang salah.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import agentkit  # noqa: E402
import llm  # noqa: E402

MAX_CHARS = 120000


def check(d):
    if not isinstance(d, dict) or not isinstance(d.get("topics"), list) or not d["topics"]:
        return 'JSON harus punya "topics" (daftar, minimal 1).'
    for i, t in enumerate(d["topics"], 1):
        if not isinstance(t, dict) or not isinstance(t.get("title"), str) or not t["title"].strip():
            return f"Topik #{i} harus punya title."
        kp = t.get("key_points")
        if not isinstance(kp, list) or not (2 <= len(kp) <= 6) or not all(isinstance(x, str) for x in kp):
            return f'Topik "{t["title"]}" harus punya key_points 2-6 teks.'
    titles = [t["title"].strip().lower() for t in d["topics"]]
    if len(set(titles)) != len(titles):
        return "Judul topik harus unik."
    return ""


def to_markdown(d):
    out = [f"# {d.get('module') or 'Catatan belajar'}", f"Kursus: {d.get('course', '')}", ""]
    for i, t in enumerate(d["topics"], 1):
        out += [f"## {i}. {t['title']}", t.get("summary", ""), ""]
        out += [f"- {p}" for p in t["key_points"]]
        for df in t.get("definitions") or []:
            out.append(f"- **{df.get('term', '')}**: {df.get('meaning', '')}")
        for ex in t.get("examples") or []:
            out.append(f"- Contoh: {ex}")
        out.append("")
    if d.get("gaps"):
        out += ["## Hal yang kurang jelas di materi", *[f"- {g}" for g in d["gaps"]], ""]
    return "\n".join(out)


def main():
    import json

    ap = argparse.ArgumentParser()
    ap.add_argument("material")
    ap.add_argument("out")
    ap.add_argument("--course")
    ap.add_argument("--provider", default="gemini", choices=list(llm.PROVIDERS))
    ap.add_argument("--model")
    a = ap.parse_args()

    text = agentkit.read_text(a.material).strip()
    if not text:
        print("[GAGAL] Materi kosong.")
        return 1
    if len(text) > MAX_CHARS:
        print(f"[PERHATIAN] Materi {len(text)} huruf; hanya {MAX_CHARS} huruf pertama dipakai. Pecah materi per modul.")
        text = text[:MAX_CHARS]
    system = (agentkit.ROOT / "prompts" / "learning_agent.md").read_text(encoding="utf-8-sig")
    user = f"MATERI:\n{text}\n\nInfo:\nKursus: {a.course or '(lihat materi)'}"
    print(f"Learning Agent membaca materi ({len(text)} huruf)...")
    d = agentkit.ask(a.provider, a.model, system, user, check)
    if a.course and not d.get("course"):
        d["course"] = a.course

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    md = out.with_suffix(".md")
    md.write_text(to_markdown(d), encoding="utf-8")
    print(f"\n[OK] {len(d['topics'])} topik. Catatan: {out}")
    print(f"Baca dan periksa (titik persetujuan 1): {md}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
