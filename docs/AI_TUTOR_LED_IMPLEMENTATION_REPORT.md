# Laporan Implementasi AI Learning Tutor (Tutor-Led)

## Ringkasan Perubahan Seluruh Sesi Implementasi

Halaman ini mencatat seluruh peningkatan yang diterapkan pada sistem selama sesi pengembangan Gudang dan AI Learning Tutor.

### A. Implementasi AI Learning Tutor

1. Menambahkan mode `Sesi Belajar (Tutor)` pada tahap `3. Notes`.
2. Memindahkan aturan Tutor-Led ke `prompts/learning_tutor/v1.md`.
3. Memastikan Tutor membuka sesi dengan peta konsep dan penanda konsep tipis.
4. Membatasi penjelasan Tutor menjadi satu konsep per giliran.
5. Menambahkan analogi dan contoh nyata untuk Software Engineer.
6. Membatasi pertanyaan cek pemahaman menjadi maksimal satu per giliran.
7. Menolak fakta yang tidak didukung materi dan pencatatan `unverified_facts`.
8. Menambahkan validator `check_tutor_turn(d)` untuk:
   - `reply`
   - `concept_updates`
   - `id` dan `status` konsep
   - `new_analogies`
   - `unverified_facts`
   - `session_summary`
9. Membatasi konteks LLM menjadi `summary`, status `concepts`, dan 6 giliran terakhir.
10. Mengubah `verifikasi_tags` agar hanya berisi fakta baru dari giliran berjalan.
11. Menambahkan endpoint `POST /videos/{video_id}/tutor/finish`.
12. Menambahkan endpoint `POST /videos/{video_id}/tutor/reset`.
13. Menambahkan endpoint `POST /videos/{video_id}/tutor/skip`.
14. Menghubungkan tombol **Lewati Sesi → Langsung Susun Catatan** ke endpoint skip.
15. Memastikan sesi dilewati mengirim `"session": null` ke Learning Notes Agent.
16. Memperbaiki layout chat agar area pesan, sidebar, dan tombol aksi memiliki scroll serta tinggi yang tepat.

### B. Perbaikan Learning Notes Agent

1. Menambahkan argumen CLI `--session`.
2. Mengirim analogi sesi ke `examples` pada section catatan yang sesuai.
3. Menandai konsep berstatus `belum` dengan penanda jelas `BELUM DIBAHAS`.
4. Memasukkan konsep belum dibahas ke `omitted_concepts` bila tidak dimasukkan ke section.
5. Memastikan kontrak Learning Notes tetap mencakup seluruh konsep hasil analisis.
6. Menambahkan self-test melalui `python tools/run_learning_notes.py --self-test`.

### C. Isolasi Storage dan Gudang Proyek

1. Memindahkan file kerja proyek ke `storage/projects/{slug}/`.
2. Menetapkan file kerja tersendiri untuk material, analisis, session, catatan, rencana, naskah, review, storyboard, dan render.
3. Menempatkan audio dan word timing pada lokasi Remotion agar dapat dibaca langsung.
4. Menyimpan artifact versi lama pada folder proyek.
5. Menambahkan `migrate_legacy_files(name)` untuk memindahkan file lama dari:
   - `catatan/`
   - `rencana/`
   - `naskah/`
   - output Remotion lama
6. Menambahkan endpoint `GET /storage/overview`.
7. Menambahkan endpoint preview teks, JSON, audio, dan video.
8. Menambahkan endpoint arsip proyek.
9. Menambahkan endpoint penghapusan arsip.
10. Menambahkan endpoint penghapusan proyek beserta record database dan file aktif.
11. Menambahkan komponen frontend `StorageModal.jsx`.
12. Menambahkan tombol **📦 Gudang** pada top-bar.
13. Menambahkan Sleep Mode 3D saat modal Gudang terbuka.

### D. Arsip dan Hapus Data

1. Arsip proyek dibuat pada `storage/archive/{slug}-{YYYYMMDD-HHMMSS}/`.
2. Setiap arsip menyertakan `manifest.json` berisi:
   - `video_id`
   - `slug`
   - `title`
   - `archived_at`
   - daftar `files`
   - ukuran dan SHA-256
3. Salinan proyek dan external audio/words diverifikasi sebelum direktori aktif dihapus.
4. Tab Arsip menampilkan daftar folder beserta isinya.
5. Penghapusan arsip memakai konfirmasi dua langkah.
6. Penghapusan arsip dibatasi agar hanya folder turunan `storage/archive/` yang dapat dihapus.
7. Penghapusan proyek memakai konfirmasi dua langkah.
8. Penghapusan proyek menghapus data database, run, artifact, folder proyek, audio, dan word timing.

### E. Pratinjau dan Riwayat Versi

1. Gudang menampilkan file kerja aktif dan file versi lama.
2. Label **Versi Draft Naskah**, **Versi Storyboard**, dan **Versi Word Timing** berasal dari snapshot artifact pada database.
3. Angka `v1`, `v2`, dan seterusnya menunjukkan urutan revisi.
4. File tanpa label `Versi` adalah file kerja aktif terbaru.
5. Video `render.mp4` ditambahkan ke daftar Gudang sebagai file media.
6. Versi render lama dapat dipratinjau dari record artifact.
7. Migrasi kompatibilitas mengenali render lama dari `storage/{slug}/render/` dan output Remotion lama.

### F. Penyederhanaan HUD

1. Tombol **Scan File** dihapus dari top-bar.
2. Tombol **Upload Dokumen** dihapus dari top-bar.
3. Handler upload dan scan beserta input file pendukung dihapus dari komponen utama.

### G. Validasi yang Telah Dijalankan

1. `python tools/run_learning_notes.py --self-test`: lulus.
2. `python tools/run_content_planner.py --self-test`: lulus.
3. `python tools/run_scriptwriter.py --self-test`: lulus.
4. `python tools/run_storyboard_agent.py --self-test`: lulus.
5. `python tools/run_storyboard.py --self-test`: lulus.
6. Compile Python backend: lulus.
7. Frontend production build: lulus.
8. Backend smoke test: seluruh pemeriksaan lulus.
9. Orchestrator workflow test: seluruh tahap dan approval lulus.
10. Smoke test Storage Vault: lulus.
11. Smoke test penghapusan arsip: lulus.
12. Smoke test pratinjau video render: lulus.

### H. Kalibrasi Produksi Konten P1

1. Kecepatan bicara Scriptwriter dikalibrasi menjadi sekitar 2,0 kata/detik.
2. Batas naskah menjadi 60-125 kata, dengan target 45-55 detik atau 90-110 kata.
3. Maksimal kalimat lisan validator dinaikkan menjadi 18 kata agar kalimat alami tidak ditolak berlebihan.
4. Estimasi durasi pada output Scriptwriter dihitung dengan pembagian `count_words(script) / 2.0`.
5. Prompt `prompts/scriptwriter/v1.md` dan `prompts/scriptwriter_agent.md` diselaraskan dengan batas panjang naskah baru.
6. Fungsi `slug(s)` pada Content Planner membatasi nama slug hingga 32 karakter.
7. Pemotongan slug dipindahkan ke tanda hubung terakhir agar tidak memotong kata di tengah.
8. Cetakan perintah pipeline `--course` kini memprioritaskan `plan.series`, lalu `notes.course`, lalu `notes.title`.
9. Spesifikasi `DiagramScene` kini mewajibkan `layout: "column"`, maksimal 4 node, dan label panah maksimal 12 karakter.
10. Validator storyboard memperkuat batas 4 node, layout kolom, dan panjang label panah.
11. Ditambahkan entrypoint kompatibilitas `tools/run_storyboard.py` yang meneruskan eksekusi ke `run_storyboard_agent.py`.

## Ringkasan
Fitur AI Learning Tutor diterapkan pada tahap `3. Notes`. Tutor memimpin diskusi berdasarkan materi mentah dan hasil analisis, menyimpan perkembangan konsep serta riwayat giliran di `catatan/{name}.session.json`, lalu meneruskan konteks yang relevan ke Learning Notes Agent.

Implementasi kini membatasi konteks LLM, menggunakan prompt Tutor terpisah, memvalidasi schema `TutorTurn`, membedakan fakta per giliran, mendukung sesi dilewati tanpa pemanggilan LLM, dan mempertahankan analogi serta konsep belum dibahas pada catatan.

## Perubahan Utama

### 1. Prompt Tutor Terpisah
Prompt lengkap dipindahkan ke:

- `prompts/learning_tutor/v1.md`

Prompt tersebut mengatur pembukaan sesi dengan peta konsep dan penanda konsep tipis, penjelasan satu konsep per giliran, analogi dan contoh untuk Software Engineer, maksimal satu pertanyaan pemahaman, larangan mengarang fakta di luar materi, pencatatan `unverified_facts`, serta format JSON `TutorTurn`.

`_ask_tutor_json()` pada `apps/backend/app/main.py` membaca prompt dari `agentkit.ROOT / "prompts" / "learning_tutor" / "v1.md"`.

### 2. Konteks LLM Dibatasi
Pemanggilan Tutor tidak lagi mengirim seluruh riwayat sesi. Payload session dipangkas menjadi:

- `summary`
- status dan data `concepts` saat ini
- hanya `messages[-6:]`

Materi dan hasil analisis tetap dikirim sebagai sumber fakta.

### 3. Validator `TutorTurn`
Backend menyediakan `check_tutor_turn(d)` yang memvalidasi:

- `reply`: string tidak kosong.
- `concept_updates`: list objek.
- `id`: wajib cocok dengan konsep yang valid.
- `status`: hanya `belum`, `sebagian`, atau `paham`.
- `new_analogies`: list string.
- `unverified_facts`: list string.
- `session_summary`: string.

Hasil yang tidak memenuhi validator ditolak dan diulang sesuai mekanisme `agentkit.ask`.

### 4. Tag Verifikasi per Giliran
Pesan Tutor baru pada `get_tutor_session` dan `tutor_turn` mengisi `verifikasi_tags` hanya dari `unverified_facts` yang dihasilkan pada giliran tersebut.

Fakta lama atau seluruh `unverified_notes` dari sesi tidak lagi ditampilkan sebagai tag akumulatif pada giliran baru.

### 5. Lewati Sesi
Endpoint baru ditambahkan:

- `POST /videos/{video_id}/tutor/skip`

Endpoint ini menyimpan session dengan:

- `ended: true`
- `skipped: true`
- `video_id`
- status konsep
- ringkasan dan riwayat yang ada

Endpoint tidak memanggil `_ask_tutor_json()` dan langsung mengantrekan tahap `notes`.

Frontend menambahkan pemanggil `skipTutorSession` pada `apps/frontend/src/api.js`, lalu tombol **Lewati Sesi → Langsung Susun Catatan** pada `AgentWorkspaceModal.jsx` menggunakan endpoint tersebut.

### 6. Kontrak Learning Notes
`tools/run_learning_notes.py` tetap mendukung `--session` dan meneruskan session ke prompt Learning Notes.

Untuk session normal, script:

- meneruskan `session.concepts[].analogies` ke `examples` pada section konsep yang cocok;
- menambahkan section atau contoh berbasis sesi bila analogi tidak punya section terkait;
- menandai konsep berstatus `belum` dengan penanda jelas `BELUM DIBAHAS`;
- memasukkan konsep belum dibahas ke `omitted_concepts` beserta statusnya apabila konsep tidak dimasukkan ke section.

Untuk session yang dilewati, `run_learning_notes.py` mengirim `"session": null` bila `session_data.get("skipped")` bernilai `true`, sehingga catatan disusun hanya dari materi dan analisis.

Orkestrasi tahap `notes` pada `apps/backend/app/stages.py` tetap meneruskan file session ke CLI bila file tersedia.

### 7. Antarmuka Tutor
Pada tahap `3. Notes`, frontend menyediakan sub-mode:

- `Sesi Belajar (Tutor)`
- `Catatan & Approval 1`

Mode Tutor berisi:

- Chat Tutor dan pengguna.
- Peta konsep beserta status dan penanda konsep tipis.
- Bank analogi.
- Badge fakta yang perlu diverifikasi.
- Quick interrupt untuk meminta penjelasan ulang atau contoh nyata.
- Tombol mengakhiri sesi.
- Tombol melewati sesi dan menyusun catatan.

## Format Data Sesi

```json
{
  "video_id": 1,
  "ended": false,
  "skipped": false,
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

Pesan tutor dan pengguna pada `messages` memuat `verifikasi_tags`. Untuk pengguna biasanya kosong; untuk Tutor berisi fakta eksternal baru pada giliran tersebut.

## Alur Penggunaan

1. Material dan analisis tersedia.
2. Pengguna membuka atau memulai sesi Tutor.
3. Backend mengambil/membuat session.
4. Tutor memberi pembuka berisi peta konsep dan penanda konsep tipis.
5. Setiap giliran dapat memperbarui status konsep, analogi, ringkasan, dan fakta perlu verifikasi.
6. Pengguna dapat mengakhiri sesi atau melewati sesi.
7. Tahap `notes` dijalankan dengan session normal atau `session: null` untuk sesi dilewati.
8. Learning Notes menyusun catatan dan melewati approval sesuai alur aplikasi.

## Hasil Validasi

Berikut pemeriksaan yang dijalankan:

- `python tools/run_learning_notes.py --self-test`: lulus.
- `python -m compileall -q apps/backend/app tools/run_learning_notes.py`: lulus.
- Backend smoke test: seluruh pemeriksaan lulus.
- Orchestrator workflow test: seluruh 10 tahap dan approval lulus.
- Pemeriksaan validasi `TutorTurn`: valid dan invalid case bekerja sesuai ekspektasi.
- Pemeriksaan pengayaan analogi serta penandaan konsep belum dibahas: lulus.

`pytest` tidak tersedia pada Python lingkungan saat ini, sehingga pengujian backend dijalankan melalui smoke test dan orchestrator test bawaan proyek.

## Catatan Operasional

- Konfigurasi provider dan model Tutor berasal dari video.
- Jika API key penyedia atau koneksi LLM tidak tersedia, pemanggilan Tutor mengembalikan error backend.
- Session bersifat terpisah dari file material, hasil analisis, dan artifact catatan.
- `tutor/reset` membuat session awal baru dan memanggil Tutor untuk pembuka sesi kembali.

## Gudang Proyek dan Isolasi Storage

File kerja tiap proyek kini disimpan di `storage/projects/{slug}/`:

- `material.txt`
- `analysis.json`
- `session.json`
- `notes.txt`
- `notes.v2.json`
- `plan.json`
- `selected_idea.json`
- `script.draft.txt`
- `script.txt`
- `review.json`
- `storyboard.json`
- `render.mp4`

Audio tetap berada di `apps/remotion/public/audio/{slug}.wav` dan word timing di `apps/remotion/public/audio/{slug}.words.json` agar Remotion dapat membacanya langsung.

Fungsi `migrate_legacy_files(name)` menyalin file lama dari `catatan/`, `rencana/`, `naskah/`, dan output Remotion lama ke folder proyek baru hanya jika file tujuan belum ada.

Gudang menyediakan:

- pratinjau teks dan JSON;
- pemutaran audio/video;
- pengarsipan ke `storage/archive/{slug}-{YYYYMMDD-HHMMSS}/`;
- verifikasi ukuran dan SHA-256 sebelum direktori kerja aktif dihapus;
- penghapusan permanen proyek beserta database, artifact, run, audio, dan word timing setelah konfirmasi dua langkah.
- penghapusan permanen folder arsip dari tab **Arsip** setelah konfirmasi dua langkah melalui `DELETE /storage/archives/{folder_name}`.
- memutar file render video pada panel pratinjau Gudang, termasuk `render.mp4` proyek dan versi artifact render lama;
- mengenali ulang render lama dari `storage/{slug}/render/` dan output Remotion lama melalui migrasi kompatibilitas.
