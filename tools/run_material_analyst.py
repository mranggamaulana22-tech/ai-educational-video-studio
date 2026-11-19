"""Material Analyst Agent: materi mentah (.txt/.md/.docx) -> analisis terstruktur (.analysis.json).

Pemakaian (dari folder utama proyek):
  python tools\\run_material_analyst.py catatan\\hari2-sdlc.txt catatan\\hari2-sdlc.analysis.json --title "SDLC Hari 2"
  python tools\\run_material_analyst.py --self-test
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import agentkit  # noqa: E402
import llm  # noqa: E402

MAX_CHARS = 120000
REQUIRED_KEYS = (
    "topics",
    "key_concepts",
    "needs_expansion",
    "gaps",
    "possible_misconceptions",
    "relations",
    "technical_terms",
    "suggested_questions",
    "sources_to_verify",
)


def check_analysis(d):
    if not isinstance(d, dict):
        return "Output harus berupa objek JSON."
    for k in REQUIRED_KEYS:
        if k not in d or not isinstance(d[k], list):
            return f'Field "{k}" wajib ada dan berupa daftar (list).'

    if not d["topics"]:
        return 'Minimal harus ada 1 topik di "topics".'
    if not d["key_concepts"]:
        return 'Minimal harus ada 1 konsep di "key_concepts".'

    topic_ids = set()
    for i, t in enumerate(d["topics"], 1):
        if not isinstance(t, dict) or not isinstance(t.get("id"), str) or not t["id"].strip():
            return f"Topik #{i} wajib punya id string."
        if t["id"] in topic_ids:
            return f'ID topik "{t["id"]}" duplikat.'
        topic_ids.add(t["id"])
        if not isinstance(t.get("title"), str) or not t["title"].strip():
            return f'Topik "{t["id"]}" wajib punya title.'
        if not isinstance(t.get("subtopics"), list):
            return f'Topik "{t["id"]}" wajib punya list subtopics.'

    concept_ids = set()
    for i, c in enumerate(d["key_concepts"], 1):
        if not isinstance(c, dict) or not isinstance(c.get("id"), str) or not c["id"].strip():
            return f"Konsep #{i} wajib punya id string."
        if c["id"] in concept_ids:
            return f'ID konsep "{c["id"]}" duplikat.'
        concept_ids.add(c["id"])
        if c.get("topic_id") not in topic_ids:
            return f'Konsep "{c["id"]}" merujuk topic_id "{c.get("topic_id")}" yang tidak ada.'
        if not isinstance(c.get("name"), str) or not c["name"].strip():
            return f'Konsep "{c["id"]}" wajib punya name.'
        if not isinstance(c.get("summary"), str) or not c["summary"].strip():
            return f'Konsep "{c["id"]}" wajib punya summary.'

    for item in d["needs_expansion"]:
        if not isinstance(item, dict) or item.get("concept_id") not in concept_ids:
            return f'needs_expansion merujuk concept_id tidak valid: {item}'
        if not isinstance(item.get("reason"), str) or not item["reason"].strip():
            return "Setiap item needs_expansion wajib punya reason."

    for item in d["possible_misconceptions"]:
        if not isinstance(item, dict) or item.get("concept_id") not in concept_ids:
            return f'possible_misconceptions merujuk concept_id tidak valid: {item}'

    for rel in d["relations"]:
        if not isinstance(rel, dict) or rel.get("from") not in concept_ids or rel.get("to") not in concept_ids:
            return f'relations merujuk concept_id tidak valid: {rel}'

    for src in d["sources_to_verify"]:
        if not isinstance(src, dict) or not str(src.get("reason", "")).strip():
            return "Setiap item sources_to_verify wajib mencantumkan reason."

    return ""


def run_self_test():
    sample_path = agentkit.ROOT / "shared" / "contracts" / "material_analyst.sample.json"
    sample = json.loads(sample_path.read_text(encoding="utf-8-sig"))
    err = check_analysis(sample["output"])
    if err:
        print(f"[GAGAL] Fixture material_analyst tidak valid: {err}")
        return 1
    print("[OK] Kontrak & fixture Material Analyst valid.")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("material", nargs="?")
    ap.add_argument("out", nargs="?")
    ap.add_argument("--title", default="")
    ap.add_argument("--provider", default="gemini", choices=list(llm.PROVIDERS))
    ap.add_argument("--model")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()

    if a.self_test:
        return run_self_test()
    if not a.material or not a.out:
        ap.error("Argumen material dan out wajib diisi kecuali memakai --self-test.")

    mat_path = Path(a.material)
    text = agentkit.read_text(mat_path).strip()
    if not text:
        print("[GAGAL] Materi kosong.")
        return 1
    if len(text) > MAX_CHARS:
        print(f"[PERHATIAN] Materi {len(text)} huruf; hanya {MAX_CHARS} huruf pertama dipakai.")
        text = text[:MAX_CHARS]

    system = (agentkit.ROOT / "prompts" / "material_analyst" / "v1.md").read_text(encoding="utf-8-sig")
    payload = {
        "material": {
            "id": mat_path.stem,
            "title": a.title or mat_path.stem,
            "text": text,
        },
        "options": {"external_search": False},
    }
    user = json.dumps(payload, ensure_ascii=False, indent=2)

    print(f"Material Analyst menganalisis materi ({len(text)} huruf)...")
    result = agentkit.ask(a.provider, a.model, system, user, check_analysis)

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] {len(result['topics'])} topik, {len(result['key_concepts'])} konsep -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())