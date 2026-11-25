// Pembungkus SpeechRecognition Chrome untuk tekan-untuk-bicara. Tanpa dependency.
// Mikrofon hanya aktif saat start() dipanggil (bukan selalu mendengarkan).

export const LISTEN_LOCALES = { id: "id-ID", en: "en-US" };

export function getRecognitionClass(win = typeof window !== "undefined" ? window : undefined) {
  if (!win) return null;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function isListenSupported(win) {
  return Boolean(getRecognitionClass(win));
}

/**
 * Status yang dikirim ke onStatus:
 *  "unsupported" | "listening" | "heard" (dengan transcript) | "no_speech" | "denied" | "error" | "idle"
 */
export function createListener({ lang = "id", onStatus = () => {}, win } = {}) {
  const Recognition = getRecognitionClass(win);
  let recognition = null;
  let active = false;
  let gotResult = false;

  function start() {
    if (!Recognition) {
      onStatus({ status: "unsupported" });
      return false;
    }
    // Penekanan baru selalu memulai sesi baru: sesi lama (mungkin masih menutup) dibatalkan tanpa memicu status.
    if (recognition) {
      const old = recognition;
      old.onstart = old.onresult = old.onerror = old.onend = null;
      try {
        old.abort();
      } catch (_) {
        /* abaikan */
      }
      recognition = null;
      active = false;
    }
    gotResult = false;
    recognition = new Recognition();
    recognition.lang = LISTEN_LOCALES[lang] || LISTEN_LOCALES.id;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      active = true;
      onStatus({ status: "listening" });
    };
    recognition.onresult = (event) => {
      const result = event.results && event.results[event.results.length - 1];
      if (!result) return;
      const alternatives = [];
      for (let i = 0; i < result.length; i += 1) alternatives.push(result[i].transcript);
      gotResult = true;
      onStatus({ status: "heard", transcript: alternatives[0] || "", alternatives });
    };
    recognition.onerror = (event) => {
      const code = event && event.error;
      if (code === "no-speech") onStatus({ status: "no_speech" });
      else if (code === "not-allowed" || code === "service-not-allowed") onStatus({ status: "denied" });
      else if (code === "aborted") onStatus({ status: "idle" });
      else onStatus({ status: "error", code });
    };
    recognition.onend = () => {
      const wasActive = active;
      active = false;
      recognition = null;
      if (wasActive && !gotResult) onStatus({ status: "idle" });
    };

    try {
      recognition.start();
    } catch (error) {
      active = false;
      onStatus({ status: "error", code: String(error && error.name) });
      return false;
    }
    return true;
  }

  function stop() {
    if (recognition) {
      try {
        recognition.stop();
      } catch (_) {
        /* abaikan */
      }
    }
  }

  function setLang(next) {
    lang = next;
  }

  return { start, stop, setLang, get active() { return active; } };
}