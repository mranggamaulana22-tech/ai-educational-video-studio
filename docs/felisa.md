# Felisa Studio Leader - Laporan Proyek

Tanggal laporan: 2026-11-21

## Ringkasan

Felisa adalah koordinator operasional lintas proyek untuk AI Educational Video Studio. Implementasi saat ini mencakup dua lapisan P7:

1. **P7 Lapis 1 - Saluran Realtime**
   - Event bus in-memory.
   - Server-Sent Events (SSE).
   - Panel pesan Felisa di frontend.
   - Penyegaran ringkasan proyek saat event diterima.

2. **P7 Lapis 2 - Koordinator Interaktif**
   - Ringkasan kondisi seluruh proyek.
   - Perintah Bahasa Indonesia deterministik.
   - Fallback LLM terstruktur.
   - Konfirmasi aksi penting.
   - Eksekusi advance, approve, dan run stage.
   - Navigasi UI untuk Tutor, Gudang, tahap, dan approval.

Status keseluruhan: **implementasi aktif dan build lulus**, tetapi beberapa jalan aksi masih perlu hardening dan pengujian end-to-end.

## Kemampuan Saat Ini

### Panel Felisa

Felisa tampil sebagai panel kaca di sisi kanan bawah aplikasi.

Kemampuan yang tersedia:

- status koneksi realtime;
- sapaan dari ringkasan status awal backend;
- pesan terbaru dari event `leader_message` dan event pipeline;
- tombol aksi cepat pada event;
- riwayat 50 event terbaru, dapat dibuka/dilipat;
- input perintah bebas;
- chip saran:
  - `Status proyek`
  - `Lanjutkan tahap`
  - `Setujui`
- konfirmasi `Jalankan` / `Batal`;
- mode minimize menjadi kapsul kecil.

Panel dipasang secara global di [App.jsx](../apps/frontend/src/App.jsx), bukan hanya pada satu workspace agen.

### Perintah yang Didukung

Pencocokan deterministik saat ini mengenali:

- `status`, `ringkas`, `ringkasan`, `laporan`;
- `gudang`, `storage`, `arsip`;
- `tutor`;
- `setujui`, `approve`, `approval`;
- `lanjut`, `lanjutkan`, `advance`;
- `jalankan <tahap>`;
- `buat/buatkan/create proyek/project/video`.

Tahap yang dikenali:

`material`, `analysis`, `notes`, `ideas`, `script`, `review`, `audio`, `words`, `storyboard`, `render`

Titik persetujuan yang dikenali:

`notes`, `ideas`, `script`, `audio`, `video`

### Aksi yang Memerlukan Konfirmasi

Felisa menandai `requires_confirmation: true` untuk:

- advance/lanjutkan orkestrator;
- menjalankan tahap AI;
- menjalankan render;
- membuat proyek baru.

Aksi tanpa proses besar dapat langsung dinavigasikan:

- buka Tutor;
- buka Gudang;
- pilih proyek;
- buka stage tertentu;
- cek status.

## Arsitektur

```text
Event dan status pipeline
  service.py / main.py / leader.py
             |
             v
      StudioEventBus
             |
             v
       GET /events (SSE)
             |
             v
 FelisaLeaderPanel (EventSource)

Perintah pengguna
  FelisaLeaderPanel
             |
             v
 POST /leader/command
             |
             v
 interpret_command()
             |
       +-----+-----+
       |           |
  navigasi     pending_action
       |           |
       v           v
  App.jsx      konfirmasi UI
                   |
                   v
 POST /leader/execute
                   |
                   v
             execute_action()
```

## Alur Data Utama

### 1. Sapaan dan Ringkasan Awal

Saat panel Felisa dipasang:

1. frontend memanggil `GET /leader/status`;
2. backend memanggil `build_studio_brief(session)`;
3. backend membaca seluruh proyek, run, dan artifact;
4. Felisa mengembalikan ringkasan berbahasa Indonesia;
5. panel menampilkan ringkasan sebagai pesan awal.

### 2. Event Realtime

Saat tahap atau aksi terjadi:

1. backend memanggil `emit_studio_event(...)`;
2. event ditambahkan ke buffer maksimum 50;
3. event dikirim ke seluruh subscriber `asyncio.Queue`;
4. endpoint `/events` mengirim event sebagai SSE;
5. `FelisaLeaderPanel` menambahnya ke riwayat;
6. `App.jsx` menyegarkan ringkasan proyek melalui `loadVideos()`.

### 3. Perintah Felisa

Saat pengguna mengirim perintah:

1. frontend memanggil `POST /leader/command`;
2. backend memanggil `interpret_command(...)`;
3. kata kunci dicocokkan secara deterministik;
4. bila tidak cocok, backend mencoba fallback LLM memakai prompt Felisa;
5. bila tidak ada provider/kunci atau fallback gagal, backend mengembalikan pesan perintah tidak dikenali;
6. aksi berbahaya dikembalikan sebagai `pending_action`;
7. frontend menampilkan kotak konfirmasi.

### 4. Eksekusi Aksi

Setelah pengguna menekan **Jalankan**:

1. frontend memanggil `POST /leader/execute`;
2. backend memanggil `execute_action(...)`;
3. aksi advance, approve, atau run stage dijalankan;
4. backend memancarkan `leader_message`;
5. frontend menyegarkan UI dan mengikuti navigasi yang diminta.

## File yang Terlibat

### Backend

| File | Peran |
|---|---|
| `apps/backend/app/events.py` | Event bus in-memory, buffer 50 event, subscriber SSE, helper payload Felisa |
| `apps/backend/app/leader.py` | Ringkasan lintas proyek, interpretasi perintah, eksekusi aksi, fallback LLM |
| `apps/backend/app/main.py` | Endpoint `/events`, `/leader/status`, `/leader/command`, `/leader/execute`, serta endpoint Tutor yang memancarkan event |
| `apps/backend/app/service.py` | Integrasi event ke mulai/selesai/gagal tahap, target approval, dan sesi Tutor |
| `apps/backend/app/models.py` | Sumber data `Video`, `Run`, `Artifact`, dan `Series` |
| `apps/backend/app/db.py` | Penyedia `Session` dan `SessionLocal` untuk aksi/BackgroundTasks |
| `apps/backend/app/stages.py` | Urutan 10 tahap, approval points, dependency, dan lokasi file tahap |

### Prompt

| File | Peran |
|---|---|
| `prompts/leader_felisa/v1.md` | Identitas, peran, stage pipeline, approval point, format JSON, dan aturan konfirmasi Felisa |

### Frontend

| File | Peran |
|---|---|
| `apps/frontend/src/FelisaLeaderPanel.jsx` | Panel, SSE, status, log, perintah, chip saran, konfirmasi, dan minimize/expand |
| `apps/frontend/src/agentsConfig.js` | Definisi metadata `FELISA_LEADER` |
| `apps/frontend/src/api.js` | `getEventsUrl`, `getLeaderStatus`, `sendLeaderCommand`, `executeLeaderAction` |
| `apps/frontend/src/App.jsx` | Pemasangan panel dan callback navigasi/pemilihan proyek/pemuatan ringkasan |
| `apps/frontend/src/styles.css` | Komponen kaca/HUD yang digunakan panel |

### Dokumentasi

| File | Peran |
|---|---|
| `docs/felisa.md` | Laporan khusus ini untuk handoff antar-AI |
| `docs/AI_TUTOR_LED_IMPLEMENTATION_REPORT.md` | Laporan implementasi sesi yang berisi ringkasan P7 |

## Kontrak Backend

### Payload Leader

Prompt Felisa mengarahkan keluaran terstruktur:

```json
{
  "reply": "Pesan ringkas",
  "intent": "status",
  "video_id": null,
  "stage": "",
  "approval_point": "",
  "project_title": "",
  "requires_confirmation": false
}
```

Intent deterministik yang digunakan saat ini:

- `status`
- `advance`
- `approve`
- `run_stage`
- `open_tutor`
- `open_storage`
- `select_project`
- `create_project`
- `navigate`
- `unknown`

### Payload Event

```json
{
  "id": "uuid",
  "timestamp": "2026-11-21T...",
  "type": "stage_started",
  "video_id": 1,
  "video_title": "Judul Proyek",
  "stage": "analysis",
  "felisa_message": "Pesan Bahasa Indonesia",
  "action_hint": "open_stage"
}
```

Tipe event:

- `stage_started`
- `stage_completed`
- `stage_failed`
- `waiting_approval`
- `tutor_ready`
- `leader_message`

Action hint frontend:

- `open_tutor`
- `open_approval`
- `open_stage`

## Endpoint

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/events` | Stream SSE + heartbeat 15 detik |
| `GET` | `/leader/status` | Ringkasan lintas proyek |
| `POST` | `/leader/command` | Interpretasi perintah dan pending action |
| `POST` | `/leader/execute` | Eksekusi pending action yang dikonfirmasi |

Contoh request command:

```json
{
  "message": "Lanjutkan tahap",
  "video_id": 1
}
```

Contoh respons membutuhkan konfirmasi:

```json
{
  "result": {
    "reply": "Konfirmasi lanjutkan orkestrator?",
    "intent": "advance",
    "video_id": 1,
    "stage": "",
    "approval_point": "",
    "project_title": "Judul Proyek",
    "requires_confirmation": true
  },
  "pending_action": {
    "action": "advance",
    "video_id": 1,
    "stage": "",
    "approval_point": "",
    "project_title": "Judul Proyek"
  }
}
```

Contoh request execute:

```json
{
  "pending_action": {
    "action": "advance",
    "video_id": 1,
    "stage": "",
    "approval_point": ""
  }
}
```

## Integrasi dengan Orkestrator

`execute_run` memancarkan event pada:

- sebelum proses tahap dijalankan: `stage_started`;
- tahap berhasil: `stage_completed`;
- tahap gagal: `stage_failed`;
- tahap `analysis` berhasil: `tutor_ready`;
- hasil mendekati/menyentuh gate manual: `waiting_approval`.

`advance_workflow` memancarkan `waiting_approval` saat tidak ada lagi tahap yang dapat dijalankan dan ditemukan artifact draft yang menunggu.

Sesi Tutor memancarkan `tutor_ready` pada endpoint:

- `POST /videos/{video_id}/tutor/finish`
- `POST /videos/{video_id}/tutor/skip`

## Integrasi Frontend

`FelisaLeaderPanel.jsx`:

- membuat `EventSource(getEventsUrl())`;
- memperbarui status pada `onopen` dan `onerror`;
- browser EventSource menangani reconnect otomatis;
- menyimpan 50 event terbaru di state;
- memanggil `getLeaderStatus()` sekali saat dipasang;
- memanggil `onNavigate(response.result)` setelah command;
- memanggil `onEvent(event)` untuk penyegaran ringkasan.

`App.jsx` menangani callback navigasi:

- `open_storage` membuka Gudang;
- `open_tutor` membuka workspace Notes dengan sub-mode Tutor;
- `open_approval`/`approve` membuka workspace approval;
- `open_stage`/`run_stage` membuka workspace stage;
- event dengan `video_id` mencoba memilih proyek yang bersangkutan.

Panel minimize:

- berada di `bottom-12` agar tidak menutupi dock agen paling bawah;
- saat minimize, hanya kapsul Felisa yang ditampilkan;
- saat expand, panel kembali ditampilkan.

## Status Verifikasi

Verifikasi yang telah dijalankan:

- `python -m compileall -q apps/backend/app`: lulus.
- `npm run build` pada `apps/frontend`: lulus.
- `GET /leader/status`: lulus dan mengembalikan ringkasan lintas proyek.
- `POST /leader/command` dengan `Status proyek`: lulus, `requires_confirmation: false`.
- `POST /leader/command` dengan `Lanjutkan tahap`: lulus, mengembalikan `pending_action advance`.
- `POST /leader/command` dengan `Jalankan analysis`: lulus, mengembalikan `pending_action run_stage`.
- SSE `GET /events`: koneksi terbuka dan heartbeat `: ping` setiap 15 detik terverifikasi.
- Build frontend tidak memiliki error; terdapat warning chunk Vite yang lebih besar dari 500 kB.

Verifikasi yang belum dijalankan secara penuh:

- eksekusi nyata `POST /leader/execute` untuk advance;
- eksekusi nyata approve;
- eksekusi nyata run stage;
- eksekusi create project;
- fallback LLM Felisa dengan provider aktif;
- reconnect SSE setelah pemutusan jaringan;
- pengujian UI panel dalam ukuran layar sempit.

## Batas dan Pekerjaan Sisa

### 1. Pembuatan Proyek Lewat Felisa Belum Lengkap

Perintah `create_project` menghasilkan pending action, tetapi UI saat ini belum meminta data proyek secara terstruktur:

- slug/name;
- judul;
- hari;
- seri;
- provider/model.

`execute_action` mencoba menurunkan slug dari `project_title`, tetapi perintah seperti `buat proyek baru` tidak memiliki slug/judul yang jelas. Jalur ini sebaiknya tidak dieksekusi sampai panel menampilkan form detail proyek atau perintah pemetaan mencakup nama eksplisit.

### 2. Konfirmasi Approve Belum Teruji End-to-End

Action `approve` terhubung ke `service.approve`, tetapi perlu smoke test dengan artifact berstatus draft agar dipastikan `approval_point`, tahap target, dan refresh UI konsisten.

### 3. Pemilihan Proyek dari Perintah Belum Punya Nama Multi-Proyek yang Eksplisit

Perintah deterministik menggunakan proyek aktif/frontend sebagai target. Fallback LLM dapat mengembalikan `video_id`, tetapi belum ada parser deterministik untuk nama proyek atau judul dari kalimat seperti:

- `pilih proyek string`;
- `lanjutkan proyek uji-tutor`;
- `setujui proyek p0-tutor`.

Pekerjaan lanjutan sebaiknya mencocokkan nama/judul proyek dari daftar `brief.projects` sebelum fallback LLM.

### 4. Ringkasan Belum Memiliki Cekasi yang Lebih Kaya

Brief saat ini mengelompokkan waiting, running, failed, dan ready. Belum menunjukkan:

- progres persentase seluruh tahap;
- stage terakhir yang berhasil;
- artifact yang stale;
- error ringkas terakhir;
- estimasi waktu/kuantitas hasil;
- siapa proyek yang aktif di UI.

### 5. Event Bus Bersifat In-Memory

Ini sengaja dirancang tanpa Redis/dependensi baru. Konsekuensi:

- history hilang saat backend restart;
- subscriber hilang saat koneksi backend putus;
- event tidak bertahan lintas worker/proses;
- tidak cocok untuk deployment multi-process/multi-instance.

Untuk skala saat ini, desain ini sesuai dan ringan.

### 6. Fallback LLM Belum Memiliki Validasi Schema yang Kuat

Fallback saat ini mem-parse JSON dan memberi default field, tetapi belum menjalankan validator ketat untuk:

- jenis `intent`;
- stage yang valid;
- approval point yang valid;
- konsistensi `video_id`;
- larangan aksi berkonfirmasi tinggi.

Hal ini sebaiknya ditambahkan sebelum perintah bebas dipakai sebagai jalur eksekusi utama.

## Rekomendasi AI Selanjutnya

Urutan implementasi yang disarankan:

1. Tambah smoke test `/leader/execute` untuk advance, approve, dan run stage.
2. Tambah action form create project di panel Felisa.
3. Tambah parser proyek berdasarkan nama dan judul di `interpret_command`.
4. Tambah validator ketat payload fallback LLM.
5. Tambah status detail tahap dan artifact stale pada `build_studio_brief`.
6. Tambah test SSE: buffer awal, subscriber, heartbeat, dan reconnect.
7. Tambah confirmation summary yang menampilkan nama proyek sebelum tombol Jalankan.
8. Jangan menambah Redis atau queue eksternal kecuali deployment benar-benar berjalan multi-process.

## Perintah Menjalankan dan Meninjau

Backend, jalankan dari root proyek:

```powershell
python -m uvicorn apps.backend.app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd apps/frontend
npm run dev
```

Smoke test backend:

```powershell
python -m compileall -q apps/backend/app
curl.exe http://127.0.0.1:8000/leader/status
curl.exe -N --max-time 17 http://127.0.0.1:8000/events
```

Build frontend:

```powershell
cd apps/frontend
npm run build
```

## Kesimpulan

Felisa sudah memiliki pondasi lengkap dari sisi arsitektur:

- event bus;
- SSE realtime;
- ringkasan lintas proyek;
- perintah deterministik;
- fallback LLM;
- pending action;
- eksekusi advance/approve/run-stage;
- panel UI interaktif;
- navigasi workspace.

Fitur yang paling perlu dilanjutkan adalah ketebalan eksekusi aksi: smoke test execute end-to-end, form create project, parser multi-proyek, dan validator payload LLM. Setelah itu, Felisa sudah dapat diperlakukan sebagai koordinator produksi yang aman untuk konfirmasi interaktif, tanpa Redis atau layanan eksternal baru.
