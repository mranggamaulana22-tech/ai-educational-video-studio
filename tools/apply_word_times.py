"""Pasang waktu kata asli (hasil align_audio.py) ke subtitle di storyboard.

Teks subtitle tetap dari storyboard (naskahmu); Whisper hanya memberi waktu.
Hasilnya: tiap subtitle mendapat "wordStartsMs" (waktu mulai tiap kata), dan
startMs/endMs subtitle disesuaikan dengan suara sebenarnya.

Pemakaian (dari folder utama proyek):
  python tools\\apply_word_times.py STORYBOARD.json KATA.words.json
Pilihan: --pad 150   (ms subtitle dipertahankan setelah kata terakhir)
"""
import argparse
import difflib
import json
import re
import sys
from pathlib import Path

TOKEN = re.compile(r"\{\{(\w+):([^}]+)\}\}|\S+")


def script_words(text):
    """Pecah teks subtitle jadi kata, sama persis dengan yang dilakukan pemutar video."""
    out = []
    for m in TOKEN.finditer(text):
        if m.group(1):
            out.extend(m.group(2).split())
        else:
            out.append(m.group(0))
    return out


def norm(s):
    return re.sub(r"[^0-9a-z]", "", s.lower())


def match_times(script, words):
    """Cocokkan kata naskah dengan kata Whisper lewat kemiripan huruf.
    Mengembalikan [(start, end) atau None] untuk tiap kata naskah, dan jumlah yang cocok."""
    a_str, a_owner = "", []
    for k, w in enumerate(words):
        n = norm(w["text"])
        a_str += n
        a_owner += [k] * len(n)
    b_str, b_owner = "", []
    for g, t in enumerate(script):
        n = norm(t)
        b_str += n
        b_owner += [g] * len(n)

    hits = [set() for _ in script]
    sm = difflib.SequenceMatcher(None, a_str, b_str, autojunk=False)
    for i, j, size in sm.get_matching_blocks():
        for t in range(size):
            hits[b_owner[j + t]].add(a_owner[i + t])

    res = []
    for h in hits:
        if h:
            res.append((min(words[k]["startMs"] for k in h), max(words[k]["endMs"] for k in h)))
        else:
            res.append(None)
    return res, sum(1 for r in res if r)


def fill_gaps(script, res, total_ms):
    """Kata naskah yang tidak cocok: bagi rata di antara tetangga yang cocok."""
    n = len(res)
    out = list(res)
    i = 0
    while i < n:
        if out[i] is not None:
            i += 1
            continue
        j = i
        while j < n and out[j] is None:
            j += 1
        left = out[i - 1][1] if i > 0 else 0
        right = out[j][0] if j < n else total_ms
        right = max(right, left)
        weights = [len(norm(script[k])) + 2 for k in range(i, j)]
        tot = sum(weights)
        acc = 0
        for k, wt in zip(range(i, j), weights):
            s = left + (right - left) * acc / tot
            acc += wt
            e = left + (right - left) * acc / tot
            out[k] = (round(s), round(e))
        i = j
    return out


def main():
    ap = argparse.ArgumentParser(description="Pasang waktu kata ke storyboard")
    ap.add_argument("storyboard")
    ap.add_argument("words", help="hasil align_audio.py (.words.json)")
    ap.add_argument("--pad", type=int, default=150)
    args = ap.parse_args()

    sb_path = Path(args.storyboard)
    sb = json.loads(sb_path.read_text(encoding="utf-8-sig"))
    wd = json.loads(Path(args.words).read_text(encoding="utf-8-sig"))
    words = wd["words"]
    total_ms = sb["video"]["durationMs"]
    subs = sb["subtitles"]

    per_sub = [script_words(s["text"]) for s in subs]
    flat = [w for ws in per_sub for w in ws]
    res, matched = match_times(flat, words)
    res = fill_gaps(flat, res, total_ms)

    # Mulai kata harus naik terus.
    starts = []
    prev = 0
    for s, _ in res:
        prev = max(prev, s)
        starts.append(prev)
    ends = [max(e, s) for (s, e) in zip(starts, [r[1] for r in res])]

    print(f"Cocok {matched} dari {len(flat)} kata naskah ({100 * matched // max(1, len(flat))}%).")
    print(f"{'subtitle':9} {'lama':>13}  {'baru':>13}   selisih")
    pos = 0
    for idx, (s, ws) in enumerate(zip(subs, per_sub)):
        st = starts[pos : pos + len(ws)]
        en = ends[pos : pos + len(ws)]
        pos += len(ws)
        old_s, old_e = s["startMs"], s["endMs"]
        new_s = st[0]
        next_start = starts[pos] if pos < len(starts) else total_ms
        new_e = min(en[-1] + args.pad, next_start, total_ms)
        new_e = max(new_e, st[-1] + 80)
        s["startMs"], s["endMs"] = int(new_s), int(new_e)
        s["wordStartsMs"] = [int(x) for x in st]
        flag = "  <-- cek" if abs(new_s - old_s) > 300 or abs(new_e - old_e) > 400 else ""
        print(
            f"{s['id']:9} {old_s / 1000:6.2f}-{old_e / 1000:6.2f}  {new_s / 1000:6.2f}-{new_e / 1000:6.2f}  "
            f"{(new_s - old_s) / 1000:+5.2f}/{(new_e - old_e) / 1000:+5.2f}{flag}"
        )

    sb_path.write_text(json.dumps(sb, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[OK] Disimpan: {sb_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
