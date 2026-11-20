# Laporan Implementasi AI Learning Tutor (Tutor-Led)

## Ringkasan
Fitur AI Learning Tutor telah diterapkan pada stasiun `3. Notes`. Sistem kini dapat memimpin diskusi belajar berdasarkan materi dan hasil analisis, menyimpan riwayat serta perkembangan konsep terpisah dalam file session, dan meneruskan konteks diskusi ke Learning Notes Agent saat sesi selesai.

## Perubahan yang Dilakukan

### 1. Learning Notes CLI
File: `tools/run_learning_notes.py`

- Menambahkan argumen opsional `--session`.
- Membaca file `.session.json` bila argumen diberikan.
- Menambahkan data sesi ke payload LLM melalui field `session`.
- Tanpa file sesi, payload tetap menggunakan `session: null`.

### 2. Orkestrasi Tahap Notes
File: `apps/backend/app/stages.py`

- Menambahkan path:
  - `catatan/{name}.session.json`
- Menambahkan argumen `--session` ke perintah `run_learning_notes.py` bila file sesi tersedia.
- Perilaku tahap `notes` lain tetap mengikuti pola orkestrasi yang sudah ada.

### 3. Backend Tutor
File: `apps/backend/app/main.py`

- Menambahkan helper pembacaan sumber:
  - material
  - analysis
- Menambahkan helper pemanggilan Gemini melalui `agentkit.ask`.
- Menambahkan inisialisasi konsep dari `analysis.key_concepts`.
- Menandai konsep sebagai tipis berdasarkan `needs_expansion` dan `gaps`.
- Menambahkan pembaruan status konsep:
  - `belum`
  - `sebagian`
  - `paham`
- Menambahkan penyimpanan analogi baru.
- Menambahkan pencatatan fakta yang perlu diverifikasi.
- Menambahkan penyimpanan file:
  - `catatan/{name}.session.json`

#### Endpoint Baru
- `GET /videos/{video_id}/tutor/session`
  - Memastikan materi dan analisis tersedia.
  - Membuat session otomatis bila belum ada.
  - Memanggil Tutor untuk memberi pembuka dengan peta konsep.

- `POST /videos/{video_id}/tutor/turn`
  - Menerima body JSON `{ "message": "..." }`.
  - Menyimpan pesan pengguna.
  - Mengirim material, analysis, dan riwayat sesi ke Tutor.
  - Memperbarui status konsep, analogi, serta fakta perlu verifikasi.

- `POST /videos/{video_id}/tutor/finish`
  - Menandai `ended = true`.
  - Menjalankan tahap `notes` dengan file session.
  - Menghasilkan atau memperbarui catatan di latar belakang.

- `POST /videos/{video_id}/tutor/reset`
  - Menghapus konteks diskusi lama secara logis dengan membuat session awal baru.
  - Memanggil Tutor untuk membuka sesi baru.

### 4. Frontend API
File: `apps/frontend/src/api.js`

Menambahkan pemanggil:
- `getTutorSession`
- `sendTutorTurn`
- `finishTutorSession`
- `resetTutorSession`

### 5. Ruang Kerja Frontend
File: `apps/frontend/src/AgentWorkspaceModal.jsx`

Pada tahap `notes`, ditambahkan dua sub-mode:

- `Sesi Belajar (Tutor)`
- `Catatan & Approval 1`

Mode Tutor memiliki:
- Layout dua kolom untuk desktop.
- Chat Tutor dan pengguna.
- Scroll otomatis ke pesan terbaru.
- Quick interrupts:
  - `Belum paham, jelaskan ulang`
  - `Kasih analogi lain`
  - `Contohnya di kerjaan nyata?`
  - `Lanjut konsep berikutnya`
- Peta konsep dengan status:
  - Belum dibahas
  - Sebagian paham
  - Paham
- Penanda `TIPIS` untuk konsep yang perlu diperluas.
- Bank analogi.
- Badge amber `⚠ Perlu Verifikasi`.
- Tombol:
  - `Akhiri Sesi & Susun Catatan`
  - `Lewati Sesi → Langsung Susun Catatan`

Mode catatan tetap mempertahankan editor, kontrol jalankan ulang agen, riwayat run, dan Approval 1.

### 6. Fullscreen dan Auto-Pause 3D
Files:
- `apps/frontend/src/App.jsx`
- `apps/frontend/src/AgentWorkspaceModal.jsx`

- Menambahkan mode fullscreen cyber untuk ruang kerja.
- Sesi Notes otomatis terbuka fullscreen.
- Menambahkan tombol `⛶ FULLSCREEN [F]` dan `🗗 COMPACT [F]`.
- Menambahkan shortcut keyboard `F`, kecuali saat fokus berada di `INPUT`, `TEXTAREA`, atau `SELECT`.
- Saat ruang kerja fullscreen atau Notes aktif, Command Center 3D masuk Sleep Mode sementara.
- Saat modal ditutup, Sleep Mode ruang kerja dilepas.
- Mode Sleep yang sudah ada untuk `words`, `render`, dan manual tetap dipertahankan.
- Layout Tutor menggunakan `flex-1` dan `min-h-0` agar area chat serta sidebar mengisi tinggi layar.
- Pesan Tutor dengan format `**teks**` dirender sebagai teks tebal berwarna cyan.
- Editor teks untuk Notes dan tahap lain mengisi ruang fleksibel layar dengan tinggi minimum 280px.
- Panel chat Tutor memiliki tinggi minimal 420px, gelembung maksimum `max-w-3xl`, teks `text-sm`, dan jarak paragraf yang lebih lega.
- Peta Konsep dan Bank Analogi memiliki scroll independen agar tidak mengecilkan area obrolan.

## Format Data Sesi
File session disimpan terpisah dari material dan hasil analisis:

```json
{
  "video_id": 1,
  "ended": false,
  "summary": "",
  "concepts": [],
  "messages": []
}
```

Setiap konsep memuat:
- `id`
- `name`
- `status`
- `is_thin`
- `analogies`
- `unverified_notes`

## Alur yang Diharapkan

1. Tombol `ADVANCE` menjalankan `2. Analyst`, lalu berhenti sebelum `3. Notes` bila session Tutor belum ada.
2. Pengguna membuka tahap `3. Notes`.
3. Frontend membuat atau mengambil session Tutor.
4. Tutor membuka sesi dengan peta konsep dan konsep tipis.
5. Pengguna mengirim pertanyaan atau memilih quick interrupt.
6. Backend memperbarui status konsep, analogi, dan catatan verifikasi.
7. Pengguna mengakhiri atau melewati sesi.
8. Backend menandai session selesai.
9. Tahap `notes` dijalankan dengan session sebagai konteks tambahan.
10. Tombol `ADVANCE` berikutnya dapat melanjutkan setelah catatan tersedia dan disetujui.
11. Draf catatan tampil pada sub-mode `Catatan & Approval 1`.
12. Pengguna dapat menyetujui melalui Approval 1.

## Hasil Validasi
- Frontend production build: berhasil.
- Learning Notes contract/self-test: berhasil.
- Python compile check: berhasil.
- Backend smoke test: berhasil.
- Orchestrator workflow test: berhasil.

Build frontend masih menampilkan peringatan ukuran bundle, tetapi proses build selesai tanpa kegagalan.

## Catatan Implementasi
- Integrasi LLM Tutor menggunakan provider dan model dari konfigurasi video.
- Jika API key penyedia belum tersedia, endpoint Tutor akan mengembalikan error backend.
- `tutor/reset` membuat session baru dan memanggil Tutor untuk pembukaan sesi kembali.
- File session bersifat terpisah dari `material`, `analysis.json`, dan artifact catatan.
