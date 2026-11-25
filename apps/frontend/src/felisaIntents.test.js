// Pencocokan sapaan untuk Felisa (tanpa LLM). Fungsi murni, mudah dites.
// Alur: transkrip suara -> detectIntent() -> pickReply() -> putar kalimat dari manifest.

export const REPLY_IDS = [
  "reply_hello_1",
  "reply_hello_2",
  "reply_hello_3",
  "reply_hello_4",
  "reply_hello_5",
];

const GREETING_WORDS = new Set([
  "hai", "hay", "halo", "hallo", "helo", "hi", "hello", "hey", "hei", "heii", "yo", "oi",
  "assalamualaikum", "permisi",
]);

// Frasa dua kata: "selamat pagi", "good morning", dst.
const GREETING_PHRASES = [
  /\bselamat (pagi|siang|sore|malam)\b/,
  /\bgood (morning|afternoon|evening|day)\b/,
];

const NAME = "felisa";
// Salah dengar yang umum dari pengenalan suara untuk kata "Felisa".
const NAME_ALIASES = new Set([
  "felisa", "felissa", "felisha", "felicia", "felixa", "felesa", "phelisa", "velisa", "felisia", "felice", "felise",
]);

export function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const cur = [i];
    for (let j = 1; j <= n; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function isNameToken(token) {
  if (NAME_ALIASES.has(token)) return true;
  // Toleransi salah dengar: jarak edit <= 2 untuk kata sepanjang 5-8 huruf.
  return token.length >= 5 && token.length <= 8 && editDistance(token, NAME) <= 2;
}

/**
 * @returns {{intent: "greeting"|"unknown", heardName: boolean, matched: string[]}}
 */
export function detectIntent(transcript) {
  const text = normalize(transcript);
  if (!text) return { intent: "unknown", heardName: false, matched: [] };
  const tokens = text.split(" ");
  const matched = [];
  let heardName = false;

  for (const token of tokens) {
    if (GREETING_WORDS.has(token)) matched.push(token);
    else if (isNameToken(token)) {
      heardName = true;
      matched.push(token);
    }
  }
  for (const pattern of GREETING_PHRASES) {
    const hit = text.match(pattern);
    if (hit) matched.push(hit[0]);
  }

  const hasGreeting = matched.some((m) => !isNameToken(m) || GREETING_WORDS.has(m));
  // Memanggil nama saja ("Felisa") juga dianggap sapaan.
  const isGreeting = hasGreeting || heardName;
  return { intent: isGreeting ? "greeting" : "unknown", heardName, matched };
}

/**
 * Pilih id kalimat balasan secara acak, tidak mengulang kalimat terakhir.
 * rng: fungsi 0..1 (bisa diganti saat tes).
 */
export function pickReply(lastId = null, rng = Math.random, ids = REPLY_IDS) {
  const pool = ids.length > 1 ? ids.filter((id) => id !== lastId) : ids;
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index];
}

/**
 * Titik tukar sumber jawaban. Sekarang: templat tetap.
 * Nanti bisa diganti sumber lain (mis. LLM) tanpa mengubah UI, selama bentuk hasilnya sama:
 *   { kind: "line", lineId } -> putar file dari manifest
 *   { kind: "none" }         -> tidak ada jawaban bersuara
 */
export function getReply(intent, context = {}) {
  const { lastReplyId = null, rng = Math.random } = context;
  if (intent === "greeting") return { kind: "line", lineId: pickReply(lastReplyId, rng) };
  return { kind: "none" };
}