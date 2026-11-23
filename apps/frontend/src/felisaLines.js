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
