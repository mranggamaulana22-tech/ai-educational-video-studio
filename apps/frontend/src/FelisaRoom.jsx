import React, { useEffect, useMemo, useState } from "react";
import FelisaLayered from "./FelisaLayered.jsx";
import { api } from "./api.js";
import { AGENT_STAGES } from "./agentsConfig.js";
import { getGreeting, getStatusLine } from "./felisaLines.js";
import { speak } from "./felisaVoice.js";

const NAME_KEY = "felisaUserName";
const ROOM_KEY = "felisaRoomOpen";

function detectErrorCode(video) {
  if (!video?.stages) return null;
  for (const stage of Object.values(video.stages)) {
    const log = String(stage?.last_run?.log || "");
    if (/rate.?limit|429/i.test(log)) return "rate_limited";
    if (/quota|billing/i.test(log)) return "quota_exhausted";
    if (/invalid.{0,12}(json|output)|validation/i.test(log)) return "invalid_output";
    if (/interrupt|cancel/i.test(log)) return "interrupted";
  }
  return null;
}

export default function FelisaRoom({
  open,
  video,
  sleep,
  busy,
  onClose,
  onOpen,
  onAdvance,
  onApprove,
  onOpenWorkspace,
  onOpenStorage,
  onStatusUpdate,
  onInfo,
}) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  const [nameDraft, setNameDraft] = useState("");
  const [started, setStarted] = useState(() => Boolean(localStorage.getItem(NAME_KEY)));
  const [pulse, setPulse] = useState(0);
  const [showExplain, setShowExplain] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [felisaStatus, setFelisaStatus] = useState(null);
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    localStorage.setItem(ROOM_KEY, open ? "open" : "closed");
  }, [open]);

  useEffect(() => {
    if (!open || !video?.id) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const fresh = await api.video(video.id);
        if (active) onStatusUpdate?.(fresh);
      } catch {
        // Polling status akan mencoba lagi; pesan tidak menggantikan error UI utama.
      }
    };
    refresh();
    const timer = setInterval(refresh, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [open, video?.id, onStatusUpdate]);

  const status = useMemo(() => {
    if (video?.waiting_approval) return "waiting_approval";
    if (video?.stages) {
      const stages = Object.values(video.stages);
      if (stages.some((stage) => stage?.last_run?.status === "failed")) return "failed";
      if (stages.some((stage) => stage?.last_run && ["queued", "running"].includes(stage.last_run.status))) return "running";
      if (stages.some((stage) => stage?.status === "approved")) return "completed";
    }
    return "completed";
  }, [video]);

  const statusSignature = [
    status,
    video?.waiting_approval || "",
    Object.values(video?.stages || {})
      .map((stage) => `${stage?.last_run?.id || ""}:${stage?.last_run?.status || ""}:${stage?.status || ""}`)
      .join("|"),
  ].join(";");

  useEffect(() => {
    setPulse((value) => value + 1);
  }, [statusSignature]);

  const errorCode = detectErrorCode(video);
  const glowMode = status === "failed" ? "flicker" : status === "waiting_approval" ? "calm" : "normal";
  const message = getStatusLine(status, name, errorCode);
  const greeting = getGreeting(name);

  useEffect(() => {
    if (!started) return;
    const initialText = pulse <= 1 ? greeting : message;
    setDisplayedText(initialText);
  }, [started, pulse, greeting, message]);

  const podiumPalette = sleep
    ? { core: "#64748b", glow: "rgba(100,116,139,0.28)", label: "tidur" }
    : glowMode === "flicker"
      ? { core: "#fb7185", glow: "rgba(244,63,94,0.36)", label: "gagal" }
      : glowMode === "calm"
        ? { core: "#fbbf24", glow: "rgba(245,158,11,0.34)", label: "menunggu" }
        : { core: "#22d3ee", glow: "rgba(34,211,238,0.34)", label: "normal" };

  const start = (event) => {
    event.preventDefault();
    const cleanName = nameDraft.trim();
    if (!cleanName) return;
    localStorage.setItem(NAME_KEY, cleanName);
    setName(cleanName);
    setStarted(true);
    speak("greeting", {
      name: cleanName,
      onText: setDisplayedText,
      onSpeaking: setSpeaking,
      duration: 3200,
    });
  };

  const closeRoom = () => {
    localStorage.setItem(ROOM_KEY, "closed");
    onClose();
  };

  const openRoom = () => {
    localStorage.setItem(ROOM_KEY, "open");
    onOpen?.();
  };

  const handleContinue = () => {
    if (busy) return;
    onAdvance?.();
  };

  const handleApprove = () => {
    if (!video?.waiting_approval || busy) return;
    onApprove?.(video.waiting_approval);
  };

  const handleViewStage = () => {
    let index = -1;
    if (video?.waiting_approval) {
      index = AGENT_STAGES.findIndex((agent) => agent.approval === video.waiting_approval);
      if (index < 0) {
        index = AGENT_STAGES.findIndex((agent) => agent.key === video.waiting_approval);
      }
    }
    if (index < 0) {
      index = AGENT_STAGES.findIndex((agent) => {
        const stage = video?.stages?.[agent.key];
        return stage?.last_run && ["queued", "running"].includes(stage.last_run.status);
      });
    }
    if (index >= 0) onOpenWorkspace?.(index);
  };

  if (!open) {
    return (
      <button
        onClick={openRoom}
        className="fixed right-3 bottom-14 z-50 pointer-events-auto flex items-center gap-2 rounded-full border border-cyan-400/40 bg-slate-950/90 px-2 py-2 pr-3 shadow-lg backdrop-blur-md"
        title="Buka Ruang Felisa (F)"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full border border-cyan-300/50 bg-cyan-500/15 text-sm font-bold text-cyan-100">F</span>
        <span className="max-w-[220px] truncate text-left text-[11px] font-mono-tech text-cyan-100">
          {video?.waiting_approval ? `Menunggu: ${video.waiting_approval}` : status === "failed" ? "Ada tahap gagal" : status === "running" ? "Produksi berjalan" : "Studio siap"}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-slate-950/28 backdrop-blur-md">
      <div className="absolute inset-0 bg-slate-950/32" />

      <button
        onClick={closeRoom}
        className="fixed right-4 top-4 z-[70] rounded-lg border border-cyan-300/30 bg-slate-950/75 px-4 py-2.5 text-[11px] font-mono-tech font-bold text-cyan-100 hover:bg-slate-900"
      >
        Tutup Felisa → Lihat Studio Full [ESC]
      </button>

      <main className="relative z-10 grid h-full grid-cols-1 items-center gap-2 px-5 pb-5 pt-16 md:grid-cols-[minmax(320px,1fr)_minmax(300px,410px)]">
        <section className="flex h-full min-h-0 items-end justify-center md:items-center" aria-label="Potret Felisa">
          <div
            className="relative h-[min(72vh,600px)] w-full max-w-[456px]"
            style={{ background: "transparent", border: "none", boxShadow: "none" }}
          >
            <div
              aria-hidden="true"
              className="absolute left-1/2 z-0 origin-bottom"
              style={{
                bottom: "7%",
                width: "100%",
                height: "68%",
                transform: "translateX(-50%)",
                background: `linear-gradient(to top, ${podiumPalette.glow}, transparent 72%)`,
                clipPath: "polygon(44% 100%, 56% 100%, 88% 0, 12% 0)",
                opacity: sleep ? 0.2 : 0.78,
                filter: "blur(1px)",
              }}
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 460 180"
              className="absolute left-1/2 z-[1] w-[92%]"
              style={{ bottom: "-5%", transform: "translateX(-50%)", opacity: sleep ? 0.28 : 1 }}
            >
              <defs>
                <radialGradient id="felisaPodiumFill">
                  <stop offset="0%" stopColor={podiumPalette.core} stopOpacity="0.18" />
                  <stop offset="72%" stopColor={podiumPalette.core} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={podiumPalette.core} stopOpacity="0" />
                </radialGradient>
                <filter id="felisaPodiumGlow">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>
              <ellipse cx="230" cy="122" rx="170" ry="42" fill="url(#felisaPodiumFill)" />
              <ellipse cx="230" cy="122" rx="150" ry="34" fill="none" stroke={podiumPalette.core} strokeWidth="2" opacity="0.78" />
              <ellipse cx="230" cy="122" rx="116" ry="24" fill="none" stroke={podiumPalette.core} strokeWidth="1.5" opacity="0.58" />
              <ellipse cx="230" cy="122" rx="78" ry="14" fill="none" stroke={podiumPalette.core} strokeWidth="1.5" opacity="0.92" />
              <ellipse cx="230" cy="122" rx="150" ry="34" fill="none" stroke={podiumPalette.core} strokeWidth="7" opacity="0.12" filter="url(#felisaPodiumGlow)" />
              {[42, 58, 74, 90, 106].map((y) => (
                <line key={y} x1="88" x2="372" y1={y} y2={y} stroke={podiumPalette.core} strokeWidth="1" opacity="0.08" />
              ))}
            </svg>
            <div
              className="absolute inset-x-0 bottom-20 z-[2] h-[calc(100%-88px)]"
              style={{ animation: "felisaFloat 4.8s ease-in-out infinite" }}
            >
              <FelisaLayered
                speaking={speaking}
                level={speaking ? 0.55 : 0}
                pulse={pulse}
                sleep={sleep}
                glowMode={glowMode}
                mood={status === "failed" ? "concerned" : status === "waiting_approval" ? "thinking" : "happy"}
                fps={24}
                opacity={opacity}
                onStatus={setFelisaStatus}
                className="relative z-[2]"
              />
            </div>
            <style>{`
              @keyframes felisaFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
              }
              @media (prefers-reduced-motion: reduce) {
                .felisaFloat { animation: none !important; }
              }
            `}</style>
          </div>
        </section>

        <aside className="pointer-events-auto mb-12 rounded-2xl border border-cyan-400/20 bg-slate-950/88 p-5 text-slate-100 shadow-2xl backdrop-blur-xl md:mb-0">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono-tech uppercase tracking-widest text-cyan-300">Studio Leader</div>
              <h1 className="mt-1 font-heading text-xl font-bold">Felisa</h1>
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${status === "failed" ? "bg-rose-400" : status === "waiting_approval" ? "bg-amber-400" : "bg-cyan-400"} ${status === "running" ? "animate-pulse" : ""}`} />
          </div>

          {!started ? (
            <form onSubmit={start} className="space-y-3">
              <p className="text-sm leading-relaxed text-slate-200">Sebelum mulai, siapa nama kamu?</p>
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Nama"
                autoFocus
                className="w-full rounded-lg border border-cyan-400/25 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300"
              />
              <button
                type="submit"
                disabled={!nameDraft.trim()}
                className="w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-xs font-mono-tech font-bold text-slate-950 disabled:opacity-50"
              >
                Mulai
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm leading-relaxed">{showExplain ? `${message} ${errorCode ? "Saya sedang membandingkan masalah ini dengan templat penanganan tetap." : "Status ini berasal dari status tahapan backend yang telah dipetakan."}` : (displayedText || (pulse <= 1 ? greeting : message))}</p>
                {video?.title && (
                  <p className="mt-2 text-[10px] font-mono-tech text-cyan-300/75">{video.title}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleContinue}
                  disabled={busy}
                  className="rounded-lg border border-cyan-400/35 bg-cyan-500/12 px-3 py-2.5 text-[10px] font-mono-tech font-bold text-cyan-100 disabled:opacity-50"
                >
                  Lanjut
                </button>
                <button
                  onClick={closeRoom}
                  className="rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2.5 text-[10px] font-mono-tech text-slate-200"
                >
                  Lihat studio
                </button>
                <button
                  onClick={() => {
                    setShowExplain((value) => !value);
                    speak(errorCode ? `error:${errorCode}` : `status:${status}`, {
                      name,
                      errorCode,
                      text: showExplain ? message : `${message} Status ini berasal dari status tahapan backend yang telah dipetakan.`,
                      onText: setDisplayedText,
                      onSpeaking: setSpeaking,
                      duration: 3000,
                    });
                  }}
                  className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2.5 text-[10px] font-mono-tech text-violet-100"
                >
                  Jelaskan
                </button>
                <button
                  onClick={handleViewStage}
                  className="rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2.5 text-[10px] font-mono-tech text-slate-200"
                >
                  Buka tahap
                </button>
              </div>

              {video?.waiting_approval && (
                <button
                  onClick={handleApprove}
                  disabled={busy}
                  className="w-full rounded-lg border border-amber-400/35 bg-amber-500/15 px-3 py-2.5 text-[10px] font-mono-tech font-bold text-amber-100 disabled:opacity-50"
                >
                  Setujui {video.waiting_approval}
                </button>
              )}

              <div
                className="mt-1 rounded-xl border px-3 py-2.5"
                style={{
                  borderColor: `${podiumPalette.core}38`,
                  background: "linear-gradient(90deg, rgba(15,23,42,.86), rgba(15,23,42,.58))",
                  boxShadow: `inset 0 1px 0 ${podiumPalette.core}1f`,
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-[9px] font-mono-tech text-slate-400">
                  <span>RIG FELISA · {felisaStatus ? `${felisaStatus.activeCount}/${felisaStatus.totalCount} LAYER` : "20/20 LAYER"}</span>
                  {felisaStatus && <span>{felisaStatus.width}×{felisaStatus.height}px</span>}
                </div>
                <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenStorage?.()}
                  className="text-[10px] font-mono-tech text-violet-200 hover:text-violet-100"
                >
                  Buka Gudang
                </button>
                <label className="ml-auto flex items-center gap-2 text-[9px] font-mono-tech text-slate-400">
                  Transparansi
                  <input
                    type="range"
                    min="0.35"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(event) => setOpacity(Number(event.target.value))}
                    className="w-20 accent-cyan-400"
                  />
                </label>
                </div>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
