r"""Generate Felisa voice assets with Gemini TTS or the legacy Azure provider.

Usage:
  .\.venv-audio\Scripts\python.exe tools\generate_felisa_voice.py --only greeting_pagi --lang id
  .\.venv-audio\Scripts\python.exe tools\generate_felisa_voice.py --only status_running_v1 --lang id
  .\.venv-audio\Scripts\python.exe tools\generate_felisa_voice.py --force
"""

import argparse
import hashlib
import html
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "apps" / "frontend" / "public" / "audio" / "felisa"
STYLE_VERSION = "felisa-style-v1"

VOICES = {
    "ava": {
        "name": "en-US-AvaMultilingualNeural",
        "label": "Ava — Hangat & Ekspresif",
    },
    "emma": {
        "name": "en-US-EmmaMultilingualNeural",
        "label": "Emma — Lembut & Natural",
    },
    "jenny": {
        "name": "en-US-JennyMultilingualNeural",
        "label": "Jenny — Jelas & Bersahabat",
    },
    "xiaoxiao": {"name": "zh-CN-XiaoxiaoMultilingualNeural", "label": "Xiaoxiao — Halus & Muda"},
    "aria": {"name": "en-US-AriaNeural", "label": "Aria — Ceria & Dinamis"},
    "michelle": {"name": "en-US-MichelleNeural", "label": "Michelle — Hangat & Profesional"},
    "sara": {"name": "en-US-SaraNeural", "label": "Sara — Ceria & Jelas"},
    "gadis": {"name": "id-ID-GadisNeural", "label": "Gadis — Alami & Lokal"},
    "serena": {"name": "en-US-SerenaMultilingualNeural", "label": "Serena — Empatik & Ekspresif"},
    "phoebe": {"name": "en-US-PhoebeMultilingualNeural", "label": "Phoebe — Hangat & Tenang"},
    "nancy": {"name": "en-US-NancyMultilingualNeural", "label": "Nancy — Ceria & Humoris"},
    "evelyn": {"name": "en-US-EvelynMultilingualNeural", "label": "Evelyn — Elegan & Natural"},
    "cora": {"name": "en-US-CoraNeural", "label": "Cora — Jelas & Profesional"},
    "lola": {"name": "en-US-LolaNeural", "label": "Lola — Ceria & Muda"},
    "ada": {"name": "en-GB-AdaMultilingualNeural", "label": "Ada — Ramah & Modern"},
    "nova": {"name": "en-US-NovaTurboMultilingualNeural", "label": "Nova — Cepat & Enerjik"},
    "shimmer": {"name": "en-US-ShimmerTurboMultilingualNeural", "label": "Shimmer — Dinamis & Cerah"},
}

LANGUAGES = {
    "id": {"label": "Indonesia", "locale": "id-ID"},
    "en": {"label": "English", "locale": "en-US"},
}

LINES = {
    "id": {
        "greeting_pagi": "Hai, aku Felisa. Selamat pagi. Hari ini kita mau ngapain?",
        "greeting_siang": "Hai, aku Felisa. Selamat siang. Hari ini kita mau ngapain?",
        "greeting_sore": "Hai, aku Felisa. Selamat sore. Hari ini kita mau ngapain?",
        "greeting_malam": "Hai, aku Felisa. Selamat malam. Hari ini kita mau ngapain?",
        "status_running_v1": "Saya sedang mengerjakan tahap produksi. Pantau perkembangannya di studio ya.",
        "status_running_v2": "Tahap ini masih berjalan. Saya tetap memantau pembaruan untuk kita.",
        "status_completed_v1": "Tahap produksi sudah selesai. Hasilnya siap ditinjau atau kita lanjutkan.",
        "status_completed_v2": "Satu tahap sudah selesai. Kita bisa lanjut ke langkah berikutnya.",
        "status_failed_v1": "Tahap produksi belum berhasil. Kita bisa cek penyebabnya bersama.",
        "status_failed_v2": "Ada kendala di proses terakhir. Ringkasannya sudah siap untuk kita periksa.",
        "status_waiting_approval_v1": "Produksi sudah sampai tahap persetujuan. Keputusan ada di layar ini.",
        "status_waiting_approval_v2": "Tahap ini menunggu persetujuanmu sebelum bisa melanjutkan.",
        "error_rate_limited": "Permintaan sedang dibatasi. Tunggu sebentar, lalu kita coba lagi.",
        "error_quota_exhausted": "Kuota layanan sudah habis. Periksa penggunaan atau penyedia dulu sebelum melanjutkan.",
        "error_invalid_output": "Hasilnya belum lolos pemeriksaan. Perlu diperbaiki atau dijalankan ulang.",
        "error_interrupted": "Proses terputus sebelum selesai. Jalankan tahap ini lagi untuk melanjutkan.",
        "explain_status": "Aku menjelaskan status produksi berdasarkan tahapan yang sudah dipetakan.",
    },
    "en": {
        "greeting_pagi": "Hi, I am Felisa. Good morning. What should we work on today?",
        "greeting_siang": "Hi, I am Felisa. Good afternoon. What should we work on today?",
        "greeting_sore": "Hi, I am Felisa. Good afternoon. What should we work on today?",
        "greeting_malam": "Hi, I am Felisa. Good evening. What should we work on today?",
        "status_running_v1": "I am working on the production stage. Please watch its progress in the studio.",
        "status_running_v2": "The current stage is still running. I am monitoring every update.",
        "status_completed_v1": "The production stage is complete. The result is ready to review or continue.",
        "status_completed_v2": "One stage is complete. We can continue to the next step.",
        "status_failed_v1": "The production stage was not successful. Let's review what went wrong.",
        "status_failed_v2": "There is a problem in the last process. The summary is ready for us to check.",
        "status_waiting_approval_v1": "Production is ready for approval. The decision is on this screen.",
        "status_waiting_approval_v2": "This stage is waiting for your approval before it can continue.",
        "error_rate_limited": "The request is being limited. Please wait a moment, then try again.",
        "error_quota_exhausted": "The service quota is exhausted. Check usage or provider settings before continuing.",
        "error_invalid_output": "The result did not pass validation. It needs to be fixed or run again.",
        "error_interrupted": "The process stopped before completion. Run this stage again to continue.",
        "explain_status": "I explain the production status based on the mapped stage information.",
    },
}

PREVIEW_LINES = {
    "id": "Hai, aku Felisa. Aku siap membantu kamu melalui setiap tahap produksi.",
    "en": "Hi, I am Felisa. I am ready to help you through every stage of production.",
}


def read_env_file():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return {}
    values = {}
    for raw_line in env_path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def read_setting(primary, alias="", default=""):
    env_values = read_env_file()
    value = os.environ.get(primary)
    if not value and alias:
        value = os.environ.get(alias)
    if not value:
        value = env_values.get(primary)
    if not value and alias:
        value = env_values.get(alias)
    return value.strip() if value else default


def text_hash(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def generation_hash(provider, voice, style, model=""):
    payload = json.dumps(
        {"provider": provider, "voice": voice, "style": style, "model": model, "style_version": STYLE_VERSION},
        ensure_ascii=False,
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get_expression_style(line_id):
    if line_id.startswith("greeting_") or line_id.startswith("status_completed_"):
        return "cheerful", "1.2"
    if line_id.startswith("status_running_") or line_id.startswith("status_waiting_approval_") or line_id == "explain_status":
        return "chat", "1.0"
    if line_id.startswith("status_failed_") or line_id.startswith("error_"):
        return "empathetic", "1.0"
    return "chat", "1.0"


def ssml(text, line_id, lang, voice_name):
    spoken_text = html.escape(text)
    spoken_text = spoken_text.replace(",", ',<break time="200ms"/>')
    spoken_text = spoken_text.replace(";", ';<break time="200ms"/>')
    style, style_degree = get_expression_style(line_id)
    locale = LANGUAGES[lang]["locale"]
    inner = f'<lang xml:lang="{locale}"><prosody pitch="+5%" rate="+6%">{spoken_text}</prosody></lang>'
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
        'xmlns:mstts="https://www.w3.org/2001/mstts" '
        f'xml:lang="{locale}">'
        f'<voice name="{voice_name}">'
        f'<mstts:express-as style="{style}" styledegree="{style_degree}">{inner}</mstts:express-as>'
        "</voice>"
        "</speak>"
    )


def classify_tts_error(detail):
    lower = detail.lower()
    if "429" in lower or "rate limit" in lower or "too many requests" in lower:
        return "rate_limited"
    if "quota" in lower or "resource exhausted" in lower or "billing" in lower:
        return "quota_exhausted"
    return ""


def synthesize_azure(subscription_key, region, text, line_id, lang, voice_name, output):
    endpoint = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"
    request = urllib.request.Request(
        endpoint,
        data=ssml(text, line_id, lang, voice_name).encode("utf-8"),
        method="POST",
        headers={
            "Ocp-Apim-Subscription-Key": subscription_key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
            "User-Agent": "ai-educational-video-studio/felisa-voice",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            audio = response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")[:800]
        code = classify_tts_error(detail)
        raise RuntimeError(code or f"Azure Speech HTTP {error.code}: {detail}")
    except urllib.error.URLError as error:
        raise RuntimeError(f"network_error: {error.reason}")
    if not audio:
        raise RuntimeError("azure_empty_response")
    output.write_bytes(audio)


def synthesize_gemini(text, voice, style, output):
    script = ROOT / "tools" / "tts_gemini.py"
    if not script.exists():
        raise RuntimeError("Gemini TTS module tidak ditemukan: tools/tts_gemini.py")
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", encoding="utf-8", delete=False) as temp:
            temp.write(text)
            temp_path = Path(temp.name)
        result = subprocess.run(
            [
                sys.executable,
                str(script),
                str(temp_path),
                str(output),
                "--voice",
                voice,
                "--style",
                style,
            ],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    finally:
        if temp_path is not None:
            try:
                temp_path.unlink()
            except FileNotFoundError:
                pass
    if result.returncode != 0:
        detail = (result.stdout + "\n" + result.stderr).strip()
        code = classify_tts_error(detail)
        if code:
            raise RuntimeError(code)
        raise RuntimeError(detail[-1200:] or "gemini_tts_failed")
    if not output.exists():
        raise RuntimeError("gemini_empty_response")


def main():
    parser = argparse.ArgumentParser(description="Generate static Felisa voice assets")
    parser.add_argument("--force", action="store_true", help="Buat ulang meski cache cocok")
    parser.add_argument("--only", help="Hanya buat satu line id")
    parser.add_argument("--lang", nargs="+", choices=tuple(LANGUAGES), default=list(LANGUAGES))
    parser.add_argument("--voice", nargs="+", choices=tuple(VOICES), default=["ava"])
    args = parser.parse_args()

    provider = read_setting("TTS_PROVIDER", default="gemini").lower()
    if provider not in ("gemini", "azure"):
        print("Gagal: TTS_PROVIDER harus gemini atau azure.")
        return 2

    felisa_voice = read_setting("FELISA_VOICE", default="Leda")
    felisa_style = read_setting(
        "FELISA_STYLE",
        default="Bacakan dalam Bahasa Indonesia dengan nada ramah, hangat, dan tempo santai.",
    )
    narrator_voice = read_setting("NARRATOR_VOICE", default="Kore")
    if provider == "gemini" and felisa_voice.lower() == narrator_voice.lower():
        print(f"Gagal: FELISA_VOICE ({felisa_voice}) harus berbeda dari voice narator ({narrator_voice}).")
        return 2

    azure_key = read_setting("AZURE_SPEECH_KEY", "AZURE_TTS_KEY")
    azure_region = read_setting("AZURE_SPEECH_REGION", "AZURE_TTS_REGION")
    if provider == "azure" and (not azure_key or not azure_region):
        print("Gagal: TTS_PROVIDER=azure memerlukan AZURE_SPEECH_KEY dan AZURE_SPEECH_REGION di .env.")
        return 2

    if args.only:
        valid = any(args.only in LINES[lang] for lang in args.lang)
        if args.only == "preview":
            valid = True
        if not valid:
            print(f"Gagal: --only tidak dikenal: {args.only}")
            return 2

    extension = "wav" if provider == "gemini" else "mp3"
    manifest_path = OUTPUT_DIR / "manifest.json"
    existing_manifest = {}
    if manifest_path.exists():
        try:
            existing_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing_manifest = {}

    files = existing_manifest.get("files", {})
    texts = existing_manifest.get("text", {})
    text_hashes = existing_manifest.get("text_hashes", {})
    generation_hashes = existing_manifest.get("generation_hashes", {})
    generated = 0
    skipped = 0
    stopped = False

    for lang in args.lang:
        files.setdefault(lang, {})
        texts.setdefault(lang, {})
        text_hashes.setdefault(lang, {})
        generation_hashes.setdefault(lang, {})
        texts[lang] = dict(LINES[lang])

        for legacy_voice in args.voice:
            files[lang].setdefault(legacy_voice, {})
            text_hashes[lang].setdefault(legacy_voice, {})
            generation_hashes[lang].setdefault(legacy_voice, {})
            for line_id in LINES[lang]:
                files[lang][legacy_voice][line_id] = f"{line_id}.{extension}"
            files[lang][legacy_voice]["preview"] = f"preview.{extension}"

            voice_dir = OUTPUT_DIR / lang / legacy_voice
            voice_dir.mkdir(parents=True, exist_ok=True)

            line_items = {}
            if args.only == "preview":
                line_items["preview"] = PREVIEW_LINES[lang]
            else:
                for line_id, text in LINES[lang].items():
                    if args.only is None or line_id == args.only:
                        line_items[line_id] = text

            for line_id, text in line_items.items():
                output = voice_dir / f"{line_id}.{extension}"
                text_digest = text_hash(text)
                voice_name = VOICES[legacy_voice]["name"] if provider == "azure" else felisa_voice
                generation_digest = generation_hash(
                    provider,
                    voice_name,
                    felisa_style if provider == "gemini" else get_expression_style(line_id)[0],
                )

                cache_matches = (
                    output.exists()
                    and text_hashes[lang][legacy_voice].get(line_id) == text_digest
                    and generation_hashes[lang][legacy_voice].get(line_id) == generation_digest
                )
                if cache_matches and not args.force:
                    skipped += 1
                    continue

                try:
                    if provider == "gemini":
                        synthesize_gemini(text, voice_name, felisa_style, output)
                    else:
                        synthesize_azure(
                            azure_key,
                            azure_region,
                            text,
                            line_id,
                            lang,
                            voice_name,
                            output,
                        )
                except RuntimeError as error:
                    code = str(error)
                    if code in ("rate_limited", "quota_exhausted"):
                        print(f"Berhenti: {code}. Kalimat belum jadi akan bisa dilanjutkan saat dijalankan lagi.")
                    else:
                        print(f"Gagal: {lang}/{legacy_voice}/{line_id}: {code}")
                    stopped = True
                    break

                text_hashes[lang][legacy_voice][line_id] = text_digest
                generation_hashes[lang][legacy_voice][line_id] = generation_digest
                files[lang][legacy_voice][line_id] = output.name
                generated += 1
                print(f"[OK] {lang}/{legacy_voice}/{output.name}")
            if stopped:
                break
        if stopped:
            break

    manifest = {
        "format": extension,
        "languages": LANGUAGES,
        "voices": VOICES,
        "text": texts,
        "files": files,
        "text_hashes": text_hashes,
        "generation_hashes": generation_hashes,
        "style_version": STYLE_VERSION,
        "voice": felisa_voice if provider == "gemini" else VOICES["ava"]["name"],
        "lines": {
            line_id: {
                "file": f"{line_id}.{extension}",
                "text": LINES["id"][line_id],
                "voice": felisa_voice if provider == "gemini" else VOICES["ava"]["name"],
            }
            for line_id in LINES["id"]
        },
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Selesai: {generated} dibuat, {skipped} dilewati, manifest={manifest_path}")
    return 1 if stopped else 0


if __name__ == "__main__":
    sys.exit(main())
