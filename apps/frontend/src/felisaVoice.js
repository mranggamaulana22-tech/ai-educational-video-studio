import { resolveFelisaLine } from "./felisaLines.js";

let activeVoiceTimer = null;

export function speak(lineId, options = {}) {
  const text = options.text || resolveFelisaLine(lineId, options);
  if (typeof options.onText === "function") options.onText(text);
  if (typeof options.onSpeaking === "function") options.onSpeaking(true);

  if (activeVoiceTimer) clearTimeout(activeVoiceTimer);
  const duration = Math.max(1200, options.duration || 2400);
  activeVoiceTimer = setTimeout(() => {
    if (typeof options.onSpeaking === "function") options.onSpeaking(false);
    activeVoiceTimer = null;
  }, duration);

  return { text, duration, implemented: false };
}
