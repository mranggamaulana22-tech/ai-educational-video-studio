# Struktur proyek AI Educational Video Studio

Dokumen ini mencatat struktur file proyek yang sedang ada di workspace.
File source, konfigurasi, prompt, naskah, storyboard, dan aset audio dicatat
sampai tingkat terdalam. Dependency, cache, hasil build, hasil render, dan
konfigurasi lokal yang dapat dibuat ulang tidak dirinci.

## Tree lengkap

```text
ai-educational-video-studio/
├── .env.example                          # Template variabel lingkungan
├── .gitignore                             # Aturan file yang diabaikan Git
├── README.md                              # Ringkasan tujuan dan status proyek
├── strukture.md                           # Dokumentasi struktur repository ini
│
├── apps/
│   ├── backend/
│   │   ├── .gitkeep                       # Placeholder direktori backend
│   │   ├── README.md                      # Instruksi backend
│   │   ├── requirements.txt               # Dependency Python backend
│   │   ├── video_studio.db                # Database SQLite aplikasi
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── config.py                  # Konfigurasi aplikasi
│   │   │   ├── db.py                      # Koneksi dan setup database
│   │   │   ├── main.py                    # Entry point API
│   │   │   ├── models.py                  # Model database
│   │   │   ├── service.py                 # Service dan logika bisnis
│   │   │   └── stages.py                  # Tahapan pipeline produksi
│   │   └── tests/
│   │       └── smoke_test.py              # Smoke test backend
│   │
│   ├── frontend/
│   │   ├── .gitignore                     # Ignore dependency dan hasil build
│   │   ├── .gitkeep                       # Placeholder direktori frontend
│   │   ├── README.md                      # Instruksi frontend
│   │   ├── index.html                     # HTML entry point Vite
│   │   ├── package.json                   # Dependency dan script frontend
│   │   ├── package-lock.json              # Lockfile dependency npm
│   │   ├── vite.config.js                 # Konfigurasi Vite
│   │   └── src/
│   │       ├── App.jsx                    # Komponen aplikasi utama
│   │       ├── api.js                    # Client API backend
│   │       ├── main.jsx                  # Entry point React
│   │       └── styles.css                # Style aplikasi
│   │
│   └── remotion/
│       ├── .gitignore                    # Ignore dependency dan hasil render
│       ├── .prettierrc                   # Konfigurasi format kode
│       ├── eslint.config.mjs             # Konfigurasi ESLint
│       ├── package.json                  # Dependency dan script aplikasi video
│       ├── package-lock.json             # Lockfile dependency npm
│       ├── README.md                     # Instruksi menjalankan Remotion
│       ├── remotion.config.ts            # Konfigurasi CLI dan render Remotion
│       ├── tsconfig.json                 # Konfigurasi TypeScript
│       │
│       ├── public/
│       │   └── audio/
│       │       ├── engineer-vs-developer.wav       # Audio runtime
│       │       ├── engineer-vs-developer.words.json # Timing kata audio
│       │       ├── hari2-sdlc.wav                   # Audio runtime
│       │       ├── hari2-sdlc.words.json             # Timing kata audio
│       │       ├── sdlc-hari3-kenalan-dengan-6-tahapan-sdl.wav
│       │       ├── sdlc-hari3-kenalan-dengan-6-tahapan-sdl.words.json
│       │       ├── tes-tts.wav                       # Audio uji TTS
│       │       ├── tes1.wav                          # Audio runtime storyboard tes1
│       │       ├── tes1.words.json                   # Timing kata audio
│       │       ├── voiceover-v1.wav                  # Audio runtime versi v1
│       │       └── voiceover-v2.wav                  # Audio runtime versi v2
│       │
│       ├── scripts/
│       │   └── validate-storyboard.mjs    # Validator storyboard dan timeline
│       │
│       └── src/
│           ├── Backdrop.tsx               # Background dan dekorasi visual
│           ├── Composition.tsx            # Renderer storyboard
│           ├── FunIcons.tsx               # Ikon dan animasi ikon bergaya fun
│           ├── FunScenes.tsx               # Scene visual bergaya fun
│           ├── FunScenes2.tsx              # Variasi scene visual bergaya fun
│           ├── FunSubtitle.tsx             # Subtitle dengan gaya visual fun
│           ├── GenericScenes.tsx           # Scene umum berbasis props
│           ├── GitScenes.tsx               # Scene khusus alur Git/GitHub
│           ├── Icons.tsx                   # Definisi dan renderer ikon
│           ├── JobScene.tsx                # Scene perbandingan pekerjaan
│           ├── Kinetic.tsx                 # Subtitle dan animasi kinetic
│           ├── RestaurantScene.tsx         # Scene analogi restoran
│           ├── Root.tsx                    # Registrasi composition Remotion
│           ├── TopBadge.tsx                # Badge informasi bagian atas video
│           ├── Transition.tsx              # Transisi antar-scene
│           ├── components.tsx              # Komponen scene dasar dan utilitas
│           ├── fx.ts                       # Helper efek visual dan animasi
│           ├── index.ts                    # Entry point Remotion
│           ├── registry.ts                 # Registry komponen scene
│           ├── storyboard.ts               # Tipe data storyboard TypeScript
│           ├── theme.ts                    # Token warna, font, dan motion
│           │
│           └── storyboards/
│               ├── agent-auto.json         # Storyboard hasil alur agent otomatis
│               ├── agent-test.json         # Storyboard uji agent
│               ├── engineer-vs-developer.json # Perbandingan engineer/developer
│               ├── generic-demo.json      # Demo scene umum
│               ├── git-github-v2.json     # Storyboard Git/GitHub tema v2
│               ├── git-github.json        # Storyboard Git/GitHub dasar
│               ├── git-scenes-demo.json   # Demo scene file, commit, dan cloud
│               ├── hari2-sdlc.json        # Storyboard alur SDLC
│               ├── html-css-js.json       # Pengantar HTML, CSS, dan JavaScript
│               ├── icon-demo.json         # Demo komponen dan variasi ikon
│               ├── kinetic-demo.json      # Demo subtitle kinetic
│               ├── sdlc-hari3-kenalan-dengan-6-tahapan-sdl.json
│               ├── tes1.json              # Storyboard uji pertama
│               └── transition-demo.json   # Demo variasi transisi
│
├── catatan/
│   ├── hari2-sdlc.txt                     # Catatan materi SDLC
│   ├── sdlc-hari3-kenalan-dengan-6-tahapan-sdl.txt
│   ├── sdlc-hari4-siapa-saja-stakeholders-dala.txt
│   ├── sdlc-hari5-cara-menggali-dan-menyusun-r.txt
│   ├── sdlc-hari6-membongkar-isi-dokumen-srs.txt
│   ├── sdlc-hari7-perbedaan-urs-dan-sysrs-waji.txt
│   ├── sdlc.notes.json                    # Catatan terstruktur
│   └── sdlc.notes.md                      # Ringkasan catatan SDLC
│
├── docs/
│   ├── COMPONENTS.md                      # Katalog komponen dan props storyboard
│   └── CONTEXT.md                         # Konteks produk dan keputusan teknis
│
├── naskah/
│   ├── engineer-vs-developer.txt          # Naskah perbandingan engineer/developer
│   ├── hari2-sdlc.txt                     # Naskah materi SDLC
│   ├── sdlc-hari3-kenalan-dengan-6-tahapan-sdl.txt
│   └── tes1.txt                           # Naskah uji
│
├── output/
│   └── .gitkeep                           # Placeholder output video final
│
├── prompts/
│   ├── .gitkeep                           # Placeholder prompt tingkat root
│   ├── content_planner.md                 # Prompt perencana konten
│   ├── learning_agent.md                  # Prompt learning agent
│   ├── prompts/
│   │   ├── CARA_PAKAI.md                  # Cara menggunakan prompt
│   │   └── storyboard_agent.md            # Prompt storyboard agent versi nested
│   ├── script_reviewer.md                 # Prompt peninjau naskah
│   ├── scriptwriter_agent.md              # Prompt penulis naskah
│   └── storyboard_agent.md                # Prompt pembuat storyboard
│
├── rencana/
│   └── sdlc.plan.json                     # Rencana konten SDLC
│
├── scripts/
│   └── .gitkeep                           # Placeholder script lintas aplikasi
│
├── shared/
│   ├── contracts/
│   │   └── .gitkeep                       # Placeholder kontrak antar aplikasi
│   └── schemas/
│       └── .gitkeep                       # Placeholder schema bersama
│
├── storage/
│   ├── library/
│   │   ├── backgrounds/
│   │   │   └── .gitkeep                   # Library background visual
│   │   ├── characters/
│   │   │   └── .gitkeep                   # Library karakter
│   │   ├── fonts/
│   │   │   └── .gitkeep                   # Library font
│   │   ├── icons/
│   │   │   └── .gitkeep                   # Library ikon
│   │   ├── music/
│   │   │   └── .gitkeep                   # Library musik
│   │   └── sound-effects/
│   │       └── .gitkeep                   # Library sound effect
│   │
│   ├── projects/
│   │   ├── .gitkeep                       # Placeholder aset proyek
│   │   ├── git-github/
│   │   │   └── audio/
│   │   │       └── voiceover-v2.wav       # Audio sumber proyek Git/GitHub
│   │   └── html-css-js/
│   │       └── audio/
│   │           └── voiceover-v1.wav       # Audio sumber proyek HTML/CSS/JS
│
│   └── voice-samples/
│       ├── Kore.txt                       # Metadata/sample voice
│       └── Kore.wav                       # Audio sample voice
│
└── tools/
    ├── agentkit.py                        # Helper agent
    ├── align_audio.py                     # Menyelaraskan audio dan timing
    ├── apply_word_times.py                # Menerapkan timing per kata
    ├── llm.py                             # Helper komunikasi dengan LLM
    ├── make_agent_input.py                # Membuat input untuk agent
    ├── naskah-tes.txt                     # Naskah input uji tool
    ├── pipeline.py                        # Orkestrasi pipeline produksi
    ├── run_content_planner.py             # Menjalankan content planner agent
    ├── run_learning_agent.py              # Menjalankan learning agent
    ├── run_scriptwriter.py                # Menjalankan scriptwriter agent
    ├── run_storyboard_agent.py            # Menjalankan storyboard agent
    ├── setup_db.py                        # Menyiapkan database aplikasi
    └── tts_gemini.py                      # Menghasilkan audio dengan Gemini TTS
```

## Rincian aplikasi Remotion

`apps/remotion/` adalah aplikasi renderer video. Storyboard JSON menjadi
input utama, sedangkan komponen React/Remotion yang terdaftar di
`src/registry.ts` menjadi renderer yang boleh digunakan storyboard.

### File konfigurasi

| File | Fungsi |
| --- | --- |
| `package.json` | Dependency Remotion, React, TypeScript, ESLint, dan script proyek. |
| `package-lock.json` | Mengunci versi dependency agar instalasi konsisten. |
| `remotion.config.ts` | Konfigurasi CLI dan render Remotion. |
| `tsconfig.json` | Aturan compiler TypeScript. |
| `eslint.config.mjs` | Aturan pemeriksaan kualitas kode. |
| `.prettierrc` | Aturan format kode. |
| `.gitignore` | Daftar dependency dan artefak Remotion yang diabaikan Git. |

### Alur rendering

1. `src/index.ts` mendaftarkan entry point Remotion.
2. `src/Root.tsx` mendaftarkan composition video.
3. `src/Composition.tsx` membaca `Storyboard`, memilih komponen dari registry,
   mengubah milidetik menjadi frame, lalu merender scene dan audio.
4. `src/storyboard.ts` menyediakan tipe data TypeScript untuk storyboard.
5. `src/storyboards/*.json` menyediakan data scene, audio, subtitle, dan
   metadata video.
6. `scripts/validate-storyboard.mjs` memeriksa struktur, durasi, urutan scene,
   props komponen, transition, dan batas waktu animasi sebelum render.

### Komponen visual

| File | Isi |
| --- | --- |
| `components.tsx` | Scene dasar dan helper konversi waktu. |
| `GenericScenes.tsx` | Scene umum seperti statement, cards, flow, CTA, dan icon. |
| `FunScenes.tsx` / `FunScenes2.tsx` | Scene animasi dengan gaya visual fun. |
| `FunIcons.tsx` | Ikon animasi untuk scene bergaya fun. |
| `FunSubtitle.tsx` | Renderer subtitle bergaya fun. |
| `GitScenes.tsx` | Scene file, commit, sinkronisasi cloud, dan ringkasan ikon. |
| `JobScene.tsx` | Scene perbandingan peran pekerjaan. |
| `RestaurantScene.tsx` | Scene analogi restoran. |
| `Icons.tsx` | Definisi nama ikon, komponen ikon, dan showcase. |
| `Backdrop.tsx` | Background dan dekorasi tema. |
| `Kinetic.tsx` | Animasi subtitle kinetic. |
| `TopBadge.tsx` | Badge top-level pada tampilan video. |
| `Transition.tsx` | Implementasi transisi antar-scene. |
| `fx.ts` | Helper efek visual. |
| `theme.ts` | Token warna, tipografi, ukuran, dan gerak. |
| `registry.ts` | Pemetaan nama komponen storyboard ke renderer. |

## Tools pipeline

Folder `tools/` berisi utilitas Python untuk mengubah naskah menjadi input
agent, menjalankan agent penulis dan storyboard, menghasilkan TTS, serta
menyelaraskan audio dengan timing subtitle.

1. `make_agent_input.py` menyiapkan input terstruktur untuk agent.
2. `run_scriptwriter.py` menjalankan proses pembuatan naskah.
3. `run_storyboard_agent.py` menghasilkan storyboard JSON.
4. `tts_gemini.py` menghasilkan audio voiceover.
5. `align_audio.py` dan `apply_word_times.py` memproses timing audio/kata.
6. `pipeline.py` mengorkestrasi tahapan pipeline.
7. `llm.py` menyediakan helper komunikasi dengan model bahasa.

## Format storyboard

Setiap file storyboard berada di `apps/remotion/src/storyboards/` dan
mengikuti bentuk umum berikut:

```json
{
  "schemaVersion": "1.1",
  "video": {
    "title": "Judul video",
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "durationMs": 30000,
    "theme": "classic"
  },
  "audio": {
    "src": "audio/voiceover-v1.wav",
    "durationMs": 30000
  },
  "scenes": [],
  "subtitles": []
}
```

Ketentuan penting:

- Semua waktu menggunakan milidetik (`Ms`), bukan frame.
- `Scene.transition` boleh bernilai `none`, `fade`, `slide`, `zoom`, atau
  `wipe`.
- `Scene.component` harus tersedia di registry `src/registry.ts`.
- `Scene.props` harus sesuai spesifikasi komponen pada validator.
- Total `startMs + durationMs` seluruh scene harus mengikuti durasi video.
- `audio.src` dibaca relatif terhadap `apps/remotion/public/`.

## Pemetaan aset audio

Audio sumber proyek disimpan di `storage/projects/`, sedangkan audio yang
dibaca Remotion harus tersedia di `apps/remotion/public/audio/`.

| Proyek | Sumber | File runtime | Nilai `audio.src` |
| --- | --- | --- | --- |
| `html-css-js` | `storage/projects/html-css-js/audio/voiceover-v1.wav` | `apps/remotion/public/audio/voiceover-v1.wav` | `audio/voiceover-v1.wav` |
| `git-github` | `storage/projects/git-github/audio/voiceover-v2.wav` | `apps/remotion/public/audio/voiceover-v2.wav` | `audio/voiceover-v2.wav` |
| `hari2-sdlc` | — | `apps/remotion/public/audio/hari2-sdlc.wav` | `audio/hari2-sdlc.wav` |
| `sdlc-hari3` | — | `apps/remotion/public/audio/sdlc-hari3-kenalan-dengan-6-tahapan-sdl.wav` | `audio/sdlc-hari3-kenalan-dengan-6-tahapan-sdl.wav` |

## Folder yang sengaja tidak dirinci

Folder/file berikut tidak dimasukkan ke tree utama karena bukan source yang
perlu dicatat satu per satu:

- `node_modules/`: dependency hasil `npm install`.
- `.venv*/`: virtualenv Python dan package hasil instalasi.
- `.git/`: metadata internal Git.
- `apps/remotion/out/`: video, gambar, dan hasil render sementara.
- `dist/`, `build/`, `coverage/`, `__pycache__/`, dan cache tooling: artefak
  generated.
- `.env`: konfigurasi lokal/rahasia; hanya `.env.example` yang dicatat.
- Lockfile `package-lock.json` tetap dicatat karena merupakan file konfigurasi
  yang dilacak Git, bukan isi folder dependency.

Placeholder `.gitkeep` tetap dicatat karena menjaga folder kosong agar tetap
tersedia di repository.
