"""Jalankan Storyboard Agent lewat API: naskah + waktu kata -> storyboard JSON v1.3 yang sudah divalidasi.

Pemakaian (dari folder utama proyek):
  python tools\\run_storyboard_agent.py naskah\\NAMA.txt apps\\frontend\\remotion\\public\\audio\\NAMA.words.json apps\\frontend\\remotion\\src\\storyboards\\NAMA.json
Pilihan:
  --provider gemini|openrouter|deepseek   --model NAMA_MODEL
  --day "HARI 1/15" --course "Intro to Software Engineering"   (lencana atas)
  --retries 2   (berapa kali minta AI memperbaiki bila ditolak validator)
"""
import argparse
import copy
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import llm  # noqa: E402
import make_agent_input  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
VALIDATOR = ROOT / "apps" / "frontend" / "remotion" / "scripts" / "validate-storyboard.mjs"
PROMPT = ROOT / "prompts" / "storyboard_agent.md"
APPLY = ROOT / "tools" / "apply_word_times.py"
DEFAULT_COMPONENT_VERSION = "1.0.0"
MAX_SCENE_MS = 8000


def extract_json(text):
    t = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", t, re.S)
    if m:
        t = m.group(1).strip()
    a, b = t.find("{"), t.rfind("}")
    if a >= 0 and b > a:
        t = t[a : b + 1]
    return json.loads(t)


def clean_subtitles(sb):
    """Samakan gaya subtitle: tanpa penanda warna, tanda baca menempel ke kata sebelumnya."""
    for sub in sb.get("subtitles", []):
        t = re.sub(r"\{\{\w+:([^}]*)\}\}", r"\1", sub.get("text", ""))
        t = re.sub(r"\s+([,.!?:;])", r"\1", t)
        sub["text"] = " ".join(t.split())
    return sb


def resolve_storyboard_v13(sb):
    """Resolver sistem (DL-10): pastikan schemaVersion 1.3 serta componentId & componentVersion terisi sistem."""
    sb["schemaVersion"] = "1.3"
    for scene in sb.get("scenes", []):
        if not isinstance(scene, dict):
            continue
        comp_id = scene.get("componentId") or scene.get("component") or ""
        scene["componentId"] = comp_id
        scene["componentVersion"] = DEFAULT_COMPONENT_VERSION
        scene.pop("component", None)
    return sb


def _scale_cues(props, offset_ms, part_dur_ms):
    out = copy.deepcopy(props) if isinstance(props, dict) else {}
    for k in ("cuesMs", "revealMs", "uploadMs", "teamMs", "downloadMs"):
        if isinstance(out.get(k), list):
            shifted = [max(0, min(part_dur_ms - 100, int(t - offset_ms))) for t in out[k]]
            out[k] = shifted
    for k in ("headlineMs", "lampOnMs", "rewindMs", "laptopMs", "cloudMs"):
        if isinstance(out.get(k), (int, float)):
            out[k] = max(0, min(part_dur_ms - 100, int(out[k] - offset_ms)))
    return out


def _find_subtitle_split_ms(sb, start_ms, end_ms):
    """Cari batas jeda subtitle terbaik di dekat titik tengah scene [start_ms, end_ms]."""
    mid = (start_ms + end_ms) / 2
    min_bound = start_ms + 2500
    max_bound = end_ms - 2500
    if min_bound >= max_bound:
        return int(mid)

    candidates = []
    for sub in sb.get("subtitles", []):
        for boundary in (sub.get("startMs"), sub.get("endMs")):
            if isinstance(boundary, (int, float)) and min_bound <= boundary <= max_bound:
                candidates.append(int(boundary))
    if not candidates:
        return int(mid)
    return min(candidates, key=lambda t: abs(t - mid))


def _snippet_from_subtitles(sb, start_ms, end_ms):
    """Ambil 2-4 kata kunci dari subtitle pada rentang waktu potongan agar visual tidak dobel."""
    words = []
    for sub in sb.get("subtitles", []):
        s0, s1 = sub.get("startMs", 0), sub.get("endMs", 0)
        if s1 > start_ms and s0 < end_ms:
            clean_txt = re.sub(r"\{\{\w+:([^}]*)\}\}", r"\1", sub.get("text", ""))
            clean_txt = re.sub(r"[^\w\s-]", "", clean_txt)
            words.extend(clean_txt.split())
    if not words:
        return "Poin Penting Berikutnya"
    return " ".join(words[:4]).capitalize()


def split_long_scenes_fallback(sb):
    """Cadangan terakhir (DL-8): pecah paksa scene > 8000 ms tepat di jeda subtitle tanpa teks dobel."""
    scenes = sb.get("scenes")
    if not isinstance(scenes, list):
        return sb

    changed = True
    while changed:
        changed = False
        next_scenes = []
        for sc in scenes:
            dur = sc.get("durationMs", 0)
            start = sc.get("startMs", 0)
            if not isinstance(dur, (int, float)) or dur <= MAX_SCENE_MS:
                next_scenes.append(sc)
                continue

            changed = True
            end = int(start + dur)
            split_at = _find_subtitle_split_ms(sb, int(start), end)
            dur1 = split_at - int(start)
            dur2 = end - split_at
            orig_comp = sc.get("componentId") or sc.get("component") or "BigStatement"
            second_comp = "BigStatement" if orig_comp != "BigStatement" else "IconHero"
            second_text = _snippet_from_subtitles(sb, split_at, end)

            part1 = {
                "id": f"{sc.get('id', 'scene')}-a",
                "startMs": int(start),
                "durationMs": dur1,
                "componentId": orig_comp,
                "componentVersion": DEFAULT_COMPONENT_VERSION,
                "props": _scale_cues(sc.get("props", {}), 0, dur1),
                "transition": sc.get("transition", "fade"),
            }
            part2 = {
                "id": f"{sc.get('id', 'scene')}-b",
                "startMs": split_at,
                "durationMs": dur2,
                "componentId": second_comp,
                "componentVersion": DEFAULT_COMPONENT_VERSION,
                "props": (
                    {"icon": "bulb", "lines": [{"text": second_text, "color": "orange"}]}
                    if second_comp == "BigStatement"
                    else {"icon": "bulb", "title": second_text, "color": "orange", "motion": "float"}
                ),
                "transition": "slide",
            }
            next_scenes.extend([part1, part2])
        scenes = next_scenes

    for i, s in enumerate(scenes, 1):
        s["id"] = f"scene-{i:03d}"
    sb["scenes"] = scenes
    return sb


def validate(path):
    r = subprocess.run(["node", str(VALIDATOR), str(path)], capture_output=True, text=True, encoding="utf-8")
    return r.returncode == 0, (r.stdout + r.stderr).strip()


def run_self_test():
    sample = {
        "schemaVersion": "1.3",
        "video": {"title": "Diagram Test", "width": 1080, "height": 1920, "fps": 30, "durationMs": 3000},
        "audio": {"src": "audio/uji-tutor.wav", "durationMs": 3000},
        "scenes": [{
            "id": "scene-001",
            "startMs": 0,
            "durationMs": 3000,
            "componentId": "DiagramScene",
            "componentVersion": "1.0.0",
            "props": {
                "layout": "column",
                "nodes": [
                    {"id": "a", "label": "Masukan", "icon": "file"},
                    {"id": "b", "label": "Proses", "icon": "gear"},
                    {"id": "c", "label": "Simpan", "icon": "database"},
                    {"id": "d", "label": "Hasil", "icon": "check"},
                ],
                "edges": [{"from": "a", "to": "b", "label": "Masuk"}, {"from": "b", "to": "c", "label": "Simpan"}],
            },
            "transition": "fade",
        }],
        "subtitles": [{"id": "sub-001", "startMs": 0, "endMs": 3000, "text": "Alur data ringkas."}],
    }
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", encoding="utf-8", delete=False) as f:
        json.dump(sample, f, ensure_ascii=False)
        temp_path = Path(f.name)
    try:
        ok, report = validate(temp_path)
    finally:
        temp_path.unlink(missing_ok=True)
    if not ok:
        print(f"[GAGAL] Fixture Storyboard tidak valid:\n{report}")
        return 1
    print("[OK] Kontrak & fixture Storyboard (DiagramScene column, 4 node, label panah <=12) valid.")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script", nargs="?")
    ap.add_argument("words", nargs="?")
    ap.add_argument("out", nargs="?")
    ap.add_argument("--provider", default="gemini", choices=list(llm.PROVIDERS))
    ap.add_argument("--model", default=None)
    ap.add_argument("--day", default=None)
    ap.add_argument("--course", default=None)
    ap.add_argument("--retries", type=int, default=2)
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()

    if a.self_test:
        return run_self_test()
    if not a.script or not a.words or not a.out:
        ap.error("Argumen script, words, dan out wajib diisi kecuali memakai --self-test.")

    naskah = " ".join(Path(a.script).read_text(encoding="utf-8-sig").split())
    words = json.loads(Path(a.words).read_text(encoding="utf-8-sig"))
    system = PROMPT.read_text(encoding="utf-8-sig")
    user = "NASKAH:\n" + naskah + "\n\nInfo audio dan potongan ucapan:\n" + make_agent_input.build(words)
    if a.day and a.course:
        user += f'\n\nLencana: day "{a.day}", course "{a.course}"'

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    messages = [("user", user)]
    ok, report = False, ""
    last_sb = None
    for attempt in range(a.retries + 1):
        print(f"[{attempt + 1}/{a.retries + 1}] Minta {a.provider} membuat storyboard...")
        reply = llm.generate_json(a.provider, system, messages, a.model)
        try:
            sb = extract_json(reply)
        except json.JSONDecodeError as e:
            report = f"Jawaban bukan JSON valid: {e}"
            print("   ", report)
            messages += [("model", reply), ("user", report + "\nKeluarkan hanya JSON lengkap yang valid.")]
            continue
        sb = resolve_storyboard_v13(clean_subtitles(sb))
        last_sb = sb
        out.write_text(json.dumps(sb, ensure_ascii=False, indent=2), encoding="utf-8")
        ok, report = validate(out)
        print(report)
        if ok:
            break
        long_scenes = [ln for ln in report.splitlines() if "8000 ms" in ln]
        if long_scenes:
            print("    Ada scene lebih dari 8 detik, minta AI memecahnya...")
        fix = "Validator menolak storyboard ini:\n" + report + "\nPerbaiki dan keluarkan JSON lengkap yang baru (pastikan setiap scene 3000-8000 ms dan tidak ada celah waktu), hanya JSON."
        messages += [("model", reply), ("user", fix)]

    if not ok and last_sb is not None:
        print("\n[CADANGAN] Menjalankan pemecah scene panjang otomatis...")
        sb = resolve_storyboard_v13(split_long_scenes_fallback(last_sb))
        out.write_text(json.dumps(sb, ensure_ascii=False, indent=2), encoding="utf-8")
        ok, report = validate(out)
        print(report)

    if not ok:
        print(f"\n[GAGAL] Belum lolos validator setelah {a.retries + 1} percobaan. Hasil terakhir ada di {out}.")
        return 1

    print("\nMemasang waktu kata asli...")
    r = subprocess.run([sys.executable, str(APPLY), str(out), a.words], capture_output=True, text=True, encoding="utf-8")
    print(r.stdout[-600:] + r.stderr)
    if r.returncode != 0:
        return 1
    ok, report = validate(out)
    print(report)
    print(f"\n[OK] Storyboard v1.3 siap: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())