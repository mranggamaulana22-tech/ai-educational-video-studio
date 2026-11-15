/* global process, console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

const file = process.argv[2];
if (!file) {
  console.error("Pemakaian: node scripts/validate-storyboard.mjs <file-storyboard.json>");
  process.exit(2);
}

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const KNOWN_VERSIONS = ["1.1"];
const MAX_DURATION_MS = 90000;

// Daftar komponen yang terdaftar beserta props-nya.
// Tanda "?" artinya boleh dikosongkan.
const COMPONENTS = {
  TitleReveal: { title: "string", subtitle: "string?", delayMs: "number?" },
  CodeScene: {
    badge: "string",
    caption: "string",
    accent: "string",
    filename: "string",
    code: "string[]",
    preview: ["plain", "styled", "lamp"],
    typeStartMs: "number?",
    typeMs: "number?",
    lampOnMs: "number?",
  },
  SummaryCards: {
    cards: "cards",
    revealMs: "number[]",
    headline: "string",
    headlineMs: "number",
  },
  KeyPoints: {
    badge: "string",
    accent: "string",
    heading: "string",
    points: "points",
    revealMs: "number[]",
  },
  IconShowcase: {
    names: "string[]?",
  },
  FileChaos: { files: "string[]", cuesMs: "number[]" },
  CommitTimeline: {
    labels: "string[]",
    cuesMs: "number[]",
    rewindMs: "number",
    rewindTo: "number",
    rewindLabel: "string?",
    headLabel: "string?",
  },
  CloudSync: {
    uploadMs: "number[]",
    teamMs: "number[]",
    downloadMs: "number[]",
    laptopMs: "number?",
    cloudMs: "number?",
  },
  IconSummary: {
    items: "iconItems",
    revealMs: "number[]",
    headline: "string",
    headlineMs: "number",
  },
};

const ICON_NAMES = ["file", "folder", "cloud", "laptop", "commit", "branch", "check", "clock", "lock", "people", "code", "gear", "arrow", "bug"];
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isStr = (v) => typeof v === "string" && v.trim().length > 0;

function checkValue(value, spec, where) {
  let optional = false;
  if (typeof spec === "string" && spec.endsWith("?")) {
    optional = true;
    spec = spec.slice(0, -1);
  }
  if (value === undefined) {
    if (!optional) err(`${where}: wajib diisi tetapi tidak ada`);
    return;
  }
  if (Array.isArray(spec)) {
    if (!spec.includes(value)) {
      err(`${where}: nilai "${value}" tidak dikenal. Pilihan: ${spec.join(", ")}`);
    }
    return;
  }
  switch (spec) {
    case "string":
      if (!isStr(value)) err(`${where}: harus berupa teks yang tidak kosong`);
      break;
    case "number":
      if (!isNum(value)) err(`${where}: harus berupa angka`);
      break;
    case "string[]":
      if (!Array.isArray(value) || value.length === 0 || !value.every(isStr)) {
        err(`${where}: harus berupa daftar teks (minimal 1 baris, tidak boleh kosong)`);
      }
      break;
    case "number[]":
      if (!Array.isArray(value) || !value.every(isNum)) {
        err(`${where}: harus berupa daftar angka`);
      }
      break;
    case "iconItems":
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        !value.every((it) => it && isStr(it.label) && isStr(it.text) && isStr(it.color) && ICON_NAMES.includes(it.icon))
      ) {
        err(`${where}: setiap item harus punya icon (${ICON_NAMES.join(", ")}), label, text, dan color`);
      }
      break;
    case "points":
      if (!Array.isArray(value) || value.length === 0 || !value.every((p) => p && isStr(p.text))) {
        err(`${where}: setiap poin harus punya text`);
      }
      break;
    case "cards":
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        !value.every((c) => c && isStr(c.label) && isStr(c.text) && isStr(c.color))
      ) {
        err(`${where}: setiap kartu harus punya label, text, dan color`);
      }
      break;
  }
}

let sb;
try {
  const raw = fs.readFileSync(path.resolve(file), "utf8").replace(/^\uFEFF/, "");
  sb = JSON.parse(raw);
} catch (e) {
  console.error(`[GAGAL] Tidak bisa membaca JSON: ${e.message}`);
  process.exit(1);
}

// 1. Versi dan info video
if (!KNOWN_VERSIONS.includes(sb.schemaVersion)) {
  err(`schemaVersion "${sb.schemaVersion}" tidak dikenal. Yang didukung: ${KNOWN_VERSIONS.join(", ")}`);
}
const video = sb.video ?? {};
if (!isNum(video.width) || !isNum(video.height) || video.width <= 0 || video.height <= 0) {
  err("video.width dan video.height harus angka positif");
}
if (!isNum(video.fps) || video.fps <= 0) err("video.fps harus angka positif");
if (!isNum(video.durationMs) || video.durationMs <= 0) {
  err("video.durationMs harus angka positif");
} else if (video.durationMs > MAX_DURATION_MS) {
  err(`Durasi video ${video.durationMs} ms melebihi batas ${MAX_DURATION_MS} ms (90 detik)`);
}

// 2. Audio
if (!isStr(sb.audio?.src)) {
  err("audio.src wajib diisi");
} else if (!fs.existsSync(path.join(projectRoot, "public", sb.audio.src))) {
  err(`File audio tidak ditemukan: public/${sb.audio.src}`);
}
if (isNum(sb.audio?.durationMs) && isNum(video.durationMs)) {
  if (Math.abs(sb.audio.durationMs - video.durationMs) > 300) {
    warn(`Durasi audio (${sb.audio.durationMs} ms) berbeda dari durasi video (${video.durationMs} ms)`);
  }
}

// 3. Scene
const scenes = Array.isArray(sb.scenes) ? sb.scenes : [];
if (scenes.length === 0) err("scenes: harus ada minimal satu scene");

const seenScene = new Set();
let expectedStart = 0;
scenes.forEach((s, i) => {
  const w = `Scene #${i + 1} (${s.id ?? "tanpa id"})`;

  if (!isStr(s.id)) err(`${w}: id wajib diisi`);
  else if (seenScene.has(s.id)) err(`${w}: id "${s.id}" dipakai dua kali`);
  else seenScene.add(s.id);

  if (!isNum(s.startMs) || s.startMs < 0) err(`${w}: startMs harus angka >= 0`);
  if (!isNum(s.durationMs) || s.durationMs <= 0) err(`${w}: durationMs harus angka > 0`);
  if (s.transition !== undefined && !["none", "fade", "slide", "zoom", "wipe"].includes(s.transition)) {
    err(`${w}: transition "${s.transition}" tidak dikenal. Pilihan: none, fade, slide, zoom, wipe`);
  }

  if (isNum(s.startMs) && isNum(s.durationMs)) {
    if (s.startMs !== expectedStart) {
      const d = s.startMs - expectedStart;
      err(
        d > 0
          ? `${w}: ada celah kosong ${d} ms sebelum scene ini (seharusnya mulai di ${expectedStart} ms)`
          : `${w}: tumpang tindih ${-d} ms dengan scene sebelumnya (seharusnya mulai di ${expectedStart} ms)`,
      );
    }
    expectedStart = s.startMs + s.durationMs;
  }

  const spec = COMPONENTS[s.component];
  if (!spec) {
    err(`${w}: komponen "${s.component}" belum terdaftar. Yang tersedia: ${Object.keys(COMPONENTS).join(", ")}`);
    return;
  }
  const props = s.props ?? {};
  for (const [key, type] of Object.entries(spec)) {
    checkValue(props[key], type, `${w}, props.${key}`);
  }
  for (const key of Object.keys(props)) {
    if (!(key in spec)) warn(`${w}: props.${key} tidak dikenal oleh ${s.component} dan akan diabaikan`);
  }

  if (s.component === "CodeScene") {
    if (props.preview === "lamp") {
      if (!isNum(props.lampOnMs)) err(`${w}: preview "lamp" membutuhkan lampOnMs`);
      else if (props.lampOnMs >= s.durationMs) {
        err(`${w}: lampOnMs (${props.lampOnMs}) melewati durasi scene (${s.durationMs})`);
      }
    }
    if (isNum(props.typeMs) && isNum(s.durationMs)) {
      const start = isNum(props.typeStartMs) ? props.typeStartMs : 400;
      if (start + props.typeMs > s.durationMs) {
        warn(`${w}: animasi mengetik baru selesai setelah scene berakhir`);
      }
    }
  }
  if (s.component === "KeyPoints") {
    if (
      Array.isArray(props.points) &&
      Array.isArray(props.revealMs) &&
      props.points.length !== props.revealMs.length
    ) {
      err(`${w}: jumlah revealMs (${props.revealMs.length}) harus sama dengan jumlah points (${props.points.length})`);
    }
    if (
      Array.isArray(props.revealMs) &&
      props.revealMs.some((t) => isNum(t) && isNum(s.durationMs) && t >= s.durationMs)
    ) {
      err(`${w}: ada waktu kemunculan yang melewati durasi scene (${s.durationMs} ms)`);
    }
  }
  if (["FileChaos", "CommitTimeline", "CloudSync"].includes(s.component)) {
    const times = [];
    for (const k of ["cuesMs", "uploadMs", "teamMs", "downloadMs"]) {
      if (Array.isArray(props[k])) times.push(...props[k]);
    }
    for (const k of ["rewindMs", "laptopMs", "cloudMs"]) {
      if (isNum(props[k])) times.push(props[k]);
    }
    if (times.some((t) => isNum(t) && isNum(s.durationMs) && t >= s.durationMs)) {
      err(`${w}: ada waktu kemunculan yang melewati durasi scene (${s.durationMs} ms)`);
    }
  }
  if (s.component === "FileChaos" && Array.isArray(props.files) && Array.isArray(props.cuesMs)) {
    if (props.files.length !== props.cuesMs.length) {
      err(`${w}: jumlah cuesMs (${props.cuesMs.length}) harus sama dengan jumlah files (${props.files.length})`);
    }
  }
  if (s.component === "CommitTimeline" && Array.isArray(props.labels) && Array.isArray(props.cuesMs)) {
    if (props.labels.length !== props.cuesMs.length) {
      err(`${w}: jumlah cuesMs (${props.cuesMs.length}) harus sama dengan jumlah labels (${props.labels.length})`);
    }
    if (isNum(props.rewindTo) && (props.rewindTo < 0 || props.rewindTo >= props.labels.length)) {
      err(`${w}: rewindTo harus antara 0 dan ${props.labels.length - 1}`);
    }
  }
  if (s.component === "IconSummary") {
    if (Array.isArray(props.items) && Array.isArray(props.revealMs) && props.items.length !== props.revealMs.length) {
      err(`${w}: jumlah revealMs (${props.revealMs.length}) harus sama dengan jumlah items (${props.items.length})`);
    }
    const times = [...(Array.isArray(props.revealMs) ? props.revealMs : []), props.headlineMs];
    if (times.some((t) => isNum(t) && isNum(s.durationMs) && t >= s.durationMs)) {
      err(`${w}: ada waktu kemunculan yang melewati durasi scene (${s.durationMs} ms)`);
    }
  }
  if (s.component === "SummaryCards") {
    if (
      Array.isArray(props.cards) &&
      Array.isArray(props.revealMs) &&
      props.cards.length !== props.revealMs.length
    ) {
      err(`${w}: jumlah revealMs (${props.revealMs.length}) harus sama dengan jumlah cards (${props.cards.length})`);
    }
    const times = [...(Array.isArray(props.revealMs) ? props.revealMs : []), props.headlineMs];
    if (times.some((t) => isNum(t) && isNum(s.durationMs) && t >= s.durationMs)) {
      err(`${w}: ada waktu kemunculan yang melewati durasi scene (${s.durationMs} ms)`);
    }
  }
});

if (scenes.length > 0 && isNum(video.durationMs) && Math.abs(expectedStart - video.durationMs) > 50) {
  err(`Total durasi scene (${expectedStart} ms) tidak sama dengan durasi video (${video.durationMs} ms)`);
}

// 4. Subtitle
const subs = Array.isArray(sb.subtitles) ? sb.subtitles : [];
const seenSub = new Set();
let prevEnd = 0;
subs.forEach((s, i) => {
  const w = `Subtitle #${i + 1} (${s.id ?? "tanpa id"})`;
  if (!isStr(s.id)) err(`${w}: id wajib diisi`);
  else if (seenSub.has(s.id)) err(`${w}: id "${s.id}" dipakai dua kali`);
  else seenSub.add(s.id);

  if (!isStr(s.text)) err(`${w}: teks tidak boleh kosong`);
  if (!isNum(s.startMs) || !isNum(s.endMs)) {
    err(`${w}: startMs dan endMs harus angka`);
    return;
  }
  if (s.endMs <= s.startMs) err(`${w}: endMs harus lebih besar dari startMs`);
  if (s.startMs < 0 || (isNum(video.durationMs) && s.endMs > video.durationMs)) {
    err(`${w}: berada di luar durasi video`);
  }
  if (s.startMs < prevEnd) err(`${w}: tumpang tindih ${prevEnd - s.startMs} ms dengan subtitle sebelumnya`);
  prevEnd = s.endMs;
});

// Laporan
for (const m of warnings) console.log(`[PERHATIAN] ${m}`);
for (const m of errors) console.log(`[SALAH] ${m}`);
if (errors.length === 0) {
  console.log(`[OK] Storyboard valid: ${scenes.length} scene, ${subs.length} subtitle, ${warnings.length} perhatian.`);
  process.exit(0);
} else {
  console.log(`\n${errors.length} kesalahan ditemukan. Render sebaiknya jangan dijalankan dulu.`);
  process.exit(1);
}