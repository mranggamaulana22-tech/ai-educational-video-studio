# Konteks Proyek: AI Educational Video Studio (untuk Gemini)
Diperbarui 22 Nov 2026. Baca semuanya sebelum menulis kode. Setelah itu tunggu "Tugas sekarang" dari pengguna.

## 1. Proyek dan pengguna
- Rangga (pemula, Windows, laptop RAM 8 GB, Ryzen 5 5600) membangun aplikasi PRIBADI (satu pengguna) yang mengubah catatan belajar (kursus IBM Software Engineering di Coursera) menjadi video Reels 9:16 berdurasi 30-60 detik, Bahasa Indonesia. Tujuan inti: belajar lalu mendokumentasikannya otomatis. Target 1 video per 1-2 hari. Biaya harus Rp0.
- Dia membangun lewat copy-paste dari AI web. Repo: `C:\Users\ELITEBOOK\Documents\ai-educational-video-studio` (GitHub Private, branch main).

## 2. Cara kerja denganku (wajib)
- Bahasa Indonesia, jawaban singkat. SATU tugas kecil per percakapan.
- Beri file LENGKAP dengan path, cara menjalankan, dan cara mengetes. Jangan ubah file di luar tugas.
- Jangan mengedit file yang belum kutempel: minta isi terbarunya dulu. Jangan menebak.
- Jangan bilang "selesai" tanpa bukti: tunjukkan perintah tes dan hasilnya. Bedakan "sudah teruji" dari "baru dibaca di kode".
- Jangan pernah minta aku menempel `.env`, API key, atau password database. `.env` tidak boleh masuk Git.
- Saranku commit Git setelah tiap langkah berhasil. Zip dipasang dengan `Expand-Archive -Path "D:\Downloads\X.zip" -DestinationPath . -Force` dari folder utama. Perintah PowerShell dibuat pendek dan sebutkan foldernya.

## 3. Aturan arsitektur (PRD v1.3 + Decision Log; jika bertentangan, Decision Log menang)
- Orchestrator = program biasa, BUKAN AI. Urutan tahap ada di kode.
- Agent AI tidak mengakses database atau filesystem langsung. Agent hanya menghasilkan JSON yang divalidasi.
- Storyboard = JSON yang memanggil komponen Remotion terdaftar. Waktu dalam milidetik. Audio adalah sumber kebenaran durasi.
- Approval manual hanya 4: (1) catatan, (2) naskah, (3) suara, (4) video final. "Pilih ide" di Planner BUKAN approval. Jangan menulis "Approval 5".
- Versi lama tidak boleh dihapus (revisi butuh jejaknya). Jangan menambah kompleksitas tanpa kebutuhan yang terbukti.
- Jangan merusak `tools/pipeline.py`. Pakai ulang `tools/llm.py` dan `tools/agentkit.py`. Jangan hapus aturan berbasis kode (kapitalisasi akronim, batas kata, subtitle bersih).
- Komponen scene baru didaftarkan di `apps/remotion/src/registry.ts`, `apps/remotion/scripts/validate-storyboard.mjs`, `docs/COMPONENTS.md`, dan `prompts/storyboard_agent.md`.

## 4. Stack dan struktur
- `apps/remotion` (video, `public/audio/{slug}.*` untuk audio dan word timing), `apps/backend` (FastAPI: `app/main.py`, `service.py`, `stages.py`), `apps/frontend` (React JSX, dashboard 3D "Spaceship Command Center": `App.jsx`, `AgentWorkspaceModal.jsx`, `StorageModal.jsx`, `api.js`).
- `tools/` (`pipeline.py`, `llm.py`, `agentkit.py`, `run_*.py`), `prompts/<agent>/v1.md`, `shared/schemas`, `shared/contracts`, `docs/CONTEXT.md`, `docs/COMPONENTS.md`.
- Data proyek: `storage/projects/{slug}/` (material.txt, analysis.json, session.json, notes.txt, plan.json, script.txt, review.json, storyboard.json, render.mp4). Arsip: `storage/archive/`. `storage/` tidak ikut Git.
- AI: Gemini API (storyboard `gemini-3.5-flash-lite`, TTS Gemini), Whisper lokal untuk waktu kata. OpenRouter dan DeepSeek key ada di `.env`. venv: `.venv-audio` (selalu `.\.venv-audio\Scripts\python.exe`).
- Backend: `DATABASE_URL=sqlite:///apps/backend/video_studio.db` di `.env` (PostgreSQL belum terpasang). Jalankan dari folder utama: `.\.venv-audio\Scripts\python.exe -m uvicorn app.main:app --app-dir apps\backend --reload`.

## 5. Alur 10 tahap (dashboard, tombol ADVANCE)
1 Material, 2 Analyst, (sesi Tutor, boleh dilewati), 3 Notes [approval 1], 4 Planner (pilih ide), 5 Writer, 6 Reviewer [approval 2], 7 Narrator [approval 3], 8 Aligner (Whisper, berat CPU), 9 Storyboard, 10 Renderer [approval 4] (berat CPU). Auto Sleep layar 3D saat Aligner dan Renderer.
Tata letak dashboard: Felisa di tengah, agent 1-5 melengkung di kiri, 6-10 di kanan, dinding komando di belakang.

## 6. Status
TERBUKTI (pengguna melihat bukti): video pertama jadi dari hulu ke hilir; Tutor jalan di sesi nyata (proyek `p0-tutor`, `uji-tutor`; Lewati sesi di `tesss`); folder per proyek + migrasi file lama (cadangan di `../backup_video_studio_legacy/`); `.env` tidak pernah masuk Git; konteks Tutor dipangkas (ringkasan + konsep + 6 pesan terakhir).
Terpasang, baru lolos self-test: rentang naskah 60-125 kata (2,0 kata/detik); slug dipotong di tanda hubung; batas DiagramScene (layout column, maks 4 node, label panah maks 12 karakter); `split_long_scenes_fallback`.
Dilaporkan tapi BELUM diuji pengguna: Gudang dan arsip aman (salin, verifikasi SHA-256, baru pindah, manifest), konfirmasi dua langkah, tombol Scan/Upload di top-bar dihapus.
BELUM dicek: apakah arsip menyalin audio dari `apps/remotion/public/audio/{slug}.*`; unggah .docx masih bisa dari ruang kerja Material; video Hari 1 masih utuh; severity Reviewer (`error`/`warning`) dipetakan ke `must_fix`/`suggestion` sesuai kontrak PRD; batas keras 8 panggilan API per tahap (baru terlihat `tries=3` dan `MAX_REVISIONS=2`); pengucapan "SysRS" sekitar detik 48; render ulang penuh.
Perlu diperbaiki: `MAX_WORDS` sebaiknya 120 (125 kata = 62,5 detik, melewati batas 60 detik); `MAX_SENTENCE` dilonggarkan 16 ke 18 padahal rencana awal 14, jelaskan alasannya.
Ditunda atas permintaan pengguna: membuat 3 video uji berikutnya (gerbang DL-2), memoles visual video, PostgreSQL.

## 7. Rencana Leader "Felisa" (jabatan Leader, nama Felisa; agent lain dinamai pengguna belakangan)
Felisa BUKAN agent AI. Otaknya kode Orchestrator: kalimatnya dari templat tetap yang dipetakan ke status dan kode error. Dia tidak memutuskan tahap sendiri, tidak memakai kuota tanpa perintah, dan tidak mengarsipkan atau menghapus lewat suara (konfirmasi hanya di layar).
Lapis (kerjakan berurutan, uji tiap lapis):
1. Backend memancarkan event lewat SSE (running, completed, failed, waiting_approval, tutor_ready; kode error `rate_limited`, `quota_exhausted`, `invalid_output`, `interrupted`). Tanpa Redis atau Celery. Jangan ubah logika `advance_workflow`.
2. Tampilan: layar sambutan dengan tombol Mulai (perlu agar suara diizinkan browser; pertama kali menanyakan nama dan menyimpannya lokal; variasi sapaan menurut waktu), panel pop-up (potret, gelombang suara, teks, tombol pilihan), mode ringkas (avatar bulat + satu baris), dan "Ruang Felisa" tampilan besar. Kamera 3D terbang ke stasiun yang menunggu.
3. Penjelasan kegagalan dari templat, penjaga kuota, perkiraan waktu tahap panjang.
4. Suara keluar: sekitar 15-20 kalimat tetap dibuat sekali lewat Gemini TTS lalu disimpan sebagai file; tombol bisukan; jam tenang.
5. Suara masuk: tekan-untuk-bicara (SpeechRecognition Chrome), dicocokkan ke daftar aksi lewat kata kunci. Nama proyek tetap diketik.
6. Notifikasi saat tab tidak aktif, mode fokus saat sesi Tutor, jurnal produksi, cek sistem.
JANGAN mulai lapis 4-5 sebelum lapis 1-3 terbukti.

Tampilan Felisa:
- Di ruang komando: model 3D (`sample.glb`, statis, tanpa rig, tinggi dinormalisasi 1 unit dengan titik pusat di tengah badan, jadi skala dan turunkan agar kaki menapak). Sisi belakang teksturnya cacat (rambut abu-abu, bercak pinggul), jadi hadapkan ke kamera dan jangan biarkan kamera memutarinya. Cincin di kakinya berwarna teal (normal), kuning (menunggu), merah (gagal).
- Di panel dan Ruang Felisa: rig 2.5D berlapis `felisa-layered-kit-v2` (`src/felisaRig.js`, `src/FelisaLayered.jsx`, `src/layers/meta.json`, 20 PNG di `public/models/felisa/layers/`, WebGL tanpa dependency, sumber 460x605 jadi tampilkan maksimal sekitar 600 px tinggi). Props: `speaking`, `level` (0..1 volume audio), `pulse` (naikkan tiap event), `sleep` (Auto Sleep), `glowMode` (`normal` = teal, `calm` = menunggu, `flicker` = gagal), `mood`. Mulut = bentuk a/e/o acak mengikuti `level`, bukan sinkron fonem asli.
- Pesan Felisa tampil di panel, JANGAN sebagai gelembung di atas dinding tengah (menutupi panel GATE STATUS).

## 8. Masalah terbuka pada prototipe Felisa
- Potret tampak seperti KARTU persegi karena latar PNG-nya ikut tampil. Perbaikan: beri kanvas `mask-image: radial-gradient(ellipse 50% 54% at 50% 46%, #000 58%, transparent 100%)` (plus `-webkit-mask-image`), wadah di belakangnya `background: transparent` tanpa border dan bayangan, slider Transparansi Hologram dihubungkan ke `opacity` kanvas.
- UI menampilkan "8/9 layer aktif": cari layer mana yang gagal dimuat (kemungkinan `vignette`). Pesan sukses menampilkan `undefined×undefinedpx`: perbaiki pembacaan ukuran (seharusnya 460x605).
- Pastikan yang dimuat adalah kit v2 (20 layer, dengan ekspresi dan mulut), bukan kit lama.

## 9. Urutan tugas yang disarankan (satu per percakapan)
1. Perbaikan potret Felisa di bagian 8.
2. Cek item "BELUM dicek" di bagian 6, satu per percakapan (mulai dari arsip menyertakan audio, lalu unggah .docx).
3. Turunkan `MAX_WORDS` ke 120 dan tunjukkan pemetaan severity Reviewer.
4. Leader lapis 1 (event SSE), uji, baru lapis 2.

## 10. Akhir sesi
Di akhir tiap percakapan tulis ringkasan 5 baris: apa yang berubah, file apa saja, cara tes, bukti hasil tes, dan langkah berikutnya. Pengguna menempelkannya ke `status-proyek.md`.