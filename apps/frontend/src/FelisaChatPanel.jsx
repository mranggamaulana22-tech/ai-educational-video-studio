import React, { useEffect, useRef, useState } from "react";

// Panel obrolan Felisa: riwayat bubble, kolom ketik, mic berdenyut mengikuti suara, status hidup.
// Murni tampilan: semua logika (kirim, dengar, putar ulang) datang lewat props dari FelisaRoom.

const reduceMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Typewriter({ text, animate }) {
  const [shown, setShown] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate || reduceMotion()) {
      setShown(text.length);
      return undefined;
    }
    setShown(0);
    const step = Math.max(1, Math.ceil(text.length / 36));
    const id = setInterval(() => {
      setShown((n) => {
        if (n + step >= text.length) {
          clearInterval(id);
          return text.length;
        }
        return n + step;
      });
    }, 24);
    return () => clearInterval(id);
  }, [text, animate]);
  return (
    <>
      {text.slice(0, shown)}
      {shown < text.length && <span className="fc-caret" aria-hidden="true" />}
    </>
  );
}

const fmtTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

export default function FelisaChatPanel({
  messages,
  thinking,
  listening,
  speaking,
  level = 0,
  lang = "id",
  userLabel = "Kamu",
  accent = "#22d3ee",
  micDisabled,
  onSend,
  onMicToggle,
  onReplay,
  onClear,
  onNewProject,
}) {
  const en = lang === "en";
  const t = (id, eng) => (en ? eng : id);
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);
  const now = Date.now();

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, thinking]);

  const state = listening ? "listening" : thinking ? "thinking" : speaking ? "speaking" : "standby";
  const stateLabel = {
    listening: t("MENDENGARKAN", "LISTENING"),
    thinking: t("BERPIKIR", "THINKING"),
    speaking: t("BERBICARA", "SPEAKING"),
    standby: "STANDBY",
  }[state];
  const stateColor = { listening: "#fb7185", thinking: "#fbbf24", speaking: accent, standby: "#64748b" }[state];

  const last = messages[messages.length - 1];
  const showChips = !thinking && !listening && (!last || last.role !== "user");
  const chips = [
    ...(onNewProject ? [{ label: en ? "＋ New project" : "＋ Proyek baru", run: onNewProject }] : []),
    ...(en ? ["Project status", "What should I work on?", "Help me study"] : ["Status proyek", "Apa yang harus kukerjakan?", "Bantu aku belajar"]).map((label) => ({
      label,
      run: () => onSend?.(label),
    })),
  ];

  const submit = (event) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft("");
    onSend?.(text);
  };

  const bars = [0.55, 0.9, 0.7, 1, 0.6];
  const orbScale = 1 + Math.min(1, level) * 0.35;

  return (
    <div className="fc-root flex h-[clamp(300px,calc(100vh-300px),560px)] flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
      <style>{`
        .fc-caret { display:inline-block; width:6px; height:1em; margin-left:2px; vertical-align:-2px; background:currentColor; animation: fcBlink .8s steps(2) infinite; }
        @keyframes fcBlink { 50% { opacity: 0; } }
        @keyframes fcDot { 0%, 80%, 100% { transform: translateY(0); opacity:.35 } 40% { transform: translateY(-4px); opacity:1 } }
        @keyframes fcBar { 0%, 100% { transform: scaleY(.35) } 50% { transform: scaleY(1) } }
        @keyframes fcRing { 0% { transform: scale(1); opacity:.55 } 100% { transform: scale(1.7); opacity:0 } }
        @keyframes fcIn { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform:none } }
        .fc-msg { animation: fcIn .22s ease-out both; }
        .fc-scroll::-webkit-scrollbar { width: 6px }
        .fc-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,.25); border-radius: 6px }
        @media (prefers-reduced-motion: reduce) { .fc-msg, .fc-ring, .fc-bar, .fc-dot { animation: none !important } }
      `}</style>

      {/* Log percakapan */}
      <div className="fc-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" role="log" aria-live="polite" aria-label={t("Percakapan dengan Felisa", "Conversation with Felisa")}>
        {messages.length === 0 && (
          <div className="fc-msg rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs leading-relaxed text-slate-300">
            <div className="mb-1 font-mono-tech text-[9px] uppercase tracking-[.14em]" style={{ color: accent }}>FELISA // STUDIO LEADER</div>
            {t(
              "Siap, Bos. Aku standby. Mau ngobrol, cek status, atau langsung mulai produksi? Ketik atau tekan mic.",
              "Ready, Boss. I'm on standby. Want to chat, check status, or start production? Type or hit the mic.",
            )}
          </div>
        )}

        {messages.map((m) => {
          if (m.role === "system") {
            return (
              <div key={m.id} className="fc-msg text-center font-mono-tech text-[10px] text-slate-500">
                {m.text}
              </div>
            );
          }
          if (m.role === "user") {
            return (
              <div key={m.id} className="fc-msg flex justify-end">
                <div className="max-w-[86%]">
                  <div className="mb-0.5 text-right font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">
                    {userLabel} · {fmtTime(m.ts)}
                  </div>
                  <div className="rounded-2xl rounded-tr-sm border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs leading-relaxed text-cyan-50">
                    {m.text}
                  </div>
                </div>
              </div>
            );
          }
          const fresh = m === last && now - (m.ts || 0) < 4000;
          return (
            <div key={m.id} className="fc-msg flex items-start gap-2">
              <span
                className="mt-4 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold"
                style={{ borderColor: `${accent}88`, background: `${accent}22`, color: accent, boxShadow: `0 0 10px ${accent}44` }}
              >
                F
              </span>
              <div className="min-w-0 max-w-[88%]">
                <div className="mb-0.5 flex items-center gap-1.5 font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">
                  <span style={{ color: accent }}>Felisa</span>
                  <span>· {fmtTime(m.ts)}</span>
                  {m.tag && (
                    <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1 text-amber-300">{m.tag}</span>
                  )}
                </div>
                <div
                  className="rounded-2xl rounded-tl-sm border-l-2 bg-slate-900/85 px-3 py-2 text-xs leading-relaxed text-slate-100"
                  style={{ borderLeftColor: accent, boxShadow: `inset 0 0 18px ${accent}10` }}
                >
                  <Typewriter text={m.text} animate={fresh} />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {(m.audioUrl || m.q) && (
                    <button
                      type="button"
                      onClick={() => onReplay?.(m)}
                      className="rounded-md border border-white/10 bg-slate-900/70 px-1.5 py-0.5 font-mono-tech text-[9px] text-slate-400 hover:border-cyan-300/40 hover:text-cyan-200"
                      title={m.audioUrl ? t("Putar ulang suara", "Replay voice") : t("Coba buat suaranya", "Try to generate voice")}
                    >
                      {m.audioUrl ? "▶ " + t("Dengar", "Play") : "🔊 " + t("Buat suara", "Make voice")}
                    </button>
                  )}
                  {m.hint && <span className="font-mono-tech text-[9px] text-amber-400/80">{m.hint}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {thinking && (
          <div className="fc-msg flex items-center gap-2 text-[10px] font-mono-tech text-amber-300/90">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="fc-dot h-1.5 w-1.5 rounded-full bg-amber-300" style={{ animation: `fcDot 1s ${i * 0.15}s infinite` }} />
              ))}
            </span>
            {t("Felisa berpikir…", "Felisa is thinking…")}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Saran cepat */}
      {showChips && (
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.run}
              className="shrink-0 rounded-full border border-white/12 bg-slate-900/70 px-2.5 py-1 font-mono-tech text-[10px] text-slate-300 hover:border-cyan-300/50 hover:text-cyan-100"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Strip status agen */}
      <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/80 px-3 py-1.5">
        <div className="flex items-center gap-2 font-mono-tech text-[9px] tracking-[.14em]" style={{ color: stateColor }}>
          <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
            {bars.map((b, i) => (
              <span
                key={i}
                className="fc-bar w-0.5 origin-bottom rounded-sm"
                style={{
                  height: "100%",
                  background: stateColor,
                  transform: state === "standby" ? "scaleY(.3)" : speaking ? `scaleY(${Math.max(0.25, Math.min(1, level * 1.4 * b + 0.2))})` : undefined,
                  animation: state === "standby" || speaking ? "none" : `fcBar ${0.7 + i * 0.1}s ${i * 0.08}s ease-in-out infinite`,
                }}
              />
            ))}
          </span>
          {stateLabel}
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={onClear} className="font-mono-tech text-[9px] text-slate-500 hover:text-slate-300">
            {t("Bersihkan", "Clear")}
          </button>
        )}
      </div>

      {/* Komposer */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 bg-slate-900/60 p-2.5">
        <button
          type="button"
          onClick={onMicToggle}
          disabled={micDisabled}
          aria-label="Tahan untuk bicara"
          title={listening ? t("Ketuk lagi untuk selesai", "Tap again to finish") : t("Ketuk untuk bicara (atau tahan spasi)", "Tap to talk (or hold space)")}
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border text-base disabled:opacity-40"
          style={{
            borderColor: listening ? "#fb7185" : `${accent}88`,
            background: listening ? "rgba(244,63,94,.18)" : `${accent}1f`,
            transform: `scale(${speaking ? orbScale : 1})`,
            transition: "transform 80ms linear",
            boxShadow: `0 0 ${listening ? 18 : 10}px ${listening ? "#fb718566" : accent + "55"}`,
          }}
        >
          {listening && (
            <span className="fc-ring pointer-events-none absolute inset-0 rounded-full border border-rose-400" style={{ animation: "fcRing 1.2s ease-out infinite" }} />
          )}
          <span aria-hidden="true">{listening ? "⏹" : "🎤"}</span>
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("Ketik pesan ke Felisa…", "Message Felisa…")}
          aria-label={t("Pesan untuk Felisa", "Message for Felisa")}
          maxLength={300}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
        />
        <button
          type="submit"
          disabled={!draft.trim() || thinking}
          className="shrink-0 rounded-lg bg-cyan-400 px-3 py-2 font-mono-tech text-[11px] font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-40"
        >
          {t("Kirim", "Send")}
        </button>
      </form>
    </div>
  );
}