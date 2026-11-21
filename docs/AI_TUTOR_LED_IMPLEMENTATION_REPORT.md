# Laporan Implementasi AI Learning Tutor (Tutor-Led)

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
