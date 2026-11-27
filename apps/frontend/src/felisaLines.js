export const STATUS_LINES = {
  id: {
    running: [
      "Saya sedang menjalankan tahap produksi. Silakan pantau progresnya di studio.",
      "Tahap saat ini masih berjalan. Saya tetap memantau setiap pembaruannya.",
    ],
    completed: [
      "Tahap produksi sudah selesai. Hasilnya siap untuk ditinjau atau diteruskan.",
      "Satu tahap telah selesai. Kita bisa lanjut ke langkah berikutnya.",
    ],
    failed: [
      "Tahap produksi belum berhasil. Kita akan meninjau penyebab kegagalannya.",
      "Ada kendala pada proses terakhir. Saya sudah menyiapkan ringkasan untuk diperiksa.",
    ],
    waiting_approval: [
      "Produksi sudah sampai titik persetujuan. Keputusan ada di layar ini.",
      "Tahap ini menunggu persetujuanmu sebelum alur dapat melanjutkan diri.",
    ],
  },
  en: {
    running: [
      "I am running the production stage. Please monitor the progress in the studio.",
      "The current stage is still running. I am keeping track of every update.",
    ],
    completed: [
      "The production stage is complete. The result is ready to review or continue.",
      "One stage is complete. We can continue to the next step.",
    ],
    failed: [
      "The production stage was not successful. We will review what went wrong.",
      "There was a problem in the last process. I prepared a summary for review.",
    ],
    waiting_approval: [
      "Production is ready for your approval. The decision is on this screen.",
      "This stage is waiting for your approval before the workflow can continue.",
    ],
  },
};

// JANGAN ubah teks ERROR_LINES: kalimat ini punya audio yang sudah dibuat (manifest memakai hash teks).
export const ERROR_LINES = {
  id: {
    rate_limited: "Permintaan API sedang dibatasi. Tunggu sebentar lalu coba lanjut lagi.",
    quota_exhausted: "Kuota penyedia telah habis. Periksa penggunaan atau penyedia sebelum melanjutkan.",
    invalid_output: "Keluaran AI tidak lolos validasi. Perlu diperbaiki atau dijalankan ulang.",
    interrupted: "Proses terputus sebelum selesai. Jalankan tahap ini lagi untuk melanjutkan.",
  },
  en: {
    rate_limited: "The API request is being limited. Wait a moment, then try again.",
    quota_exhausted: "The provider quota is exhausted. Check usage or provider settings before continuing.",
    invalid_output: "The AI output did not pass validation. It needs fixing or another run.",
    interrupted: "The process stopped before completion. Run this stage again to continue.",
  },
};

// Penjelasan kegagalan untuk TEKS di layar (tidak diucapkan, jadi tidak memakai kuota suara).
// Tanpa LLM: kode galat dipetakan dari log tahap ke penyebab + saran tindakan.
export const FAILURE_ADVICE = {
  id: {
    key_missing: {
      what: "Kunci API penyedia belum diisi.",
      fix: "Isi kuncinya di file .env, lalu restart backend.",
    },
    invalid_key: {
      what: "Kunci API ditolak (salah, terpotong, atau dicabut).",
      fix: "Buat kunci baru di dasbor penyedia, tempel utuh di .env, lalu restart backend.",
    },
    quota_exhausted: {
      what: "Kuota harian penyedia habis.",
      fix: "Coba lagi besok, atau pindah ke penyedia cadangan.",
    },
    rate_limited: {
      what: "Penyedia membatasi permintaan sesaat (terlalu cepat atau terlalu ramai).",
      fix: "Tunggu 1-2 menit lalu tekan Coba ulang.",
    },
    model_not_found: {
      what: "Model yang dipakai tidak ditemukan atau sudah dihentikan penyedia.",
      fix: "Ganti nama modelnya (mis. OPENROUTER_MODEL di .env), lalu restart backend.",
    },
    server_busy: {
      what: "Server penyedia sedang sibuk atau bermasalah.",
      fix: "Tunggu sebentar lalu tekan Coba ulang.",
    },
    network: {
      what: "Tidak bisa menghubungi penyedia (koneksi internet atau waktu habis).",
      fix: "Cek koneksi internet, lalu tekan Coba ulang.",
    },
    ffmpeg_missing: {
      what: "FFmpeg tidak ditemukan di komputer ini.",
      fix: "Pasang FFmpeg dan pastikan perintah ffmpeg bisa dipanggil dari terminal.",
    },
    invalid_output: {
      what: "Keluaran AI tidak lolos validasi (bukan JSON yang benar).",
      fix: "Tekan Coba ulang. Kalau terus gagal, ganti model.",
    },
    interrupted: {
      what: "Proses terputus sebelum selesai.",
      fix: "Tekan Coba ulang untuk melanjutkan tahap ini.",
    },
    unknown: {
      what: "Penyebab kegagalan belum dikenali.",
      fix: "Buka log tahap untuk melihat detailnya.",
    },
  },
  en: {
    key_missing: {
      what: "The provider API key is not set.",
      fix: "Add it to the .env file, then restart the backend.",
    },
    invalid_key: {
      what: "The API key was rejected (wrong, truncated, or revoked).",
      fix: "Create a new key in the provider dashboard, paste it fully into .env, then restart the backend.",
    },
    quota_exhausted: {
      what: "The provider's daily quota is used up.",
      fix: "Try again tomorrow, or switch to a backup provider.",
    },
    rate_limited: {
      what: "The provider is briefly limiting requests (too fast or too busy).",
      fix: "Wait 1-2 minutes, then press Retry.",
    },
    model_not_found: {
      what: "The model was not found or has been retired by the provider.",
      fix: "Change the model name (e.g. OPENROUTER_MODEL in .env), then restart the backend.",
    },
    server_busy: {
      what: "The provider's server is busy or having problems.",
      fix: "Wait a moment, then press Retry.",
    },
    network: {
      what: "Couldn't reach the provider (internet connection or timeout).",
      fix: "Check your internet connection, then press Retry.",
    },
    ffmpeg_missing: {
      what: "FFmpeg was not found on this computer.",
      fix: "Install FFmpeg and make sure the ffmpeg command works from a terminal.",
    },
    invalid_output: {
      what: "The AI output failed validation (not valid JSON).",
      fix: "Press Retry. If it keeps failing, switch models.",
    },
    interrupted: {
      what: "The process stopped before finishing.",
      fix: "Press Retry to continue this stage.",
    },
    unknown: {
      what: "The cause of the failure isn't recognised yet.",
      fix: "Open the stage log to see the details.",
    },
  },
};

// Ambil kode status HTTP dari pola yang dikenal saja (bukan sembarang angka di log).
function httpStatus(log) {
  const match =
    log.match(/menjawab\s+(\d{3})/i) ||
    log.match(/\bhttp(?:\s+error)?[\s:]+(\d{3})/i) ||
    log.match(/\bstatus(?:\s+code)?[\s:]+(\d{3})/i) ||
    log.match(/"code"\s*:\s*(\d{3})/i);
  return match ? Number(match[1]) : null;
}

// Urutan penting: yang lebih spesifik diperiksa lebih dulu.
const FAILURE_RULES = [
  ["key_missing", (t) => /belum diisi|api[_ ]?key.{0,30}(missing|not set|empty|kosong)|no api key/i.test(t)],
  ["invalid_key", (t, s) => s === 401 || s === 403 || /api key not valid|invalid api key|incorrect api key|unauthorized|permission[_ ]denied/i.test(t)],
  ["quota_exhausted", (t, s) => s === 402 || /perday|per day|daily|insufficient (credit|fund|balance)|billing/i.test(t)],
  ["rate_limited", (t, s) => s === 429 || /rate.?limit|too many requests|resource.?exhausted|rpm_limit/i.test(t)],
  ["quota_exhausted", (t) => /quota/i.test(t)],
  ["model_not_found", (t, s) => s === 404 || /model.{0,20}not found|no endpoints found|not a valid model/i.test(t)],
  ["server_busy", (t, s) => [500, 502, 503, 504].includes(s) || /overloaded|high demand|temporarily unavailable|service unavailable/i.test(t)],
  ["network", (t) => /tidak bisa menghubungi|timed? ?out|connection (refused|reset|error)|getaddrinfo|network is unreachable/i.test(t)],
  ["ffmpeg_missing", (t) => /ffmpeg.{0,40}(not found|not recognized|tidak ditemukan)|winerror 2/i.test(t)],
  ["invalid_output", (t) => /invalid.{0,12}(json|output)|validation|expecting value|jsondecodeerror|schema/i.test(t)],
  ["interrupted", (t) => /interrupt|cancel/i.test(t)],
];

/** Log tahap -> kode galat yang dikenal, atau null bila tidak dikenali. */
export function classifyLog(log) {
  const text = String(log || "");
  if (!text.trim()) return null;
  const status = httpStatus(text);
  for (const [code, test] of FAILURE_RULES) {
    if (test(text, status)) return code;
  }
  return null;
}

/** Kode galat -> { what, fix } dua bahasa. Kode tak dikenal memakai penjelasan umum. */
export function explainError(code, lang = "id") {
  const table = FAILURE_ADVICE[lang === "en" ? "en" : "id"];
  return table[code] || table.unknown;
}

/** Log tahap -> { code, what, fix }. Selalu mengembalikan objek (umum bila tak dikenali). */
export function describeFailure(log, lang = "id") {
  const code = classifyLog(log);
  return { code, ...explainError(code, lang) };
}

export function getTimePeriod(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "pagi";
  if (hour >= 11 && hour < 15) return "siang";
  if (hour >= 15 && hour < 18) return "sore";
  return "malam";
}

export function getGreeting(name, lang = "id", date = new Date()) {
  const period = getTimePeriod(date);
  const cleanName = String(name || "").trim() || "teman";
  if (lang === "en") {
    const greeting =
      period === "pagi" ? "Good morning" :
      period === "siang" ? "Good afternoon" :
      period === "sore" ? "Good afternoon" : "Good evening";
    return `Hi ${cleanName}, I am Felisa. ${greeting}. What should we work on today?`;
  }
  return `Hai ${cleanName}, saya Felisa. Selamat ${period}. Hari ini kita mau ngapain?`;
}

export function getStatusLine(status, name, errorCode, lang = "id") {
  const language = lang === "en" ? "en" : "id";
  if (status === "failed" && errorCode && ERROR_LINES[language][errorCode]) {
    return ERROR_LINES[language][errorCode];
  }
  const choices = STATUS_LINES[language][status] || STATUS_LINES[language].completed;
  const seed = String(name || "felisa").length + choices.length;
  return choices[seed % choices.length];
}

export function resolveFelisaLine(lineId, context = {}) {
  if (!lineId) return context.text || "";
  const lang = context.lang === "en" ? "en" : "id";
  if (lineId === "greeting") return getGreeting(context.name || "", lang, context.date);
  if (lineId.startsWith("status:")) {
    return getStatusLine(lineId.slice(7), context.name || "", context.errorCode, lang);
  }
  if (lineId.startsWith("error:")) {
    return ERROR_LINES[lang][lineId.slice(6)] || context.text ||
      (lang === "en" ? "A problem needs to be checked." : "Terjadi kendala yang perlu diperiksa.");
  }
  if (lineId === "explain") {
    return lang === "en"
      ? "I explain the production status based on the stage information available."
      : "Saya menjelaskan status produksi berdasarkan status tahapan yang sudah dipetakan.";
  }
  return context.text || "";
}