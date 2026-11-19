"""Learning Notes Agent: materi + hasil analisis -> catatan belajar (.notes.json + .notes.md).

Pemakaian (dari folder utama proyek):
  python tools\\run_learning_notes.py catatan\\hari2-sdlc.txt catatan\\hari2-sdlc.analysis.json catatan\\hari2-sdlc.notes.json
  python tools\\run_learning_notes.py --self-test
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import agentkit  # noqa: E402
import llm  # noqa: E402

MAX_CHARS = 120000
VALID_BASIS = {"material", "analysis", "session"}


def make_checker(expected_concept_ids=None):
    expected = set(expected_concept_ids or [])

    def check_notes(d):
        if not isinstance(d, dict):
            return "Output harus berupa objek JSON."
        if not isinstance(d.get("title"), str) or not d["title"].strip():
            return 'Field "title" wajib diisi.'
        sections = d.get("sections")
        if not isinstance(sections, list) or not sections:
            return 'Field "sections" harus berupa daftar dan minimal berisi 1 bagian.'
        if not isinstance(d.get("open_questions"), list):
            return 'Field "open_questions" wajib berupa daftar.'
        omitted = d.get("omitted_concepts")
        if not isinstance(omitted, list):
            return 'Field "omitted_concepts" wajib berupa daftar.'

        sec_ids = set()
        covered_concepts = set()
        for i, s in enumerate(sections, 1):
            if not isinstance(s, dict):
                return f"Section #{i} harus objek."
            sid = s.get("id")
            if not isinstance(sid, str) or not sid.strip():
                return f"Section #{i} wajib punya id."
            if sid in sec_ids:
                return f'ID section "{sid}" duplikat.'
            sec_ids.add(sid)

            if not isinstance(s.get("heading"), str) or not s["heading"].strip():
                return f'Section "{sid}" wajib punya heading.'
            if not isinstance(s.get("body_md"), str) or not s["body_md"].strip():
                return f'Section "{sid}" wajib punya body_md.'

            basis = s.get("basis")
            if not isinstance(basis, list) or not basis or not all(b in VALID_BASIS for b in basis):
                return f'Section "{sid}" wajib punya basis valid (material/analysis/session).'

            cids = s.get("concept_ids")
            if not isinstance(cids, list):
                return f'Section "{sid}" wajib punya list concept_ids.'
            covered_concepts.update(cids)

        omitted_ids = set()
        for item in omitted:
            if not isinstance(item, dict) or not str(item.get("concept_id", "")).strip():
                return "Setiap omitted_concepts wajib punya concept_id."
            if not str(item.get("reason", "")).strip():
                return f'omitted_concepts "{item.get("concept_id")}" wajib mencantumkan reason.'
            omitted_ids.add(item["concept_id"])

        if expected:
            missing = expected - (covered_concepts | omitted_ids)
            if missing:
                return f"Konsep dari analisis belum tercakup di sections maupun omitted_concepts: {sorted(missing)}"

        return ""

    return check_notes


def to_markdown(d):
    out = [f"# {d.get('title', 'Catatan Belajar')}", ""]
    for i, s in enumerate(d["sections"], 1):
        basis_str = ", ".join(s.get("basis", []))
        out += [f"## {i}. {s['heading']} (`{s['id']}`)", s["body_md"], ""]
        for kt in s.get("key_terms") or []:
            out.append(f"- **{kt.get('term', '')}**: {kt.get('definition', '')}")
        for ex in s.get("examples") or []:
            out.append(f"- *{ex.get('kind', 'contoh').capitalize()}*: {ex.get('text', '')}")
        out += [f"_Basis: {basis_str}_", ""]

    if d.get("open_questions"):
        out += ["## Pertanyaan Terbuka", *[f"- {q}" for q in d["open_questions"]], ""]
    if d.get("omitted_concepts"):
        out += [
            "## Konsep yang Tidak Dimasukkan",
            *[f"- `{o['concept_id']}`: {o['reason']}" for o in d["omitted_concepts"]],
            "",
        ]
    return "\n".join(out)


def run_self_test():
    sample_path = agentkit.ROOT / "shared" / "contracts" / "learning_notes.sample.json"
    sample = json.loads(sample_path.read_text(encoding="utf-8-sig"))
    expected = [c["id"] for c in sample["input"]["analysis_brief"]["key_concepts"]]
    err = make_checker(expected)(sample["output"])
    if err:
        print(f"[GAGAL] Fixture learning_notes tidak valid: {err}")
        return 1
    print("[OK] Kontrak & fixture Learning Notes valid.")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("material", nargs="?")
    ap.add_argument("analysis", nargs="?")
    ap.add_argument("out", nargs="?")
    ap.add_argument("--provider", default="gemini", choices=list(llm.PROVIDERS))
    ap.add_argument("--model")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()

    if a.self_test:
        return run_self_test()
    if not a.material or not a.analysis or not a.out:
        ap.error("Argumen material, analysis, dan out wajib diisi kecuali memakai --self-test.")

    text = agentkit.read_text(a.material).strip()
    if not text:
        print("[GAGAL] Materi kosong.")
        return 1
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS]

    analysis_data = json.loads(Path(a.analysis).read_text(encoding="utf-8-sig"))
    expected_ids = [c["id"] for c in analysis_data.get("key_concepts", []) if isinstance(c, dict) and "id" in c]

    system = (agentkit.ROOT / "prompts" / "learning_notes" / "v1.md").read_text(encoding="utf-8-sig")
    payload = {
        "material_text": text,
        "analysis_brief": {
            "key_concepts": analysis_data.get("key_concepts", []),
            "technical_terms": [t.get("term") for t in analysis_data.get("technical_terms", [])],
            "gaps": analysis_data.get("gaps", []),
        },
        "session": None,
    }
    user = json.dumps(payload, ensure_ascii=False, indent=2)

    print("Learning Notes Agent menyusun catatan terstruktur...")
    result = agentkit.ask(a.provider, a.model, system, user, make_checker(expected_ids))

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    md = out.with_suffix(".md")
    md.write_text(to_markdown(result), encoding="utf-8")
    print(f"[OK] {len(result['sections'])} bagian catatan -> {out}")
    print(f"Baca dan periksa (Approval 1): {md}")
    return 0


if __name__ == "__main__":
    sys.exit(main())