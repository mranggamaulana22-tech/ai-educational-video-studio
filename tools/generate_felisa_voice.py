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
import re
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "apps" / "frontend" / "public" / "audio" / "felisa"
STYLE_VERSION = "felisa-style-v1"

GEMINI_VOICES = (
    "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede",
    "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel", "Algieba",
    "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar",
    "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
    "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
)

AZURE_VOICES = {
    "ava": {"name": "en-US-AvaMultilingualNeural", "label": "Ava — Hangat & Ekspresif"},
    "emma": {"name": "en-US-EmmaMultilingualNeural", "label": "Emma — Lembut & Natural"},
    "jenny": {"name": "en-US-JennyMultilingualNeural", "label": "Jenny — Jelas & Bersahabat"},
    "gadis": {"name": "id-ID-GadisNeural", "label": "Gadis — Alami & Lokal"},
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
    if "quota" in lower or "resource exhausted" in lower or "billing" in lower:
        return "quota_exhausted"
    if "429" in lower or "rate limit" in lower or "too many requests" in lower:
        return "rate_limited"
    return ""


def parse_retry_seconds(detail):
    for pattern in (
        r'retryDelay["\']?\s*[:=]\s*["\']?(\d+(?:\.\d+)?)s',
        r"retry(?:\s+in)?\s+(\d+(?:\.\d+)?)\s*(?:seconds?|detik|s\b)",
        r"tunggu\s+(\d+(?:\.\d+)?)\s*(?:seconds?|detik|s\b)",
    ):
        match = re.search(pattern, detail, re.IGNORECASE)
        if match:
            return max(1, int(float(match.group(1))))
    return None


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
            raise RuntimeError(f"{code}|{detail}")
        raise RuntimeError(detail[-1200:] or "gemini_tts_failed")
    if not output.exists():
        raise RuntimeError("gemini_empty_response")


def synthesize_gemini_with_retry(text, voice, style, output, progress="", sleep_fn=time.sleep):
    """Coba satu kalimat maksimal 3 kali untuk rate limit per menit."""
    backoff = (30, 60, 90)
    for attempt in range(1, 4):
        try:
            synthesize_gemini(text, voice, style, output)
            return
        except RuntimeError as error:
            raw = str(error)
            code = raw.split("|", 1)[0]
            detail = raw.split("|", 1)[1] if "|" in raw else raw
            if code == "quota_exhausted":
                raise RuntimeError("quota_exhausted|Kuota harian Gemini sudah habis. Berhenti; coba lagi setelah kuota diperbarui.")
            if code != "rate_limited":
                raise
            if attempt == 3:
                raise RuntimeError("rate_limited|Batas percobaan 3 kali tercapai untuk kalimat ini.")

            wait_seconds = parse_retry_seconds(detail) or backoff[attempt - 1]
            prefix = f"{progress} " if progress else ""
            print(f"{prefix}menunggu {wait_seconds} detik (rate_limited, percobaan {attempt}/3)")
            sleep_fn(wait_seconds)


def main():
    parser = argparse.ArgumentParser(description="Generate static Felisa voice assets")
    parser.add_argument("--force", action="store_true", help="Buat ulang meski cache cocok")
    parser.add_argument("--only", help="Hanya buat satu line id")
    parser.add_argument("--lang", nargs="+", choices=tuple(LANGUAGES), default=list(LANGUAGES))
    parser.add_argument("--voice", nargs="+", default=None)
    parser.add_argument("--previews", help="Daftar voice Gemini dipisah koma")
    args = parser.parse_args()

    provider = read_setting("TTS_PROVIDER", default="gemini").lower()
    if provider not in ("gemini", "azure"):
        print("Gagal: TTS_PROVIDER harus gemini atau azure.")
        return 2

    if args.previews:
        preview_voices = [voice.strip() for voice in args.previews.split(",") if voice.strip()]
        invalid = [voice for voice in preview_voices if voice not in GEMINI_VOICES]
        if invalid:
            print("Gagal: voice Gemini tidak dikenal: " + ", ".join(invalid))
            return 2
        provider = "gemini"

    felisa_voice = read_setting("FELISA_VOICE", default="Leda")
    felisa_style_id = read_setting(
        "FELISA_STYLE_ID",
        default="",
    )
    felisa_style_en = read_setting(
        "FELISA_STYLE_EN",
        default="Read in English with a cheerful, friendly tone, energetic but calm and clear, medium pace.",
    )
    felisa_style_legacy = read_setting("FELISA_STYLE", default="")
    if not felisa_style_id and felisa_style_legacy:
        felisa_style_id = felisa_style_legacy
    if not felisa_style_id:
        felisa_style_id = "Bacakan dalam Bahasa Indonesia dengan nada ramah, hangat, dan tempo santai."
    try:
        tts_delay_seconds = max(0.0, float(read_setting("FELISA_TTS_DELAY_SECONDS", default="20")))
    except ValueError:
        tts_delay_seconds = 20.0
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
    voice_statuses = existing_manifest.get("voice_statuses", {})
    voice_formats = existing_manifest.get("voice_formats", {})
    voice_previews = existing_manifest.get("voice_previews", {})
    generated = 0
    skipped = 0
    stopped = False

    if args.previews:
        preview_total = len(preview_voices) * 2
        preview_processed = 0
        for voice_name in preview_voices:
            for lang in ("id", "en"):
                preview_processed += 1
                preview_text = (
                    "Hai, aku Felisa. Aku siap membantu kamu dengan suara yang hangat dan santai."
                    if lang == "id"
                    else "Hi, I am Felisa. I am ready to help you with a warm and calm voice."
                )
                felisa_style = felisa_style_id if lang == "id" else felisa_style_en
                voice_statuses.setdefault(lang, {})
                voice_formats.setdefault(lang, {})
                voice_previews.setdefault(lang, {})
                voice_dir = OUTPUT_DIR / lang / voice_name
                voice_dir.mkdir(parents=True, exist_ok=True)
                output = voice_dir / f"preview-{voice_name}.wav"
                text_digest = text_hash(preview_text)
                generation_digest = generation_hash("gemini", voice_name, felisa_style)

                cache_matches = (
                    output.exists()
                    and text_hashes.setdefault(lang, {}).setdefault(voice_name, {}).get("preview") == text_digest
                    and generation_hashes.setdefault(lang, {}).setdefault(voice_name, {}).get("preview") == generation_digest
                )
                if cache_matches and not args.force:
                    skipped += 1
                    voice_formats[lang][voice_name] = "wav"
                    voice_previews[lang][voice_name] = output.name
                    if voice_statuses[lang].get(voice_name) != "complete":
                        voice_statuses[lang][voice_name] = "preview_only"
                    continue

                progress = f"[{preview_processed}/{preview_total}] {lang}/{voice_name}/preview"
                try:
                    synthesize_gemini_with_retry(
                        preview_text,
                        voice_name,
                        felisa_style,
                        output,
                        progress=progress,
                    )
                except RuntimeError as error:
                    raw = str(error)
                    code = raw.split("|", 1)[0]
                    if code in ("rate_limited", "quota_exhausted"):
                        if code == "quota_exhausted":
                            print(f"Berhenti: quota_exhausted. Kuota harian Gemini sudah habis; coba lagi setelah kuota diperbarui.")
                        else:
                            print(f"Berhenti: rate_limited. 3 percobaan untuk kalimat ini sudah habis.")
                    else:
                        print(f"Gagal: preview {lang}/{voice_name}: {code}")
                    stopped = True
                    break

                text_hashes.setdefault(lang, {}).setdefault(voice_name, {})
                generation_hashes.setdefault(lang, {}).setdefault(voice_name, {})
                text_hashes[lang][voice_name]["preview"] = text_digest
                generation_hashes[lang][voice_name]["preview"] = generation_digest
                voice_formats[lang][voice_name] = "wav"
                voice_previews[lang][voice_name] = output.name
                if voice_statuses[lang].get(voice_name) != "complete":
                    voice_statuses[lang][voice_name] = "preview_only"
                generated += 1
                print(f"[OK] {lang}/{voice_name}/{output.name}")
                if preview_processed < preview_total and tts_delay_seconds > 0:
                    print(f"[{preview_processed}/{preview_total}] {lang}/{voice_name}/preview menunggu {tts_delay_seconds:g} detik (jeda antar panggilan)")
                    time.sleep(tts_delay_seconds)
            if stopped:
                break

    if not args.previews:
        if args.voice is None:
            selected_voices = [felisa_voice] if provider == "gemini" else ["ava"]
        else:
            selected_voices = args.voice
        if provider == "gemini":
            invalid = [voice for voice in selected_voices if voice not in GEMINI_VOICES]
            if invalid:
                print("Gagal: voice Gemini tidak dikenal: " + ", ".join(invalid))
                return 2
        else:
            invalid = [voice for voice in selected_voices if voice not in AZURE_VOICES]
            if invalid:
                print("Gagal: voice Azure tidak dikenal: " + ", ".join(invalid))
                return 2

    for lang in args.lang if not args.previews else []:
        files.setdefault(lang, {})
        texts.setdefault(lang, {})
        text_hashes.setdefault(lang, {})
        generation_hashes.setdefault(lang, {})
        texts[lang] = dict(LINES[lang])

        for legacy_voice in selected_voices:
            files[lang].setdefault(legacy_voice, {})
            text_hashes[lang].setdefault(legacy_voice, {})
            generation_hashes[lang].setdefault(legacy_voice, {})
            voice_statuses.setdefault(lang, {})
            voice_formats.setdefault(lang, {})
            voice_formats[lang][legacy_voice] = extension
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

            line_total = len(line_items)
            for line_index, (line_id, text) in enumerate(line_items.items(), start=1):
                output = voice_dir / f"{line_id}.{extension}"
                text_digest = text_hash(text)
                voice_name = AZURE_VOICES[legacy_voice]["name"] if provider == "azure" else legacy_voice
                generation_digest = generation_hash(
                    provider,
                    voice_name,
                    (felisa_style_id if lang == "id" else felisa_style_en) if provider == "gemini" else get_expression_style(line_id)[0],
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
                        synthesize_gemini_with_retry(
                            text,
                            voice_name,
                            felisa_style_id if lang == "id" else felisa_style_en,
                            output,
                            progress=f"[{line_index}/{line_total}] {lang}/{legacy_voice}/{line_id}",
                        )
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
                    raw = str(error)
                    code = raw.split("|", 1)[0]
                    if code in ("rate_limited", "quota_exhausted"):
                        if code == "quota_exhausted":
                            print(f"Berhenti: quota_exhausted. Kuota harian Gemini sudah habis; coba lagi setelah kuota diperbarui.")
                        else:
                            print(f"Berhenti: rate_limited. 3 percobaan untuk kalimat ini sudah habis.")
                    else:
                        print(f"Gagal: {lang}/{legacy_voice}/{line_id}: {code}")
                    stopped = True
                    break

                text_hashes[lang][legacy_voice][line_id] = text_digest
                generation_hashes[lang][legacy_voice][line_id] = generation_digest
                files[lang][legacy_voice][line_id] = output.name
                generated += 1
                print(f"[OK] [{line_index}/{line_total}] {lang}/{legacy_voice}/{output.name}")
                if line_index < line_total and tts_delay_seconds > 0:
                    print(f"[{line_index}/{line_total}] {lang}/{legacy_voice}/{line_id} menunggu {tts_delay_seconds:g} detik (jeda antar panggilan)")
                    time.sleep(tts_delay_seconds)
            if stopped:
                break
        if stopped:
            break

    if not args.previews and not stopped and args.only is None:
        for lang in args.lang:
            voice_statuses.setdefault(lang, {})
            for selected_voice in selected_voices:
                voice_statuses[lang][selected_voice] = "complete"

    manifest = {
        "format": "wav",
        "voice_formats": voice_formats,
        "voice_statuses": voice_statuses,
        "voice_previews": voice_previews,
        "languages": LANGUAGES,
        "voices": {
            **AZURE_VOICES,
            **{voice: {"name": voice, "label": voice} for voice in GEMINI_VOICES},
        },
        "text": texts,
        "files": files,
        "text_hashes": text_hashes,
        "generation_hashes": generation_hashes,
        "style_version": STYLE_VERSION,
        "voice": felisa_voice if provider == "gemini" else AZURE_VOICES["ava"]["name"],
        "lines": {
            line_id: {
                "file": f"{line_id}.{extension}",
                "text": LINES["id"][line_id],
                "voice": felisa_voice if provider == "gemini" else AZURE_VOICES["ava"]["name"],
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
