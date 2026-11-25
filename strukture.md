# Struktur Proyek AI Educational Video Studio

Dokumen ini mencatat struktur source, konfigurasi, data per proyek, prompt,
kontrak, schema, aset antarmuka, dan aplikasi yang benar-benar ada di
workspace. Dependency terpasang, cache, virtual environment, database lokal,
media berat, hasil build, dan hasil render tidak diperinci karena dapat dibuat
ulang atau tidak masuk Git.

Terakhir diperbarui: 24 November 2026.

## Struktur utama

```text
ai-educational-video-studio/
├── .env                                      # Rahasia/provider lokal; tidak ikut Git
├── .env.example                              # Template variabel lingkungan
├── .gitignore
├── README.md
├── copilot-instructions.md                   # Konteks kerja dan keputusan proyek
├── serve.ps1                                 # Shortcut menjalankan backend
├── strukture.md                              # Dokumen struktur repository
│
├── apps/
│   ├── backend/
│   │   ├── README.md
│   │   ├── requirements.txt
│   │   ├── video_studio.db                   # Database lokal saat ini
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── config.py                     # Path root, storage, dan Remotion
│   │   │   ├── db.py                         # SQLAlchemy engine/session
│   │   │   ├── events.py                     # Event bus in-memory + payload Felisa
│   │   │   ├── felisa_chat.py                # Chat Felisa, cache, dan suara
│   │   │   ├── leader.py                     # Ringkasan, perintah, dan eksekusi Leader
│   │   │   ├── main.py                       # FastAPI API, SSE, Tutor, video, storage
│   │   │   ├── models.py                     # Series, Video, Artifact, Run
│   │   │   ├── service.py                    # Workflow, artifact, approval, stale
│   │   │   └── stages.py                     # Tahap, approval, path, dan command
│   │   └── tests/
│   │       ├── felisa_chat_test.py
│   │       ├── orchestrator_test.py
│   │       └── smoke_test.py
│   │
│   └── frontend/
│       ├── README.md
│       ├── index.html
│       ├── package.json
│       ├── package-lock.json
│       ├── vite.config.js
│       ├── public/
│       │   ├── audio/felisa/                 # Preview dan suara status Felisa
│       │   └── models/felisa/layers/         # Kit rig 2.5D Felisa
│       ├── src/
│       │   ├── App.jsx                       # Dashboard/command center
│       │   ├── main.jsx
│       │   ├── styles.css
│       │   ├── api.js
│       │   ├── agentsConfig.js               # Konfigurasi 10 tahap/agent
│       │   ├── AgentWorkspaceModal.jsx       # Workspace tiap tahap
│       │   ├── CommandCenter3D.jsx           # Tata letak 3D dashboard
│       │   ├── FelisaChatPanel.jsx           # Percakapan Felisa
│       │   ├── FelisaLayered.jsx             # Avatar 2.5D berlapis
│       │   ├── FelisaLeaderPanel.jsx         # Panel Leader + SSE
│       │   ├── FelisaRoom.jsx                # Ruang Felisa
│       │   ├── StorageModal.jsx              # Gudang dan arsip
│       │   ├── felisaIntents.js
│       │   ├── felisaIntents.test.js
│       │   ├── felisaLines.js
│       │   ├── felisaListen.js
│       │   ├── felisaRig.js
│       │   ├── felisaVoice.js
│       │   └── layers/meta.json
│       ├── tools/expressions/
│       │   ├── align.py
│       │   └── patches.py
│       └── remotion/
│           ├── README.md
│           ├── package.json
│           ├── package-lock.json
│           ├── remotion.config.ts
│           ├── tsconfig.json
│           ├── scripts/validate-storyboard.mjs
│           ├── public/audio/                 # Audio dan timing per slug
│           ├── src/
│           │   ├── index.ts
│           │   ├── Root.tsx
│           │   ├── Composition.tsx
│           │   ├── registry.ts
│           │   ├── storyboard.ts
│           │   ├── theme.ts
│           │   ├── fx.ts
│           │   ├── components.tsx
│           │   └── *Scenes.tsx / *Subtitle.tsx
│           └── src/storyboards/*.json
│
├── backup/
│   └── felisa-azure-mp3/                     # Cadangan aset suara Felisa
│
├── catatan/
│   ├── *.txt                                 # Materi/catatan mentah
│   ├── *.analysis.json                       # Hasil Material Analyst
│   ├── *.notes.v2.json
│   ├── *.notes.v2.md
│   ├── *.notes.md
│   └── *.session.json
│
├── docs/
│   ├── CONTEXT.md                            # Konteks produk dan keputusan teknis
│   ├── COMPONENTS.md                         # Registry komponen storyboard
│   ├── felisa.md                             # Dokumentasi implementasi Felisa
│   └── AI_TUTOR_LED_IMPLEMENTATION_REPORT.md
│
├── naskah/
│   ├── *.txt                                 # Naskah/draft
│   ├── *.draft.txt
│   ├── *.draft.segments.json
│   ├── *.segments.json
│   └── *.review.json
│
├── output/
│   └── .gitkeep
│
├── prompts/
│   ├── content_planner.md / content_planner/v1.md
│   ├── material_analyst/v1.md
│   ├── learning_notes/v1.md
│   ├── learning_tutor/v1.md
│   ├── learning_agent.md
│   ├── scriptwriter_agent.md / scriptwriter/v1.md
│   ├── script_reviewer.md / script_reviewer/v1.md
│   ├── storyboard_agent.md / storyboard/v1.md
│   └── leader_felisa/v1.md / chat_v1.md
│
├── rencana/
│   └── *.plan.json
│
├── scripts/
│   └── .gitkeep
│
├── shared/
│   ├── contracts/*.sample.json
│   └── schemas/agents/*.schema.json
│
├── storage/
│   ├── projects/{slug}/                      # Data kerja aktif per proyek
│   │   ├── material.txt
│   │   ├── analysis.json
│   │   ├── session.json
│   │   ├── notes.txt
│   │   ├── notes.v2.json
│   │   ├── plan.json
│   │   ├── selected_idea.json
│   │   ├── script.draft.txt
│   │   ├── script.txt
│   │   ├── review.json
│   │   ├── storyboard.json
│   │   └── artifacts/{stage}/v*.{ext}
│   ├── felisa_chat/                          # Cache chat dan suara Felisa
│   ├── library/                              # Template aset yang akan dipakai
│   └── voice-samples/
│
└── tools/
    ├── agentkit.py
    ├── llm.py
    ├── make_agent_input.py
    ├── run_material_analyst.py
    ├── run_learning_notes.py
    ├── run_learning_agent.py
    ├── run_content_planner.py
    ├── run_scriptwriter.py
    ├── run_script_reviewer.py
    ├── run_storyboard.py
    ├── run_storyboard_agent.py
    ├── tts_gemini.py
    ├── align_audio.py
    ├── apply_word_times.py
    ├── pipeline.py
    ├── setup_db.py
    ├── generate_felisa_voice.py
    ├── list_elevenlabs_voices.py
    └── test_generate_felisa_voice.py
```

## Lokasi sumber per aplikasi

### Backend

`apps/backend/app/` adalah API FastAPI. Modul utamanya:

| File | Fungsi |
| --- | --- |
| `config.py` | Root repository, storage, dan lokasi Remotion. |
| `db.py` | Engine SQLite/SQLAlchemy dan penyedia session. |
| `models.py` | Model `Series`, `Video`, `Artifact`, dan `Run`. |
| `stages.py` | Urutan 10 tahap, titik approval, path data, dan command tool. |
| `service.py` | Versi artifact, stale propagation, approval, pemilihan ide, dan advance. |
| `events.py` | Event bus in-memory dan format pesan Felisa. |
| `leader.py` | Ringkasan lintas proyek, perintah Leader, dan eksekusi aksi. |
| `felisa_chat.py` | Percakapan Felisa, cache respons, dan cache audio. |
| `main.py` | Endpoint REST, SSE `/events`, Tutor, Leader, chat, proyek, dan storage. |

### Frontend

`apps/frontend/` adalah dashboard React 18 + Vite. Komponen utama:

| File | Fungsi |
| --- | --- |
| `App.jsx` | Shell dashboard, pemuatan proyek, navigasi, dan state global. |
| `api.js` | Wrapper request ke backend. |
| `AgentWorkspaceModal.jsx` | Workspace Material sampai Renderer. |
| `CommandCenter3D.jsx` | Visual ruang komando Three.js. |
| `FelisaLeaderPanel.jsx` | Status SSE, perintah, riwayat event, dan konfirmasi aksi. |
| `FelisaChatPanel.jsx` | Percakapan suara/teks Felisa. |
| `FelisaRoom.jsx` | Tampilan Ruang Felisa. |
| `FelisaLayered.jsx` | Rig 2.5D dari lapisan PNG. |
| `StorageModal.jsx` | Gudang proyek, arsip, upload, dan tindakan storage. |

### Remotion

Remotion berada di `apps/frontend/remotion/`, bukan di folder root. Struktur
ini menyimpan renderer, audio per proyek, dan storyboard JSON:

- `src/Composition.tsx`: pembaca audio, storyboard, subtitle, scene, dan transisi.
- `src/Root.tsx`: registrasi composition.
- `src/registry.ts`: pemetaan `componentId` ke komponen React.
- `src/storyboard.ts`: tipe data storyboard.
- `scripts/validate-storyboard.mjs`: validasi storyboard sebelum render.
- `public/audio/{slug}.wav` dan `{slug}.words.json`: sumber narasi dan timing.
- `src/storyboards/{slug}.json`: storyboard legacy/render.
- `out/{slug}.mp4`: output render lokal yang tidak masuk Git.

Komponen scene berada di `src/` dan dikelompokkan berdasarkan jenis visual:
`GenericScenes`, `DiagramScene`, `FunScenes`, `FunScenes2`, `GitScenes`,
`JobScene`, `RestaurantScene`, `Kinetic`, `FunSubtitle`, `Transition`,
`Backdrop`, `TopBadge`, `Icons`, dan `components`.

## Alur produksi

Urutan tahap saat ini di backend:

```text
material -> analysis -> notes -> ideas -> script
         -> review -> audio -> words -> storyboard -> render
```

Titik persetujuan yang dikenali kode saat ini:

| Titik | Tahap yang disetujui |
| --- | --- |
| `notes` | Notes/catatan |
| `ideas` | Pilihan ide |
| `script` | Review/naskah |
| `audio` | Audio narasi |
| `video` | Render final |

Urutan manual tetap 10 tahap:

1. Material
2. Analyst
3. Notes
4. Planner/pilih ide
5. Writer
6. Reviewer
7. Narrator
8. Aligner
9. Storyboard
10. Renderer

## Storage dan migrasi file lama

`storage/projects/{slug}/` adalah lokasi kerja aktif proyek. `stages.paths()`
tetap menyalin file lama dari `catatan/`, `rencana/`, `naskah/`, dan
`apps/frontend/remotion/` ke folder proyek hanya bila file baru belum ada.

Setiap artifact yang didaftarkan disimpan juga sebagai versi di:

```text
storage/projects/{slug}/artifacts/{stage}/v{n}.{ext}
```

Versi lama tidak dihapus. Perubahan di tahap sebelumnya menandai hasil tahap
berikutnya sebagai `stale` dan mencabut approval-nya.

## Event realtime dan Leader Felisa

Backend memancarkan event lewat `GET /events` menggunakan Server-Sent Events:

- `stage_started`
- `stage_completed`
- `stage_failed`
- `waiting_approval`
- `tutor_ready`
- `leader_message`

Event bus bersifat in-memory, menyimpan sampai 50 event, dan dipantau oleh
`FelisaLeaderPanel` melalui `EventSource`. Endpoint perintah tersedia di:

- `GET /leader/status`
- `POST /leader/command`
- `POST /leader/execute`
- `POST /felisa/chat`
- `POST /felisa/event`

## Kontrak dan schema bersama

Direktori `shared/` menyimpan format pertukaran agent:

- `material_analysis.schema.json`
- `learning_notes.schema.json`
- `content_plan.schema.json`
- `script.schema.json`
- `script_review.schema.json`
- `shared/contracts/*.sample.json`

Agent tidak mengakses database atau filesystem secara langsung. Tool mengambil
input dari file, memanggil provider, lalu mengembalikan JSON/artifact yang
divalidasi sebelum dipakai tahap berikutnya.

## File yang sengaja tidak dirinci

- `node_modules/`
- `.venv/`, `.venv-audio/`
- `__pycache__/`, `*.pyc`
- `*.db`, `*.sqlite`, `*.sqlite3`
- `*.wav`, `*.mp3`, `*.mp4`
- `dist/`, `build/`, `apps/frontend/remotion/out/`
- isi `.env` dan credential/provider
- konten lengkap folder `storage/` dan backup aset suara
