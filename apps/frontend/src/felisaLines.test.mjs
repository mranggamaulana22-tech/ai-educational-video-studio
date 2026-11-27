// Tes tanpa jaringan untuk pemetaan galat. Jalankan: node apps/frontend/src/felisaLines.test.mjs
import assert from "node:assert/strict";
import { classifyLog, describeFailure, explainError, ERROR_LINES } from "./felisaLines.js";

const cases = [
  ["[GAGAL] GEMINI_API_KEY belum diisi (variabel lingkungan atau file .env).", "key_missing"],
  ['[GAGAL] Penyedia menjawab 400:\n{"error":{"message":"API key not valid. Please pass a valid API key."}}', "invalid_key"],
  ["[GAGAL] Penyedia menjawab 401:\nUnauthorized", "invalid_key"],
  ['[GAGAL] Penyedia menjawab 429:\n{"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"temporarily rate-limited upstream","provider_error_code":"rpm_limit_exceeded"}}}', "rate_limited"],
  ["[GAGAL] Penyedia menjawab 429: Quota exceeded for metric GenerateRequestsPerDayPerProjectPerModel-FreeTier", "quota_exhausted"],
  ["[GAGAL] Penyedia menjawab 429: Quota exceeded ... PerMinute ... retry in 20s", "rate_limited"],
  ["[GAGAL] Penyedia menjawab 402: insufficient credits", "quota_exhausted"],
  ["[GAGAL] Penyedia menjawab 404: No endpoints found for model x", "model_not_found"],
  ["[GAGAL] Penyedia menjawab 503: The model is overloaded", "server_busy"],
  ["[GAGAL] Tidak bisa menghubungi penyedia: [Errno 11001] getaddrinfo failed", "network"],
  ["Expecting value: line 1 column 1 (char 0)", "invalid_output"],
  ["ffmpeg is not recognized as an internal or external command", "ffmpeg_missing"],
  ["Proses dibatalkan (cancelled)", "interrupted"],
  ["Naskah selesai 500 kata, tidak ada masalah", null],
  ["", null],
  [undefined, null],
];

for (const [log, expected] of cases) {
  assert.equal(classifyLog(log), expected, `log: ${String(log).slice(0, 70)}`);
}

// Kode tak dikenal -> penjelasan umum, tidak melempar galat.
const unknown = describeFailure("galat aneh yang tidak dikenal", "id");
assert.equal(unknown.code, null);
assert.ok(unknown.what && unknown.fix);

// Dua bahasa punya kode yang sama.
for (const code of ["key_missing", "invalid_key", "quota_exhausted", "rate_limited", "model_not_found", "server_busy", "network", "ffmpeg_missing", "invalid_output", "interrupted", "unknown"]) {
  assert.ok(explainError(code, "id").what, `id ${code}`);
  assert.ok(explainError(code, "en").what, `en ${code}`);
}

// Teks ERROR_LINES (punya audio) tidak boleh berubah.
assert.equal(ERROR_LINES.id.rate_limited, "Permintaan API sedang dibatasi. Tunggu sebentar lalu coba lanjut lagi.");
assert.equal(ERROR_LINES.en.interrupted, "The process stopped before completion. Run this stage again to continue.");

console.log("OK");