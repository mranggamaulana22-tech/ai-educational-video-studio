"""Alat bantu bersama untuk agen berbasis API: parse JSON, panggil AI dengan pemeriksaan + perbaikan otomatis."""
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

sys.path.insert(0, str(Path(__file__).parent))
import llm  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def parse_json(reply):
    t = reply.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", t, re.S)
    if m:
        t = m.group(1).strip()
    a, b = t.find("{"), t.rfind("}")
    if a >= 0 and b > a:
        t = t[a : b + 1]
    return json.loads(t)


def ask(provider, model, system, user, check, tries=3):
    """Panggil AI; check(data) mengembalikan pesan masalah atau ''. Bila ada masalah, minta AI memperbaiki."""
    messages = [("user", user)]
    for _ in range(tries):
        reply = llm.generate_json(provider, system, messages, model)
        try:
            data = parse_json(reply)
            problem = check(data)
        except (json.JSONDecodeError, TypeError, AttributeError) as e:
            data, problem = None, f"Jawaban bukan JSON valid ({e}). Keluarkan hanya JSON."
        if not problem:
            return data
        print(f"    Ditolak: {problem}")
        messages += [("model", reply), ("user", problem + " Perbaiki dan keluarkan JSON lengkap yang baru, hanya JSON.")]
    raise SystemExit("[GAGAL] AI belum menghasilkan jawaban yang memenuhi aturan setelah beberapa percobaan.")


def read_text(path):
    """Baca .txt/.md atau .docx (tanpa pustaka tambahan)."""
    p = Path(path)
    if p.suffix.lower() == ".docx":
        with zipfile.ZipFile(p) as z:
            xml = z.read("word/document.xml")
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        root = ElementTree.fromstring(xml)
        paras = []
        for para in root.iter("{%s}p" % ns["w"]):
            paras.append("".join(t.text or "" for t in para.iter("{%s}t" % ns["w"])))
        return "\n".join(x for x in paras if x.strip())
    return p.read_text(encoding="utf-8-sig")
