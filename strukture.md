# Struktur proyek AI Educational Video Studio

Dokumen ini mencatat struktur source, konfigurasi, prompt, kontrak, schema,
tes, naskah, storyboard, dan aset placeholder yang ada di workspace.
Dependency terpasang, cache, virtualenv, database lokal, media besar, hasil
render, dan hasil build tidak dirinci karena dapat dibuat ulang atau terlalu
besar untuk dokumentasi struktur.

## Tree lengkap

```text
ai-educational-video-studio/
├── .env.example                         # Template variabel lingkungan
├── .gitignore                            # Aturan file yang diabaikan Git
├── README.md                             # Ringkasan tujuan dan cara kerja proyek
├── strukture.md                          # Dokumentasi struktur repository
│
├── apps/
│   ├── backend/
│   │   ├── README.md                     # Instruksi menjalankan backend
│   │   ├── requirements.txt              # Dependency Python backend
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── config.py                 # Root proyek, storage, dan Remotion
│   │   │   ├── db.py                     # Engine, Base, dan session SQLAlchemy
│   │   │   ├── main.py                   # Endpoint FastAPI dan response video
│   │   │   ├── models.py                 # Model Series, Video, Artifact, Run
│   │   │   ├── service.py                # Approval, artifact, dan orchestrator
│   │   │   └── stages.py                 # Urutan tahap dan command tiap tahap
│   │   └── tests/
│   │       ├── smoke_test.py             # Tes API dan workflow dasar
│   │       └── orchestrator_test.py      # Tes workflow 10 tahap dan approval
│   │
│   ├── frontend/
│   │   ├── README.md                     # Instruksi aplikasi frontend
│   │   ├── index.html                    # HTML entry point Vite
│   │   ├── package.json                  # Dependency dan script frontend
│   │   ├── package-lock.json             # Lockfile npm
│   │   ├── vite.config.js                # Konfigurasi Vite
│   │   └── src/
│   │       ├── App.jsx                   # UI utama studio
│   │       ├── api.js                    # Client request ke backend
│   │       ├── main.jsx                  # Entry point React
│   │       └── styles.css                # Style aplikasi
│   │
│   └── remotion/
│       ├── README.md                     # Instruksi Remotion dan rendering
│       ├── eslint.config.mjs             # Konfigurasi ESLint
│       ├── package.json                  # Dependency dan script Remotion
│       ├── package-lock.json             # Lockfile npm
│       ├── remotion.config.ts            # Konfigurasi CLI Remotion
│       ├── tsconfig.json                 # Konfigurasi TypeScript
│       ├── public/
│       │   └── audio/                    # Audio dan timing kata runtime
│       ├── scripts/
│       │   └── validate-storyboard.mjs   # Validator schema dan timeline
│       └── src/
│           ├── Backdrop.tsx              # Background dan dekorasi
│           ├── Composition.tsx           # Renderer utama storyboard
│           ├── DiagramScene.tsx          # Scene diagram column/row/grid
│           ├── FunIcons.tsx              # Ikon animasi gaya fun
│           ├── FunScenes.tsx              # Scene gaya fun
│           ├── FunScenes2.tsx             # Variasi scene gaya fun
│           ├── FunSubtitle.tsx            # Subtitle gaya fun
│           ├── GenericScenes.tsx          # BigStatement, cards, flow, CTA, icon
│           ├── GitScenes.tsx              # Scene file, commit, cloud, summary
│           ├── Icons.tsx                  # Definisi dan renderer ikon
│           ├── JobScene.tsx               # Scene perbandingan pekerjaan
│           ├── Kinetic.tsx                # Subtitle dan animasi kinetic
│           ├── RestaurantScene.tsx        # Scene analogi restoran
│           ├── Root.tsx                   # Registrasi composition
│           ├── TopBadge.tsx               # Badge informasi video
│           ├── Transition.tsx             # Transisi antar-scene
│           ├── components.tsx             # Komponen dasar dan utilitas scene
│           ├── fx.ts                      # Helper efek visual
│           ├── index.ts                   # Entry point Remotion
│           ├── registry.ts                # Registry componentId storyboard
│           ├── storyboard.ts              # Tipe data storyboard
│           ├── theme.ts                   # Token warna, font, dan motion
│           └── storyboards/
│               └── *.json                 # Storyboard demo, tes, dan produksi
│
├── catatan/
│   ├── *.txt                              # Materi mentah atau catatan per video
│   ├── *.analysis.json                    # Hasil Material Analyst
│   ├── *.notes.v2.json                    # Learning Notes terstruktur
│   └── *.notes.md                         # Ringkasan Learning Notes
│
├── docs/
│   ├── COMPONENTS.md                      # Katalog componentId dan props
│   └── CONTEXT.md                         # Konteks produk dan keputusan teknis
│
├── naskah/
│   ├── *.txt                              # Naskah final atau draft TTS
│   ├── *.review.json                      # Hasil Script Reviewer
│   └── *.segments.json                    # Segmen naskah ber-ID dan role
│
├── output/
│   └── .gitkeep                           # Placeholder output video final
│
├── prompts/
│   ├── content_planner.md                 # Prompt Content Planner legacy
│   ├── content_planner/
│   │   └── v1.md                          # Prompt Content Planner aktif
│   ├── learning_agent.md                  # Prompt Learning Agent
│   ├── learning_notes/
│   │   └── v1.md                          # Prompt Learning Notes aktif
│   ├── material_analyst/
│   │   └── v1.md                          # Prompt Material Analyst aktif
│   ├── prompts/
│   │   ├── CARA_PAKAI.md                  # Cara menggunakan prompt
│   │   └── storyboard_agent.md            # Prompt storyboard nested/legacy
│   ├── script_reviewer.md                 # Prompt Reviewer legacy
│   ├── script_reviewer/
│   │   └── v1.md                          # Prompt Reviewer 5 kategori PRD
│   ├── scriptwriter_agent.md              # Prompt Scriptwriter legacy
│   ├── scriptwriter/
│   │   └── v1.md                          # Prompt Scriptwriter bersegmen
│   └── storyboard_agent.md                # Prompt Storyboard Agent aktif
│
├── rencana/
│   └── *.plan.json                        # Rencana video dari Content Planner
│
├── scripts/
│   └── .gitkeep                           # Placeholder script lintas aplikasi
│
├── shared/
│   ├── contracts/
│   │   ├── content_planner.sample.json    # Fixture input/output Content Planner
│   │   ├── learning_notes.sample.json    # Fixture Learning Notes
│   │   ├── material_analyst.sample.json  # Fixture Material Analyst
│   │   └── script_reviewer.sample.json   # Fixture Reviewer 5 kategori
│   └── schemas/
│       └── agents/
│           ├── content_plan.schema.json   # Schema rencana konten
│           ├── learning_notes.schema.json # Schema catatan belajar
│           ├── material_analysis.schema.json # Schema analisis materi
│           ├── script.schema.json         # Schema naskah dan segments
│           └── script_review.schema.json  # Schema hasil review
│
├── storage/
│   ├── library/
│   │   ├── backgrounds/.gitkeep            # Placeholder background
│   │   ├── characters/.gitkeep             # Placeholder karakter
│   │   ├── fonts/.gitkeep                  # Placeholder font
│   │   ├── icons/.gitkeep                  # Placeholder ikon
│   │   ├── music/.gitkeep                  # Placeholder musik
│   │   └── sound-effects/.gitkeep          # Placeholder sound effect
│   └── projects/
│       └── .gitkeep                        # Placeholder aset per proyek
│
└── tools/
    ├── agentkit.py                         # Helper pemanggilan agent
    ├── align_audio.py                      # Alignment audio dan timing kata
    ├── apply_word_times.py                 # Menerapkan timing kata ke subtitle
    ├── llm.py                              # Provider dan komunikasi LLM
    ├── make_agent_input.py                 # Membuat input untuk agent
    ├── naskah-tes.txt                      # Input naskah untuk pengujian
    ├── pipeline.py                         # Pipeline manual naskah sampai render
    ├── run_content_planner.py              # Menjalankan Content Planner
    ├── run_learning_agent.py               # Menjalankan Learning Agent
    ├── run_learning_notes.py               # Menghasilkan Learning Notes
    ├── run_material_analyst.py             # Menganalisis materi
    ├── run_script_reviewer.py              # Memeriksa naskah terstruktur
    ├── run_scriptwriter.py                 # Menghasilkan naskah bersegmen
    ├── run_storyboard_agent.py             # Menghasilkan storyboard tervalidasi
    ├── setup_db.py                         # Menyiapkan database
    └── tts_gemini.py                       # Menghasilkan audio Gemini TTS
```

## Rincian aplikasi backend

`apps/backend/` menyediakan API FastAPI, penyimpanan artifact, approval gate,
dan orchestrator workflow. Tahap produksi yang didukung:

```text
material -> analysis -> notes -> ideas -> script
         -> review -> audio -> words -> storyboard -> render
```

### Modul backend

| File | Fungsi |
| --- | --- |
| `app/config.py` | Root repository, lokasi storage, dan lokasi Remotion. |
| `app/db.py` | Engine SQLAlchemy, declarative Base, dan dependency session. |
| `app/models.py` | Model `Series`, `Video`, `Artifact`, dan `Run`. |
| `app/stages.py` | ORDER tahap, approval point, lokasi file, dan command subprocess. |
| `app/service.py` | Registrasi artifact, stale propagation, approval, select idea, dan advance workflow. |
| `app/main.py` | Endpoint video, text stage, run/advance, approval, artifacts, dan status waiting. |
| `tests/smoke_test.py` | Memastikan API dasar, approval, stale artifact, dan log gagal bekerja. |
| `tests/orchestrator_test.py` | Menguji Content Planner, pemilihan ide, Scriptwriter, Reviewer, audio, storyboard, dan render. |

### Endpoint workflow utama

| Endpoint | Kegunaan |
| --- | --- |
| `PUT /videos/{id}/material` | Menyimpan materi manual. |
| `PUT /videos/{id}/notes` | Menyimpan catatan manual. |
| `PUT /videos/{id}/ideas` | Menyimpan plan/ide manual. |
| `POST /videos/{id}/select-idea` | Memilih ide berdasarkan index dan menyetujui tahap ideas. |
| `PUT /videos/{id}/script` | Menyimpan atau mengedit naskah manual. |
| `POST /videos/{id}/run/{stage}` | Menjalankan satu tahap. |
| `POST /videos/{id}/advance` | Menjalankan tahap otomatis berikutnya sampai approval gate. |
| `POST /videos/{id}/approve/{point}` | Menyetujui notes, ideas, script, audio, atau video. |
| `GET /videos/{id}` | Mengambil status seluruh tahap dan detail waiting approval. |

### Approval dan kompatibilitas

- `notes` harus disetujui sebelum Content Planner berjalan.
- `ideas` harus dipilih/disetujui sebelum Scriptwriter berjalan.
- `review` menjadi approval point untuk script.
- `audio` menjadi approval point sebelum alignment dan storyboard.
- `render` menjadi approval point akhir.
- Workflow lama tetap mendukung `notes -> script` bila artifact `ideas` belum ada.
- Workflow lama tetap mendukung `script -> audio` bila artifact `review` belum ada.
- Review yang masih `revise` menghasilkan alasan `belum lolos review`.

## Rincian aplikasi frontend

`apps/frontend/` adalah UI React berbasis Vite untuk mengelola video, status
tahap, approval, dan pemanggilan API backend.

| File | Fungsi |
| --- | --- |
| `src/App.jsx` | Layout dan state utama studio. |
| `src/api.js` | Fungsi request ke endpoint backend. |
| `src/main.jsx` | Mount aplikasi React. |
| `src/styles.css` | Layout, warna, panel, tombol, dan state UI. |
| `vite.config.js` | Konfigurasi dev server dan proxy/build Vite. |

## Rincian aplikasi Remotion

`apps/remotion/` mengubah storyboard JSON menjadi video vertikal. Component
scene tersedia melalui `src/registry.ts`; validator harus dijalankan sebelum
render.

### Alur rendering

1. `src/index.ts` mendaftarkan entry point Remotion.
2. `src/Root.tsx` mendaftarkan composition.
3. `src/Composition.tsx` membaca storyboard, audio, subtitle, scene, dan transition.
4. `src/registry.ts` memetakan `componentId` ke React component.
5. `scripts/validate-storyboard.mjs` memeriksa schema, props, timeline, durasi, dan cue.
6. CLI Remotion merender output ke direktori build/render yang tidak dirinci di dokumen ini.

### Komponen scene penting

| File | Isi |
| --- | --- |
| `GenericScenes.tsx` | BigStatement, CompareCards, FlowSteps, CardList, CTA, IconHero, IconGrid, DiagramScene. |
| `DiagramScene.tsx` | Diagram node/edge dengan layout `column`, `row`, atau `grid`. |
| `FunScenes.tsx` / `FunScenes2.tsx` | Scene animasi bertema fun. |
| `FunIcons.tsx` / `Icons.tsx` | Registry visual dan renderer ikon. |
| `GitScenes.tsx` | File, commit, timeline, cloud sync, dan ringkasan ikon. |
| `Backdrop.tsx` / `TopBadge.tsx` | Background dan informasi bagian atas video. |
| `FunSubtitle.tsx` / `Kinetic.tsx` | Rendering subtitle dengan animasi. |
| `Transition.tsx` | Transisi antar scene. |
| `theme.ts` / `fx.ts` | Token visual dan helper efek. |

## Rincian tools pipeline

### Pipeline produksi

1. **Material Analyst** membaca materi mentah dan menghasilkan analisis.
2. **Learning Notes** mengubah analisis menjadi catatan terstruktur.
3. **Content Planner** membuat daftar ide video, format, hook, dan topik berikutnya.
4. **Scriptwriter** membuat `script` dan `segments`, lalu menyimpan teks TTS.
5. **Script Reviewer** menilai lima kategori dan menghasilkan `.review.json`.
6. **TTS** menghasilkan audio narasi.
7. **Audio Aligner** menghasilkan timing setiap kata.
8. **Storyboard Agent** membuat JSON storyboard dan menjalankan validator.
9. **Remotion** merender storyboard menjadi video.

### Tool utama

| Tool | Tanggung jawab |
| --- | --- |
| `run_material_analyst.py` | Memanggil Material Analyst dan menyimpan analisis JSON. |
| `run_learning_notes.py` | Menghasilkan notes JSON/Markdown dan catatan teks. |
| `run_content_planner.py` | Membuat plan video dan command pipeline per ide. |
| `run_scriptwriter.py` | Membuat naskah 90-170 kata, segments, dan status review. |
| `run_script_reviewer.py` | Memvalidasi review 5 kategori tanpa menulis ulang naskah. |
| `tts_gemini.py` | Mengubah naskah menjadi WAV. |
| `align_audio.py` | Menghasilkan timing kata dari audio. |
| `run_storyboard_agent.py` | Menghasilkan storyboard, memperbaiki validasi, dan fallback split scene. |
| `pipeline.py` | Menjalankan naskah, audio, alignment, storyboard, dan render secara manual. |

## Kontrak dan schema bersama

Direktori `shared/` menyimpan format pertukaran data antar-agent:

- `content_plan.schema.json`: daftar video, format, hook, topik, dan metadata.
- `material_analysis.schema.json`: hasil analisis materi.
- `learning_notes.schema.json`: catatan belajar terstruktur.
- `script.schema.json`: judul, segments ber-role, dan script gabungan.
- `script_review.schema.json`: verdict, lima checks, feedback per segment, dan summary.
- `shared/contracts/*.sample.json`: fixture untuk self-test agent.

## File yang sengaja tidak dirinci

Dokumen ini tidak menguraikan isi atau daftar lengkap:

- `node_modules/`, `.venv/`, dan `.venv-audio/`.
- Database lokal `*.db`, `*.sqlite`, dan `*.sqlite3`.
- Audio/video besar seperti `*.wav`, `*.mp3`, `*.mp4`.
- Cache Python `__pycache__/` dan `*.pyc`.
- Hasil build/render seperti `dist/`, `build/`, `out/`, dan `output/*`.
- Isi `.env` dan credential/provider lokal.
