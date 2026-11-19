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

const KNOWN_VERSIONS = ["1.1", "1.3"];
const DEFAULT_COMPONENT_VERSION = "1.0.0";
const SUPPORTED_COMPONENT_VERSIONS = ["1.0.0"];
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
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
  // Scene gaya fun (semua props opsional; cuesMs = waktu muncul relatif awal scene).
  HookScene: {
    line1: "string?",
    line2: "string?",
    labelA: "string?",
    labelB: "string?",
    cuesMs: "number[]?",
  },
  JobScene: { label: "string?", cuesMs: "number[]?" },
  RestaurantScene: { cuesMs: "number[]?" },
  DeveloperScene: { cuesMs: "number[]?" },
  CompareScene: { cuesMs: "number[]?" },
  VennScene: { cuesMs: "number[]?" },
  StrikeScene: { cuesMs: "number[]?" },
  LaptopScene: { cuesMs: "number[]?" },
  SdlcScene: { cuesMs: "number[]?" },
  CtaScene: { cuesMs: "number[]?" },
  // Scene umum (isi penuh dari JSON). Lihat docs/COMPONENTS.md.
  BigStatement: { kicker: "string?", icon: "funIcon?", iconColor: "string?", lines: "textColor", cuesMs: "number[]?" },
  CompareCards: { heading: "string?", left: "side", right: "side", cuesMs: "number[]?" },
  FlowSteps: { heading: "string?", steps: "labelColor", cuesMs: "number[]?" },
  CardList: { heading: "string?", items: "textColor", cuesMs: "number[]?" },
  CtaCard: { title: "string", subtitle: "string?", button: "string?", color: "string?", icon: "funIcon?", cuesMs: "number[]?" },
  IconHero: { icon: "funIcon", title: "string", subtitle: "string?", color: "string?", motion: "motion?", cuesMs: "number[]?" },
  IconGrid: { heading: "string?", items: "iconLabel", cuesMs: "number[]?" },
  DiagramScene: { heading: "string?", layout: "diagramLayout?", nodes: "diagramNodes", edges: "diagramEdges?", cuesMs: "number[]?" },
};

const GENERIC_SCENES = ["BigStatement", "CompareCards", "FlowSteps", "CardList", "CtaCard", "IconHero", "IconGrid", "DiagramScene"];
const FUN_ICONS = ["laptop", "code", "gear", "cloud", "people", "bug", "check", "lock", "clock", "bulb", "rocket", "book", "server", "database", "chat", "star", "target", "puzzle", "folder", "file", "restaurant", "arrow"];
const okIcon = (i) => i === undefined || FUN_ICONS.includes(i);
const COLOR_NAMES = ["teal", "orange", "violet", "red", "green", "yellow"];
const okColor = (c) => c === undefined || COLOR_NAMES.includes(c);

const FUN_SCENES = [
  "HookScene",
  "JobScene",
  "RestaurantScene",
  "DeveloperScene",
  "CompareScene",
  "VennScene",
  "StrikeScene",
  "LaptopScene",
  "SdlcScene",
  "CtaScene",
];
const SUBTITLE_COLORS = ["teal", "orange", "violet", "red"];
const MAX_SCENE_MS = 8000; // DL-8: scene lebih dari 8 detik wajib dipecah (error)

const ICON_NAMES = ["file", "folder", "cloud", "laptop", "commit", "branch", "check", "clock", "lock", "people", "code", "gear", "arrow", "bug"];
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// Hitung kata subtitle dengan aturan yang sama seperti pemutar: {{warna:dua kata}} dihitung dua kata.
function countWords(text) {
  let n = 0;
  for (const m of text.matchAll(/\{\{(\w+):([^}]+)\}\}|\S+/g)) {
    n += m[1] ? m[2].split(/\s+/).filter(Boolean).length : 1;
  }
  return n;
}
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
    case "funIcon":
      if (!FUN_ICONS.includes(value)) err(`${where}: ikon "${value}" tidak dikenal. Pilihan: ${FUN_ICONS.join(", ")}`);
      break;
    case "motion":
      if (!["float", "wiggle", "pulse", "spin", "none"].includes(value)) err(`${where}: motion harus float, wiggle, pulse, spin, atau none`);
      break;
    case "diagramLayout":
      if (!["column", "row", "grid"].includes(value)) {
        err(`${where}: layout harus column, row, atau grid`);
      }
      break;
    case "iconLabel":
      if (!Array.isArray(value) || value.length < 2 || value.length > 4 || !value.every((x) => x && isStr(x.label) && FUN_ICONS.includes(x.icon) && okColor(x.color))) {
        err(`${where}: 2-4 item, tiap item punya icon (${FUN_ICONS.join(", ")}), label, dan color opsional`);
      }
      break;
    case "textColor":
      if (!Array.isArray(value) || value.length === 0 || value.length > 5 || !value.every((x) => x && isStr(x.text) && okColor(x.color) && okIcon(x.icon))) {
        err(`${where}: 1-5 item, tiap item punya text dan color (opsional: ${COLOR_NAMES.join(", ")})`);
      }
      break;
    case "labelColor":
      if (!Array.isArray(value) || value.length < 2 || value.length > 5 || !value.every((x) => x && isStr(x.label) && okColor(x.color) && okIcon(x.icon))) {
        err(`${where}: 2-5 langkah, tiap langkah punya label dan color (opsional: ${COLOR_NAMES.join(", ")})`);
      }
      break;
    case "diagramNodes":
      if (
        !Array.isArray(value) ||
        value.length < 2 ||
        value.length > 5 ||
        !value.every(
          (n) =>
            n &&
            isStr(n.id) &&
            isStr(n.label) &&
            (n.sublabel === undefined || isStr(n.sublabel)) &&
            okIcon(n.icon) &&
            okColor(n.color),
        )
      ) {
        err(`${where}: 2-5 node, tiap node wajib punya id, label, serta sublabel/icon/color opsional`);
      }
      break;
    case "diagramEdges":
      if (
        !Array.isArray(value) ||
        !value.every((e) => e && isStr(e.from) && isStr(e.to) && (e.label === undefined || isStr(e.label)))
      ) {
        err(`${where}: setiap panah (edge) wajib punya from, to, dan label opsional`);
      }
      break;
    case "side":
      if (!value || !isStr(value.title) || !okColor(value.color) || !okIcon(value.icon) || !Array.isArray(value.items) || value.items.length === 0 || value.items.length > 4 || !value.items.every(isStr)) {
        err(`${where}: harus punya title, items (1-4 teks), dan color opsional (${COLOR_NAMES.join(", ")})`);
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

if (video.badge !== undefined && !(video.badge && isStr(video.badge.day) && isStr(video.badge.course))) {
  err("video.badge harus punya day dan course (teks tidak kosong)");
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
const resolvedIds = [];

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

  // Dukungan v1.3 (componentId + componentVersion) sekaligus kompatibilitas v1.1 (component)
  const compId = sb.schemaVersion === "1.3" ? s.componentId : (s.componentId ?? s.component);
  if (sb.schemaVersion === "1.3" && !isStr(s.componentId)) {
    err(`${w}: schemaVersion 1.3 mewajibkan "componentId"`);
  }
  const compVer = s.componentVersion ?? DEFAULT_COMPONENT_VERSION;
  if (sb.schemaVersion === "1.3" && !isStr(s.componentVersion)) {
    err(`${w}: schemaVersion 1.3 mewajibkan "componentVersion" (diisi sistem/resolver)`);
  } else if (!SEMVER_RE.test(compVer) || !SUPPORTED_COMPONENT_VERSIONS.includes(compVer)) {
    err(`${w}: componentVersion "${compVer}" tidak valid/tidak didukung (gunakan: ${SUPPORTED_COMPONENT_VERSIONS.join(", ")})`);
  }

  resolvedIds.push(compId);
  if (i >= 2 && compId && resolvedIds[i - 1] === compId && resolvedIds[i - 2] === compId) {
    warn(`${w}: komponen "${compId}" dipakai 3 kali berturut-turut; variasikan komponen agar tidak monoton`);
  }

  const spec = COMPONENTS[compId];
  if (!spec) {
    err(`${w}: komponen "${compId}" belum terdaftar. Yang tersedia: ${Object.keys(COMPONENTS).join(", ")}`);
    return;
  }
  const props = s.props ?? {};
  for (const [key, type] of Object.entries(spec)) {
    checkValue(props[key], type, `${w}, props.${key}`);
  }
  for (const key of Object.keys(props)) {
    if (!(key in spec)) warn(`${w}: props.${key} tidak dikenal oleh ${compId} dan akan diabaikan`);
  }

  if (compId === "DiagramScene" && Array.isArray(props.nodes)) {
    const nodeIds = new Set(props.nodes.map((n) => n?.id).filter(Boolean));
    if (nodeIds.size !== props.nodes.length) {
      err(`${w}: id pada DiagramScene.nodes harus unik`);
    }
    if (Array.isArray(props.edges)) {
      for (const edge of props.edges) {
        if (edge && (!nodeIds.has(edge.from) || !nodeIds.has(edge.to))) {
          err(`${w}: DiagramScene.edges (${edge.from} -> ${edge.to}) merujuk id node yang tidak ada`);
        }
      }
    }
  }

  if (compId === "CodeScene") {
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
  if (compId === "KeyPoints") {
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
  if ((FUN_SCENES.includes(compId) || GENERIC_SCENES.includes(compId)) && Array.isArray(props.cuesMs)) {
    if (props.cuesMs.some((t) => isNum(t) && isNum(s.durationMs) && t >= s.durationMs)) {
      err(`${w}: ada waktu kemunculan (cuesMs) yang melewati durasi scene (${s.durationMs} ms)`);
    }
  }
  if (isNum(s.durationMs) && s.durationMs > MAX_SCENE_MS) {
    err(`${w}: durasi ${s.durationMs} ms melebihi batas maksimal ${MAX_SCENE_MS} ms (8 detik); wajib dipecah jadi dua scene`);
  }
  if (["FileChaos", "CommitTimeline", "CloudSync"].includes(compId)) {
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
  if (compId === "FileChaos" && Array.isArray(props.files) && Array.isArray(props.cuesMs)) {
    if (props.files.length !== props.cuesMs.length) {
      err(`${w}: jumlah cuesMs (${props.cuesMs.length}) harus sama dengan jumlah files (${props.files.length})`);
    }
  }
  if (compId === "CommitTimeline" && Array.isArray(props.labels) && Array.isArray(props.cuesMs)) {
    if (props.labels.length !== props.cuesMs.length) {
      err(`${w}: jumlah cuesMs (${props.cuesMs.length}) harus sama dengan jumlah labels (${props.labels.length})`);
    }
    if (isNum(props.rewindTo) && (props.rewindTo < 0 || props.rewindTo >= props.labels.length)) {
      err(`${w}: rewindTo harus antara 0 dan ${props.labels.length - 1}`);
    }
  }
  if (compId === "IconSummary") {
    if (Array.isArray(props.items) && Array.isArray(props.revealMs) && props.items.length !== props.revealMs.length) {
      err(`${w}: jumlah revealMs (${props.revealMs.length}) harus sama dengan jumlah items (${props.items.length})`);
    }
    const times = [...(Array.isArray(props.revealMs) ? props.revealMs : []), props.headlineMs];
    if (times.some((t) => isNum(t) && isNum(s.durationMs) && t >= s.durationMs)) {
      err(`${w}: ada waktu kemunculan yang melewati durasi scene (${s.durationMs} ms)`);
    }
  }
  if (compId === "SummaryCards") {
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

if (scenes.length > 0 && isNum(video.durationMs) && Math.abs(expectedStart - video.durationMs) > 50){
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
  else {
    const marks = [...s.text.matchAll(/\{\{(\w+):[^}]+\}\}/g)];
    for (const m of marks) {
      if (!SUBTITLE_COLORS.includes(m[1])) {
        err(`${w}: warna "${m[1]}" tidak dikenal. Pilihan: ${SUBTITLE_COLORS.join(", ")}`);
      }
    }
    const rest = s.text.replace(/\{\{\w+:[^}]+\}\}/g, "");
    if (rest.includes("{{") || rest.includes("}}")) {
      err(`${w}: penanda warna rusak; bentuk yang benar {{warna:teks}}`);
    }
  }
  if (!isNum(s.startMs) || !isNum(s.endMs)) {
    err(`${w}: startMs dan endMs harus angka`);
    return;
  }
  if (s.endMs <= s.startMs) err(`${w}: endMs harus lebih besar dari startMs`);
  if (s.startMs < 0 || (isNum(video.durationMs) && s.endMs > video.durationMs)) {
    err(`${w}: berada di luar durasi video`);
  }
  if (s.startMs < prevEnd) err(`${w}: tumpang tindih ${prevEnd - s.startMs} ms dengan subtitle sebelumnya`);
  if (s.wordStartsMs !== undefined) {
    if (!Array.isArray(s.wordStartsMs) || !s.wordStartsMs.every(isNum)) {
      err(`${w}: wordStartsMs harus berupa daftar angka`);
    } else {
      const n = isStr(s.text) ? countWords(s.text) : 0;
      if (s.wordStartsMs.length !== n) {
        err(`${w}: jumlah wordStartsMs (${s.wordStartsMs.length}) harus sama dengan jumlah kata (${n})`);
      }
      if (s.wordStartsMs.some((t, k) => k > 0 && t < s.wordStartsMs[k - 1])) {
        err(`${w}: wordStartsMs harus naik terus (tidak boleh mundur)`);
      }
      if (s.wordStartsMs.some((t) => t < s.startMs || t > s.endMs)) {
        err(`${w}: ada waktu kata di luar rentang subtitle (${s.startMs}-${s.endMs} ms)`);
      }
    }
  }
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