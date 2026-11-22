export const STATUS_LINES = {
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
};

export const ERROR_LINES = {
  rate_limited: "Permintaan API sedang dibatasi. Tunggu sebentar lalu coba lanjut lagi.",
  quota_exhausted: "Kuota penyedia telah habis. Periksa penggunaan atau penyedia sebelum melanjutkan.",
  invalid_output: "Keluaran AI tidak lolos validasi. Perlu diperbaiki atau dijalankan ulang.",
  interrupted: "Proses terputus sebelum selesai. Jalankan tahap ini lagi untuk melanjutkan.",
};

export function getTimePeriod(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "pagi";
  if (hour >= 11 && hour < 15) return "siang";
  if (hour >= 15 && hour < 18) return "sore";
  return "malam";
}

export function getGreeting(name, date = new Date()) {
  const period = getTimePeriod(date);
  const cleanName = String(name || "").trim() || "teman";
  return `Hai ${cleanName}, saya Felisa. Selamat ${period}. Hari ini kita mau ngapain?`;
}

export function getStatusLine(status, name, errorCode) {
  if (status === "failed" && errorCode && ERROR_LINES[errorCode]) {
    return ERROR_LINES[errorCode];
  }
  const choices = STATUS_LINES[status] || STATUS_LINES.completed;
  const seed = String(name || "felisa").length + choices.length;
  return choices[seed % choices.length];
}
