"""Lapisan penyedia model (Provider Adapter). Ganti penyedia cukup lewat --provider.

Penyedia: gemini, openrouter, deepseek.
Kunci dibaca dari variabel lingkungan atau file .env di folder utama proyek:
  GEMINI_API_KEY, OPENROUTER_API_KEY, DEEPSEEK_API_KEY
"""
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

PROVIDERS = {
    "gemini": {"key": "GEMINI_API_KEY", "model": "gemini-3.5-flash-lite"},
    "openrouter": {
        "key": "OPENROUTER_API_KEY",
        "model": "deepseek/deepseek-chat-v3.1:free",
        "url": "https://openrouter.ai/api/v1/chat/completions",
    },
    "deepseek": {
        "key": "DEEPSEEK_API_KEY",
        "model": "deepseek-chat",
        "url": "https://api.deepseek.com/chat/completions",
    },
}


def read_key(name):
    v = os.environ.get(name, "").strip()
    if v:
        return v
    env = Path(".env")
    if env.exists():
        for line in env.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def _post(url, headers, body):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"), headers={"Content-Type": "application/json", **headers}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"[GAGAL] Penyedia menjawab {e.code}:\n{e.read().decode('utf-8', 'replace')[:1500]}")
    except urllib.error.URLError as e:
        raise SystemExit(f"[GAGAL] Tidak bisa menghubungi penyedia: {e.reason}")


def generate_json(provider, system, messages, model=None):
    """messages = [("user"|"model", teks), ...]. Mengembalikan teks jawaban (diharapkan JSON)."""
    cfg = PROVIDERS[provider]
    key = read_key(cfg["key"])
    if not key:
        raise SystemExit(f"[GAGAL] {cfg['key']} belum diisi (variabel lingkungan atau file .env).")
    model = model or cfg["model"]

    if provider == "gemini":
        base = os.environ.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com")
        url = f"{base}/v1beta/models/{model}:generateContent"
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": r, "parts": [{"text": t}]} for r, t in messages],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.4},
        }
        data = _post(url, {"x-goog-api-key": key}, body)
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise SystemExit("[GAGAL] Jawaban kosong:\n" + json.dumps(data, ensure_ascii=False)[:1500])

    url = os.environ.get(provider.upper() + "_URL", cfg["url"])
    msgs = [{"role": "system", "content": system}] + [
        {"role": "assistant" if r == "model" else "user", "content": t} for r, t in messages
    ]
    body = {"model": model, "messages": msgs, "temperature": 0.4, "response_format": {"type": "json_object"}}
    data = _post(url, {"Authorization": f"Bearer {key}"}, body)
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise SystemExit("[GAGAL] Jawaban kosong:\n" + json.dumps(data, ensure_ascii=False)[:1500])
