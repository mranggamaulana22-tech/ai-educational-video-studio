"""Ambil waktu tiap kata dari file audio memakai Whisper (lokal, gratis), lalu rapikan
batas katanya memakai jeda asli di audio.

Pemakaian (dari folder utama proyek):
  .venv-audio\\Scripts\\python.exe tools\\align_audio.py AUDIO.wav HASIL.words.json
Pilihan: --model small   (base lebih cepat tapi kurang akurat)
"""
import argparse
import json
import sys
import time
from pathlib import Path

SR = 16000


def transcribe_words(audio, model_name="small", language="id"):
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        audio,
        language=language,
        word_timestamps=True,
        beam_size=5,
        condition_on_previous_text=False,
    )
    words = []
    for seg in segments:
        for w in seg.words or []:
            text = w.word.strip()
            if not text:
                continue
            words.append(
                {"text": text, "startMs": round(w.start * 1000), "endMs": round(w.end * 1000)}
            )
    return words, round(info.duration * 1000)


def load_samples(audio):
    from faster_whisper.audio import decode_audio

    return decode_audio(audio, sampling_rate=SR)


def find_silences(samples, thr_db=-40.0, min_ms=180):
    """Daftar jeda (mulai_ms, selesai_ms): bagian hening minimal min_ms."""
    import numpy as np

    hop = SR // 100  # 10 ms
    n = len(samples) // hop
    x = np.asarray(samples[: n * hop], dtype="float64").reshape(n, hop)
    db = 20 * np.log10(np.sqrt((x**2).mean(axis=1)) + 1e-9)
    quiet = db < thr_db
    out = []
    i = 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if (j - i) * 10 >= min_ms:
                out.append((i * 10, j * 10))
            i = j
        else:
            i += 1
    return out


def refine_words(words, silences, min_word_ms=60):
    """Whisper sering 'memakan' jeda ke kata di sebelahnya. Perbaiki memakai jeda asli."""
    ws = [dict(w) for w in words]

    def covering(t):
        for a, b in silences:
            if a <= t < b:
                return a, b
        return None

    # 1. Tepi kata yang jatuh di dalam jeda digeser ke tepi jeda.
    for w in ws:
        s = covering(w["startMs"])
        if s:
            w["startMs"] = s[1]
        e = covering(w["endMs"] - 1)
        if e:
            w["endMs"] = max(e[0], w["startMs"])

    # 2. Jeda yang ada di tengah satu kata: kata itu sebenarnya mulai setelah jeda,
    #    kata sebelumnya berakhir sebelum jeda.
    for i, w in enumerate(ws):
        for a, b in silences:
            if w["startMs"] < a and b < w["endMs"]:
                w["startMs"] = b
                if i > 0:
                    ws[i - 1]["endMs"] = max(a, ws[i - 1]["startMs"])
                break

    # 3. Celah atau tumpang tindih antar kata yang bukan jeda: bagi dua di tengah.
    for i in range(1, len(ws)):
        prev, w = ws[i - 1], ws[i]
        if w["startMs"] > prev["endMs"]:
            g0, g1 = prev["endMs"], w["startMs"]
            quiet = sum(max(0, min(g1, b) - max(g0, a)) for a, b in silences)
            if quiet < 0.5 * (g1 - g0):
                mid = (g0 + g1) // 2
                prev["endMs"] = mid
                w["startMs"] = mid
        elif w["startMs"] < prev["endMs"]:
            mid = (w["startMs"] + prev["endMs"]) // 2
            prev["endMs"] = mid
            w["startMs"] = mid

    # 4. Durasi minimal.
    for i, w in enumerate(ws):
        if w["endMs"] - w["startMs"] < min_word_ms:
            w["endMs"] = w["startMs"] + min_word_ms
            if i + 1 < len(ws) and ws[i + 1]["startMs"] < w["endMs"]:
                ws[i + 1]["startMs"] = w["endMs"]
    return ws


def main():
    ap = argparse.ArgumentParser(description="Waktu tiap kata dari audio (Whisper)")
    ap.add_argument("audio", help="file audio (wav/mp3)")
    ap.add_argument("out", help="file hasil .json")
    ap.add_argument("--model", default="small")
    ap.add_argument("--lang", default="id")
    args = ap.parse_args()

    audio = Path(args.audio)
    if not audio.exists():
        print(f"[GAGAL] File audio tidak ditemukan: {audio}")
        return 1

    print(f"Memuat model '{args.model}' (pertama kali akan mengunduh, mohon tunggu)...")
    t0 = time.time()
    words, duration_ms = transcribe_words(str(audio), args.model, args.lang)
    silences = find_silences(load_samples(str(audio)))
    words = refine_words(words, silences)
    took = time.time() - t0

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "audio": audio.name,
        "durationMs": duration_ms,
        "model": args.model,
        "silences": [list(s) for s in silences],
        "words": words,
    }
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

    for i, w in enumerate(words, 1):
        print(f"{i:3d}  {w['startMs'] / 1000:6.2f} - {w['endMs'] / 1000:6.2f}  {w['text']}")
    print(
        f"\n[OK] {len(words)} kata, {len(silences)} jeda, suara berakhir di {words[-1]['endMs'] / 1000:.2f} dtk "
        f"(durasi audio {duration_ms / 1000:.2f} dtk), diproses {took:.0f} dtk."
    )
    print(f"Disimpan: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
