"""Buat teks masukan untuk Storyboard Agent dari hasil align_audio.py.

Pemakaian: python tools\\make_agent_input.py apps\\remotion\\public\\audio\\NAMA.words.json
"""
import argparse
import json
from pathlib import Path


def build(d, gap=350):
    words = d["words"]
    groups, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        nxt = words[i + 1]["startMs"] if i + 1 < len(words) else None
        end = w["text"].rstrip()[-1:] in ".?!"
        if nxt is None or end or nxt - w["endMs"] >= gap:
            groups.append(cur)
            cur = []
    lines = [
        f"audio.src: audio/{d['audio']}",
        f"durasi audio (ms): {d['durationMs']}",
        f"suara berakhir (ms): {words[-1]['endMs']}",
        "potongan ucapan (mulai-selesai ms | teks):",
    ]
    for g in groups:
        lines.append(f"[{g[0]['startMs']}-{g[-1]['endMs']}] " + " ".join(w["text"] for w in g))
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("words")
    ap.add_argument("--gap", type=int, default=350)
    a = ap.parse_args()
    print(build(json.loads(Path(a.words).read_text(encoding="utf-8-sig")), a.gap))


if __name__ == "__main__":
    main()
