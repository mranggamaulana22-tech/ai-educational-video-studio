# Katalog komponen scene

Warna: `teal`, `orange`, `violet`, `red`, `green`, `yellow`.
`cuesMs` (opsional di semua) = waktu muncul tiap bagian, ms sejak scene mulai. Kosong = muncul berurutan otomatis.
Area aman: teks pendek. Jangan melebihi batas jumlah item.

## Ikon (field `icon`)
laptop, code, gear, cloud, people, bug, check, lock, clock, bulb, rocket, book, server, database, chat, star, target, puzzle, folder, file, restaurant, arrow.
Ikon bergerak sendiri (melayang/bergoyang/berdenyut/berputar). Wajib dipakai semaksimal mungkin supaya video hidup.

## Scene umum (isi penuh dari JSON, dipakai Storyboard Agent)

### BigStatement
1-5 baris besar berwarna. props: `kicker?` (teks kecil di atas), `icon?`, `iconColor?`, `lines` [{text, color?}], `cuesMs?` [baris 1, 2, ...]

### CompareCards
Dua kartu berdampingan. props: `heading?`, `left` / `right` = {title, color?, icon?, items: 1-4 teks pendek}, `cuesMs?` [judul, kartu kiri, kartu kanan]

### FlowSteps
Langkah berurutan dengan panah. props: `heading?`, `steps` [{label, icon?, color?}] 2-5, `cuesMs?` [judul, langkah 1, ...]

### CardList
Daftar poin bernomor. props: `heading?`, `items` [{text, icon?, color?}] 1-5, `cuesMs?` [judul, poin 1, ...]

### CtaCard
Penutup/ajakan. props: `title`, `subtitle?`, `button?`, `color?`, `icon?`, `cuesMs?` [judul, subjudul, tombol]

### IconHero
Satu ikon besar bergerak + judul. props: `icon`, `title`, `subtitle?`, `color?`, `motion?` (float|wiggle|pulse|spin|none), `cuesMs?` [ikon, judul, subjudul]

### IconGrid
2-4 ikon besar dengan label. props: `heading?`, `items` [{icon, label, color?}] 2-4, `cuesMs?` [judul, item 1, ...]

## Scene khusus (topik tertentu, teks bawaan; jangan dipakai video baru kecuali sama topiknya)
HookScene (props line1, line2, labelA, labelB), JobScene, RestaurantScene, DeveloperScene, CompareScene, VennScene, StrikeScene, LaptopScene, SdlcScene, CtaScene.

## Scene tema lama (gelap, akan dibuat ulang)
TitleReveal, CodeScene, SummaryCards, KeyPoints, IconShowcase, FileChaos, CommitTimeline, CloudSync, IconSummary.

## Transisi (per scene)
none, fade, slide, zoom, wipe.

## Subtitle
Penanda warna kata: `{{teal:teks}}`, `{{orange:teks}}`, `{{violet:teks}}`, `{{red:teks}}`.
Daftar ini wajib sama dengan COMPONENTS di scripts/validate-storyboard.mjs.
