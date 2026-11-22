import { resolveFelisaLine, getTimePeriod } from "./felisaLines.js";

const MUTE_KEY = "felisaMuted";
const LANG_KEY = "felisaLang";
const VOICE_KEY = "felisaVoice";
const MANIFEST_URL = "/audio/felisa/manifest.json";
const GEMINI_VOICES = [
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede",
  "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel", "Algieba",
  "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar",
  "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
  "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
];

let manifestPromise = null;
let audioContext = null;
let analyser = null;
let activeAudio = null;
let activeSource = null;
let levelFrame = null;
let activeOptions = null;

function storageGet(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage dapat dibatasi pada browser tertentu.
  }
}

export function getFelisaLang() {
  const lang = storageGet(LANG_KEY, "id");
  return lang === "en" ? "en" : "id";
}

export function setFelisaLang(lang) {
  const value = lang === "en" ? "en" : "id";
  storageSet(LANG_KEY, value);
  return value;
}

export function getFelisaVoice() {
  const voice = storageGet(VOICE_KEY, "Leda");
  return GEMINI_VOICES.includes(voice) ? voice : "Leda";
}

export function setFelisaVoice(voice) {
  const value = GEMINI_VOICES.includes(voice) ? voice : "Leda";
  storageSet(VOICE_KEY, value);
  return value;
}

export function isFelisaMuted() {
  return storageGet(MUTE_KEY, "false") === "true";
}

export function setFelisaMuted(muted) {
  const value = Boolean(muted);
  storageSet(MUTE_KEY, value ? "true" : "false");
  if (value) stopSpeaking();
  return value;
}

async function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
  }
  return manifestPromise;
}

export async function getFelisaVoiceOptions() {
  const manifest = await loadManifest();
  return GEMINI_VOICES
    .map((voice) => {
      const previewFile = manifest?.voice_previews?.id?.[voice];
      if (!previewFile) return null;
      return {
        voice,
        label: voice,
        status: manifest?.voice_statuses?.id?.[voice] === "complete" ? "complete" : "preview_only",
        previewFile,
        format: manifest?.voice_formats?.id?.[voice] || "wav",
      };
    })
    .filter(Boolean);
}

function ensureWebAudio() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
  }
  return audioContext;
}

function finishSpeaking() {
  if (levelFrame !== null) {
    cancelAnimationFrame(levelFrame);
    levelFrame = null;
  }
  if (activeSource) {
    try {
      activeSource.disconnect();
    } catch {
      // Sumber sudah dilepas oleh browser.
    }
  }
  activeSource = null;
  activeAudio = null;
  if (typeof activeOptions?.onSpeaking === "function") activeOptions.onSpeaking(false);
  if (typeof activeOptions?.onLevel === "function") activeOptions.onLevel(0);
  activeOptions = null;
}

export function stopSpeaking() {
  if (activeAudio) {
    activeAudio.onended = null;
    activeAudio.onpause = null;
    activeAudio.pause();
  }
  finishSpeaking();
}

function variantKey(lineId, options) {
  if (typeof options.variant === "number") return options.variant === 2 ? "_v2" : "_v1";
  const seedText = `${lineId}:${options.name || ""}:${options.status || ""}:${options.errorCode || ""}`;
  let hash = 0;
  for (let i = 0; i < seedText.length; i += 1) hash = (hash * 31 + seedText.charCodeAt(i)) | 0;
  return Math.abs(hash) % 2 === 0 ? "_v1" : "_v2";
}

function findLineId(manifest, lineId, options) {
  if (lineId === "greeting") {
    const period = getTimePeriod(options.date || new Date());
    return `greeting_${period}`;
  }
  if (lineId === "explain") return "explain_status";
  if (lineId?.startsWith("status:")) {
    const status = lineId.slice(7);
    if (status === "failed" && options.errorCode) return `error_${options.errorCode}`;
    return `status_${status}${variantKey(lineId, options)}`;
  }
  if (lineId?.startsWith("error:")) return `error_${lineId.slice(6)}`;
  if (manifest?.lines?.[lineId]?.file) return lineId;
  return null;
}

function findManifestLine(manifest, lang, voice, resolvedLineId) {
  const mapped = manifest?.files?.[lang]?.[voice]?.[resolvedLineId];
  if (typeof mapped === "string") {
    return { file: mapped, text: manifest?.text?.[lang]?.[resolvedLineId] || "" };
  }
  if (resolvedLineId && manifest?.lines?.[resolvedLineId]?.file) {
    return manifest.lines[resolvedLineId];
  }
  return null;
}

function startLevelLoop() {
  if (!analyser) return;
  const values = new Uint8Array(analyser.frequencyBinCount);
  const update = () => {
    analyser.getByteFrequencyData(values);
    let sum = 0;
    for (let i = 0; i < values.length; i += 1) sum += values[i] * values[i];
    const rms = Math.sqrt(sum / values.length) / 255;
    const level = Math.max(0, Math.min(1, rms * 2.8));
    if (typeof activeOptions?.onLevel === "function") activeOptions.onLevel(level);
    levelFrame = requestAnimationFrame(update);
  };
  levelFrame = requestAnimationFrame(update);
}

async function playUrl(url, options) {
  stopSpeaking();
  if (isFelisaMuted()) {
    options.onSpeaking?.(false);
    options.onLevel?.(0);
    return false;
  }

  const context = ensureWebAudio();
  if (!context) {
    options.onSpeaking?.(false);
    options.onLevel?.(0);
    return false;
  }

  try {
    if (context.state === "suspended") await context.resume();
  } catch {
    options.onSpeaking?.(false);
    options.onLevel?.(0);
    return false;
  }

  activeOptions = options;
  const audio = new Audio(url);
  activeAudio = audio;
  audio.preload = "auto";

  try {
    activeSource = context.createMediaElementSource(audio);
    activeSource.connect(analyser);
    analyser.connect(context.destination);
  } catch {
    finishSpeaking();
    return false;
  }

  audio.onended = finishSpeaking;
  audio.onerror = finishSpeaking;

  try {
    const playPromise = audio.play();
    options.onSpeaking?.(true);
    startLevelLoop();
    if (playPromise?.catch) await playPromise.catch(() => finishSpeaking());
    return true;
  } catch {
    finishSpeaking();
    return false;
  }
}

export async function speak(lineId, options = {}) {
  const lang = options.lang === "en" ? "en" : getFelisaLang();
  const selectedVoice = options.voice || getFelisaVoice();
  const resolvedText = options.text || resolveFelisaLine(lineId, { ...options, lang });
  options.onText?.(resolvedText);

  if (isFelisaMuted()) {
    options.onSpeaking?.(false);
    options.onLevel?.(0);
    return { text: resolvedText, muted: true, implemented: false };
  }

  const manifest = await loadManifest();
  const status = manifest?.voice_statuses?.[lang]?.[selectedVoice];
  let voice = selectedVoice;
  if (status !== "complete") {
    const fallbackVoice = storageGet("felisaCompleteVoice", "");
    const fallbackStatus = manifest?.voice_statuses?.[lang]?.[fallbackVoice];
    voice = fallbackStatus === "complete"
      ? fallbackVoice
      : GEMINI_VOICES.find((candidate) => manifest?.voice_statuses?.[lang]?.[candidate] === "complete") || "";
  } else {
    storageSet("felisaCompleteVoice", selectedVoice);
  }
  if (!voice) {
    options.onSpeaking?.(false);
    options.onLevel?.(0);
    return { text: resolvedText, muted: false, implemented: false };
  }
  const resolvedLineId = findLineId(manifest, lineId, options);
  const line = findManifestLine(manifest, lang, voice, resolvedLineId);
  const text = line?.text || resolvedText;
  options.onText?.(text);
  if (!line?.file) {
    options.onSpeaking?.(false);
    options.onLevel?.(0);
    return { text, muted: false, implemented: false };
  }

  await playUrl(`/audio/felisa/${lang}/${voice}/${line.file}`, options);
  return { text, file: line.file, muted: false, implemented: true };
}

export async function previewVoice({ lang = getFelisaLang(), voice = getFelisaVoice(), onSpeaking, onLevel } = {}) {
  const selectedLang = lang === "en" ? "en" : "id";
  const selectedVoice = GEMINI_VOICES.includes(voice) ? voice : "Leda";
  const manifest = await loadManifest();
  const previewFile = manifest?.voice_previews?.id?.[selectedVoice]
    || manifest?.files?.id?.[selectedVoice]?.preview;
  if (!previewFile) {
    onSpeaking?.(false);
    onLevel?.(0);
    return false;
  }
  await playUrl(`/audio/felisa/id/${selectedVoice}/${previewFile}`, {
    onSpeaking,
    onLevel,
  });
}
