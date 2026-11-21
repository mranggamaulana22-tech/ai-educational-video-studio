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


def make_checker(expected_concept_ids=None, weak_concept_ids=None):
    expected = set(expected_concept_ids or [])
    weak_ids = set(weak_concept_ids or [])

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

        if weak_ids:
            weak_not_marked = set()
            weak_marked_by_omission = {
                str(item["concept_id"]) for item in omitted
                if "belum dibahas" in str(item.get("reason", "")).lower()
            }
            weak_marked_in_sections = {
                cid for s in sections for cid in s.get("concept_ids", [])
                if cid in weak_ids and "belum dibahas" in str(s.get("body_md", "")).lower()
            }
            weak_not_marked = weak_ids - weak_marked_by_omission - weak_marked_in_sections
            if weak_not_marked:
                return f"Konsep yang statusnya belum dibahas harus ditandai jelas: {sorted(weak_not_marked)}"

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


def enrich_session_content(result, session_data):
    if not isinstance(session_data, dict):
        return result

    weak_ids = {
        str(c["id"]) for c in session_data.get("concepts", []) or []
        if isinstance(c, dict) and c.get("status") == "belum" and str(c.get("id", "")).strip()
    }
    sections = result.get("sections", []) or []

    for concept in session_data.get("concepts", []) or []:
        if not isinstance(concept, dict):
            continue
        cid = str(concept.get("id", "")).strip()
        analogies = concept.get("analogies", []) or []
        if not cid or not analogies:
            continue
        matched = False
        for section in sections:
            if cid in (section.get("concept_ids", []) or []):
                examples = section.setdefault("examples", [])
                if not isinstance(examples, list):
                    examples = []
                    section["examples"] = examples
                existing = {str(ex.get("text", "")) for ex in examples if isinstance(ex, dict)}
                for analogy in analogies:
                    if isinstance(analogy, str) and analogy.strip() and analogy not in existing:
                        examples.append({"kind": "analogi dari sesi", "text": analogy})
                matched = True

        if not matched:
            next_id = f"s{len(sections) + 1}"
            sections.append({
                "id": next_id,
                "heading": f"Konsep sesi: {concept.get('name', cid)}",
                "body_md": "Analogi dari sesi belajar",
                "concept_ids": [cid],
                "key_terms": [],
                "examples": [
                    {"kind": "analogi dari sesi", "text": analogy}
                    for analogy in analogies if isinstance(analogy, str) and analogy.strip()
                ],
                "basis": ["session"],
            })

    for section in sections:
        cids = set(str(cid) for cid in section.get("concept_ids", []) or [])
        if cids & weak_ids:
            body = str(section.get("body_md", "")).strip()
            marker = "⚠ BELUM DIBAHAS: konsep ini belum mencapai status paham dalam sesi."
            if marker not in body:
                section["body_md"] = f"{body}\n\n{marker}".strip()

    omitted = result.setdefault("omitted_concepts", [])
    omitted_ids = {str(item.get("concept_id", "")) for item in omitted if isinstance(item, dict)}
    covered_ids = {str(cid) for section in sections for cid in section.get("concept_ids", []) or []}
    for cid in sorted(weak_ids):
        if cid not in covered_ids and cid not in omitted_ids:
            omitted.append({
                "concept_id": cid,
                "reason": "BELUM DIBAHAS: status konsep masih belum dalam sesi.",
            })

    for item in omitted:
        if isinstance(item, dict) and str(item.get("concept_id", "")) in weak_ids:
            reason = str(item.get("reason", "")).strip()
            if "belum dibahas" not in reason.lower():
                item["reason"] = f"BELUM DIBAHAS: {reason}".strip()

    return result


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
    ap.add_argument("--session", help="Path opsional ke file .session.json hasil diskusi Tutor")
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

    session_data = None
    if a.session and Path(a.session).exists():
        session_data = json.loads(Path(a.session).read_text(encoding="utf-8-sig"))
        if session_data.get("skipped") is True:
            session_data = None

    weak_ids = []
    if session_data:
        weak_ids = [
            str(c["id"]) for c in session_data.get("concepts", []) or []
            if isinstance(c, dict) and c.get("status") == "belum" and str(c.get("id", "")).strip()
        ]

    system = (agentkit.ROOT / "prompts" / "learning_notes" / "v1.md").read_text(encoding="utf-8-sig")
    payload = {
        "material_text": text,
        "analysis_brief": {
            "key_concepts": analysis_data.get("key_concepts", []),
            "technical_terms": [t.get("term") for t in analysis_data.get("technical_terms", [])],
            "gaps": analysis_data.get("gaps", []),
        },
        "session": session_data,
    }
    user = json.dumps(payload, ensure_ascii=False, indent=2)

    print("Learning Notes Agent menyusun catatan terstruktur...")
    result = agentkit.ask(a.provider, a.model, system, user, make_checker(expected_ids, weak_ids))
    result = enrich_session_content(result, session_data)

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