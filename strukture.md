# Struktur proyek AI Educational Video Studio

Dokumen ini mencatat struktur file proyek yang sedang ada di workspace.
Folder dependency, cache, hasil build, dan hasil render sengaja tidak dirinci
karena dapat dibuat ulang dan tidak menjadi source utama.

## Tree lengkap

```text
ai-educational-video-studio/
├── .env.example                         # Template variabel lingkungan
├── .gitignore                            # Aturan file yang diabaikan Git
├── README.md                             # Ringkasan tujuan dan status proyek
├── strukture.md                          # Dokumentasi struktur repository ini
│
├── apps/
│   ├── backend/
│   │   └── .gitkeep                      # Placeholder; backend belum diimplementasikan
│   │
│   ├── frontend/
│   │   └── .gitkeep                      # Placeholder; frontend belum diimplementasikan
│   │
│   └── remotion/
│       ├── .gitignore                    # Ignore dependency dan hasil render Remotion
│       ├── .prettierrc                   # Konfigurasi format kode
│       ├── eslint.config.mjs             # Konfigurasi ESLint
│       ├── package.json                  # Dependency dan script aplikasi video
│       ├── package-lock.json             # Lockfile dependency npm
│       ├── README.md                     # Instruksi menjalankan Remotion
│       ├── remotion.config.ts            # Konfigurasi Remotion
│       ├── tsconfig.json                 # Konfigurasi TypeScript
│       │
│       ├── public/
│       │   └── audio/
│       │       ├── voiceover-v1.wav      # Audio runtime untuk storyboard v1
│       │       └── voiceover-v2.wav      # Audio runtime untuk storyboard v2
│       │
│       ├── scripts/
│       │   └── validate-storyboard.mjs   # Validator JSON storyboard dan timeline
│       │
│       └── src/
│           ├── index.ts                  # Entry point Remotion
│           ├── Root.tsx                  # Registrasi composition Remotion
│           ├── Composition.tsx           # Renderer storyboard dan registry komponen
│           ├── storyboard.ts             # Tipe Subtitle, Scene, dan Storyboard
│           ├── components.tsx            # Komponen scene dasar dan utilitas waktu
│           ├── Backdrop.tsx              # Background visual untuk tema v2
│           ├── GitScenes.tsx             # Scene FileChaos, CommitTimeline, CloudSync, IconSummary
│           ├── Icons.tsx                 # Komponen ikon dan IconShowcase
│           ├── Kinetic.tsx               # Track subtitle kinetic untuk tema v2
│           ├── Transition.tsx             # Transisi antar-scene
│           ├── theme.ts                  # Warna, font, dan motion token visual
│           │
│           └── storyboards/
│               ├── git-github.json       # Storyboard Git/GitHub versi dasar
│               ├── git-github-v2.json    # Storyboard Git/GitHub dengan tema v2
│               ├── git-scenes-demo.json  # Demo scene Git: file, commit, dan cloud
│               ├── html-css-js.json      # Storyboard pengantar HTML, CSS, dan JavaScript
│               ├── icon-demo.json        # Demo komponen dan variasi ikon
│               ├── kinetic-demo.json     # Demo subtitle dan tampilan kinetic
│               └── transition-demo.json  # Demo transisi none, fade, slide, zoom, wipe
│
├── docs/
│   └── CONTEXT.md                        # Konteks produk, prinsip, alur, dan keputusan teknis
│
├── output/
│   └── .gitkeep                          # Placeholder folder output final
│
├── prompts/
│   └── .gitkeep                          # Placeholder prompt AI
│
├── scripts/
│   └── .gitkeep                          # Placeholder script lintas aplikasi
│
├── shared/
│   ├── contracts/
│   │   └── .gitkeep                      # Placeholder kontrak antar aplikasi
│   └── schemas/
│       └── .gitkeep                      # Placeholder schema bersama
│
└── storage/
    ├── library/
    │   ├── backgrounds/
    │   │   └── .gitkeep                  # Library background visual
    │   ├── characters/
    │   │   └── .gitkeep                  # Library karakter
    │   ├── fonts/
    │   │   └── .gitkeep                  # Library font
    │   ├── icons/
    │   │   └── .gitkeep                  # Library ikon
    │   ├── music/
    │   │   └── .gitkeep                  # Library musik
    │   └── sound-effects/
    │       └── .gitkeep                  # Library sound effect
    │
    ├── projects/
    │   ├── .gitkeep                      # Placeholder folder aset proyek
    │   ├── git-github/
    │   │   └── audio/
    │   │       └── voiceover-v2.wav      # Audio sumber proyek Git/GitHub
    │   └── html-css-js/
    │       └── audio/
    │           └── voiceover-v1.wav      # Audio sumber proyek HTML/CSS/JS
    │
    └── [folder proyek lain]               # Dibuat saat proyek baru ditambahkan
```

## Rincian aplikasi Remotion

`apps/remotion/` adalah aplikasi renderer video. Storyboard JSON menjadi
input utama, sedangkan komponen React/Remotion yang terdaftar di
`src/Composition.tsx` menjadi renderer yang boleh digunakan storyboard.

### File konfigurasi

| File | Fungsi |
| --- | --- |
| `package.json` | Mendefinisikan dependency Remotion, React, TypeScript, ESLint, serta script `dev`, `build`, `lint`, dan `upgrade`. |
| `package-lock.json` | Mengunci versi dependency agar instalasi konsisten. |
| `remotion.config.ts` | Konfigurasi CLI dan render Remotion. |
| `tsconfig.json` | Aturan compiler TypeScript. |
| `eslint.config.mjs` | Aturan pemeriksaan kualitas kode. |
| `.prettierrc` | Aturan format kode. |

### Alur rendering

1. `src/index.ts` mendaftarkan entry point Remotion.
2. `src/Root.tsx` mendaftarkan composition video.
3. `src/Composition.tsx` menerima objek `Storyboard`, memilih komponen dari
   registry, mengubah milidetik menjadi frame, lalu merender scene dan audio.
4. `src/storyboard.ts` menyediakan tipe data TypeScript untuk storyboard.
5. `src/storyboards/*.json` menyediakan data scene, audio, subtitle, dan
   metadata video.
6. `scripts/validate-storyboard.mjs` memeriksa struktur, durasi, urutan scene,
   props komponen, transition, dan batas waktu animasi sebelum render.

### Komponen visual

| File | Isi |
| --- | --- |
| `components.tsx` | Scene dasar seperti title, code, summary, key points, serta helper konversi waktu. |
| `GitScenes.tsx` | Scene khusus alur Git/GitHub: file yang berantakan, timeline commit, sinkronisasi cloud, dan ringkasan ikon. |
| `Icons.tsx` | Definisi `IconName`, komponen `Icon`, dan showcase ikon. |
| `Backdrop.tsx` | Background dan dekorasi untuk tema video v2. |
| `Kinetic.tsx` | Animasi subtitle kinetic pada tema v2. |
| `Transition.tsx` | Implementasi transisi antar-scene dan overlap frame. |
| `theme.ts` | Token warna, tipografi, ukuran, dan konfigurasi gerak. |

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
- `Scene.component` harus tersedia di registry `Composition.tsx`.
- `Scene.props` harus sesuai spesifikasi komponen pada validator.
- Total `startMs + durationMs` seluruh scene harus mengikuti durasi video.
- `audio.src` dibaca relatif terhadap `apps/remotion/public/`.

Komponen tambahan yang saat ini didukung validator:

| Komponen | Props utama |
| --- | --- |
| `FileChaos` | `files`, `cuesMs` |
| `CommitTimeline` | `labels`, `cuesMs`, `rewindMs`, `rewindTo`, label opsional |
| `CloudSync` | `uploadMs`, `teamMs`, `downloadMs`, `laptopMs` opsional, `cloudMs` opsional |
| `IconSummary` | `items`, `revealMs`, `headline`, `headlineMs` |

## Pemetaan aset audio

Audio sumber proyek disimpan di `storage/projects/`, sedangkan audio yang
dibaca Remotion harus tersedia di `apps/remotion/public/audio/`.

| Proyek | Sumber | File runtime | Nilai `audio.src` |
| --- | --- | --- | --- |
| `html-css-js` | `storage/projects/html-css-js/audio/voiceover-v1.wav` | `apps/remotion/public/audio/voiceover-v1.wav` | `audio/voiceover-v1.wav` |
| `git-github` | `storage/projects/git-github/audio/voiceover-v2.wav` | `apps/remotion/public/audio/voiceover-v2.wav` | `audio/voiceover-v2.wav` |

## Folder yang sengaja tidak dirinci

Folder/file berikut tidak dimasukkan ke tree utama karena bukan source yang
perlu dicatat satu per satu:

- `node_modules/`: dependency hasil `npm install`.
- `.git/`: metadata internal Git.
- `apps/remotion/out/`: video, gambar, dan hasil render sementara.
- `dist/`, `build/`, `coverage/`, dan cache tooling: artefak generated.
- File `.env` lokal: konfigurasi rahasia dan tidak boleh dicatat atau di-commit.
- Media besar tambahan pada `storage/projects/` dan `storage/library/`:
  tetap dikelola sebagai aset, bukan sebagai source code.

Placeholder `.gitkeep` tetap dicatat karena menjaga folder kosong agar tetap
tersedia di repository.
