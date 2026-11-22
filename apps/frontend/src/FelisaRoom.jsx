import React, { useEffect, useMemo, useState } from "react";
import FelisaLayered from "./FelisaLayered.jsx";
import { api } from "./api.js";
import { AGENT_STAGES } from "./agentsConfig.js";
import { getGreeting, getStatusLine } from "./felisaLines.js";
import {
  getFelisaLang,
  getFelisaVoice,
  getFelisaVoiceOptions,
  isFelisaMuted,
  previewVoice,
  setFelisaLang,
  setFelisaMuted,
  setFelisaVoice,
  speak,
  stopSpeaking,
} from "./felisaVoice.js";

const NAME_KEY = "felisaUserName";
const ROOM_KEY = "felisaRoomOpen";

const SHORT_STAGE_LABELS = {
  material: "Material",
  analysis: "Analysis",
  notes: "Notes",
  ideas: "Ideas",
  script: "Script",
  review: "Review",
  audio: "Audio",
  words: "Words",
  storyboard: "Storyboard",
  render: "Render",
};

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
}) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  const [nameDraft, setNameDraft] = useState("");
  const [started, setStarted] = useState(() => Boolean(localStorage.getItem(NAME_KEY)));
  const [pulse, setPulse] = useState(0);
  const [showExplain, setShowExplain] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [muted, setMuted] = useState(() => isFelisaMuted());
  const [felisaLang, setFelisaLangState] = useState(() => getFelisaLang());
  const [felisaVoice, setFelisaVoiceState] = useState(() => getFelisaVoice());
  const [felisaVoiceOptions, setFelisaVoiceOptions] = useState([]);
  const [felisaStatus, setFelisaStatus] = useState(null);
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let alive = true;
    getFelisaVoiceOptions()
      .then((options) => {
        if (alive) setFelisaVoiceOptions(options);
      })
      .catch(() => {
        if (alive) setFelisaVoiceOptions([]);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem(ROOM_KEY, open ? "open" : "closed");
  }, [open]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!open || !video?.id) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const fresh = await api.video(video.id);
        if (active) onStatusUpdate?.(fresh);
      } catch {
        // Polling status akan mencoba lagi
      }
    };
    refresh();
    const timer = setInterval(refresh, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [open, video?.id, onStatusUpdate]);

  const stageItems = useMemo(() => {
    return AGENT_STAGES.map((agent, index) => {
      const stage = video?.stages?.[agent.key] || {};
      const runStatus = stage?.last_run?.status || "";
      const isWaiting =
        Boolean(video?.waiting_approval) &&
        (video.waiting_approval === agent.approval || video.waiting_approval === agent.key);
      const isFailed = runStatus === "failed";
      const isRunning = ["queued", "running"].includes(runStatus);
      const isDone = stage?.status === "approved" || runStatus === "completed" || runStatus === "succeeded";

      let state = "idle";
      if (isFailed) state = "failed";
      else if (isWaiting) state = "waiting";
      else if (isRunning) state = "running";
      else if (isDone) state = "done";

      return {
        ...agent,
        index,
        shortName: SHORT_STAGE_LABELS[agent.key] || agent.label || agent.key,
        state,
        runStatus,
        log: stage?.last_run?.log || "",
      };
    });
  }, [video]);

  const status = useMemo(() => {
    if (video?.waiting_approval) return "waiting_approval";
    if (stageItems.some((s) => s.state === "failed")) return "failed";
    if (stageItems.some((s) => s.state === "running")) return "running";
    if (stageItems.some((s) => s.state === "done")) return "completed";
    return "completed";
  }, [video, stageItems]);

  const statusSignature = [
    status,
    video?.waiting_approval || "",
    stageItems.map((s) => `${s.key}:${s.state}`).join("|"),
  ].join(";");

  useEffect(() => {
    setPulse((value) => value + 1);
  }, [statusSignature]);

  const errorCode = detectErrorCode(video);
  const glowMode = status === "failed" ? "flicker" : status === "waiting_approval" ? "calm" : "normal";
  const message = getStatusLine(status, name, errorCode, felisaLang);
  const greeting = getGreeting(name, felisaLang);

  useEffect(() => {
    if (!started) return;
    setDisplayedText(pulse <= 1 ? greeting : message);
  }, [started, pulse, greeting, message]);

  const theme = sleep
    ? {
        accent: "#94a3b8",
        aura: "rgba(148,163,184,0.22)",
        badge: "border-slate-500/40 bg-slate-800/70 text-slate-300",
        cta: "bg-slate-300 text-slate-950 hover:bg-white",
      }
    : glowMode === "flicker"
      ? {
          accent: "#fb7185",
          aura: "rgba(244,63,94,0.34)",
          badge: "border-rose-400/45 bg-rose-950/70 text-rose-200",
          cta: "bg-rose-400 text-slate-950 hover:bg-rose-300",
        }
      : glowMode === "calm"
        ? {
            accent: "#fbbf24",
            aura: "rgba(245,158,11,0.32)",
            badge: "border-amber-400/45 bg-amber-950/70 text-amber-200",
            cta: "bg-amber-400 text-slate-950 hover:bg-amber-300",
          }
        : {
            accent: "#22d3ee",
            aura: "rgba(34,211,238,0.30)",
            badge: "border-cyan-400/45 bg-cyan-950/70 text-cyan-200",
            cta: "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
          };

  const attentionItems = useMemo(() => {
    const items = [];
    if (video?.waiting_approval) {
      const target = stageItems.find((s) => s.state === "waiting");
      items.push({
        id: `approval-${video.waiting_approval}`,
        type: "approval",
        title: `Persetujuan: ${target ? target.shortName : video.waiting_approval}`,
        detail: "Hasil tahap siap ditinjau sebelum lanjut.",
        actionLabel: "Tinjau",
        onAction: () => {
          if (target) onOpenWorkspace?.(target.index);
        },
        secondaryLabel: "Setujui",
        onSecondary: () => {
          if (!busy) onApprove?.(video.waiting_approval);
        },
      });
    }
    stageItems
      .filter((s) => s.state === "failed")
      .forEach((s) => {
        items.push({
          id: `failed-${s.key}`,
          type: "failed",
          title: `Tahap gagal: ${s.shortName}`,
          detail: errorCode ? `Kode: ${errorCode}` : "Periksa log tahap untuk mengulang.",
          actionLabel: "Buka Log",
          onAction: () => onOpenWorkspace?.(s.index),
        });
      });
    return items;
  }, [video?.waiting_approval, stageItems, errorCode, busy, onOpenWorkspace, onApprove]);

  const activeAgents = stageItems.filter((s) => s.state === "running" || s.state === "waiting");
  const doneCount = stageItems.filter((s) => s.state === "done").length;

  const briefing = useMemo(() => {
    const activeStage = stageItems.find((s) => s.state === "running");
    const waitingStage = stageItems.find((s) => s.state === "waiting");
    const failedStage = stageItems.find((s) => s.state === "failed");
    const nextStage = stageItems.find((s) => s.state === "idle");

    if (sleep) {
      return {
        headline: felisaLang === "en"
          ? "Power-saving mode is active during heavy processing."
          : "Mode hemat daya aktif saat proses berat.",
        bullets: [
          felisaLang === "en"
            ? `Current progress: ${doneCount}/${stageItems.length} stages complete.`
            : `Progres saat ini: ${doneCount}/${stageItems.length} tahap selesai.`,
          activeStage
            ? (felisaLang === "en"
              ? `${activeStage.shortName} is processing in the background.`
              : `${activeStage.shortName} sedang memproses di latar belakang.`)
            : (felisaLang === "en" ? "The 3D view is resting temporarily." : "Layar 3D diistirahatkan sementara."),
        ],
        primaryLabel: felisaLang === "en" ? "View Active Stage" : "Lihat Tahap Aktif",
        primaryAction: () => activeStage && onOpenWorkspace?.(activeStage.index),
      };
    }

    if (failedStage) {
      return {
        headline: felisaLang === "en"
          ? `An issue was detected in the ${failedStage.shortName} stage.`
          : `Hambatan terdeteksi di tahap ${failedStage.shortName}.`,
        bullets: [
          displayedText || message,
          felisaLang === "en"
            ? `Pipeline progress is paused at ${doneCount}/${stageItems.length} stages.`
            : `Progres pipeline tertahan di ${doneCount}/${stageItems.length} tahap.`,
        ],
        primaryLabel: felisaLang === "en" ? `Review ${failedStage.shortName}` : `Periksa ${failedStage.shortName}`,
        primaryAction: () => onOpenWorkspace?.(failedStage.index),
      };
    }

    if (waitingStage) {
      return {
        headline: felisaLang === "en"
          ? `Waiting for your decision on ${waitingStage.shortName}.`
          : `Menunggu keputusanmu untuk ${waitingStage.shortName}.`,
        bullets: [
          displayedText || message,
          `Selesai ${doneCount}/${stageItems.length} tahap · Tidak ada kuota terpakai saat menunggu.`,
        ],
        primaryLabel: felisaLang === "en" ? `Review ${waitingStage.shortName}` : `Tinjau Hasil ${waitingStage.shortName}`,
        primaryAction: () => onOpenWorkspace?.(waitingStage.index),
      };
    }

    if (activeStage) {
      return {
        headline: felisaLang === "en"
          ? `${activeStage.shortName} is working now.`
          : `${activeStage.shortName} sedang bekerja sekarang.`,
        bullets: [
          displayedText || message,
          `Tahap selesai: ${doneCount}/${stageItems.length}.`,
        ],
        primaryLabel: felisaLang === "en" ? `Monitor ${activeStage.shortName}` : `Pantau ${activeStage.shortName}`,
        primaryAction: () => onOpenWorkspace?.(activeStage.index),
      };
    }

    return {
      headline: pulse <= 1
        ? greeting
        : (felisaLang === "en" ? "The pipeline is ready for the next step." : "Pipeline siap untuk langkah berikutnya."),
      bullets: [
        pulse <= 1 ? message : (displayedText || message),
        nextStage
          ? `Tahap berikutnya: ${nextStage.shortName} (${doneCount}/${stageItems.length} selesai).`
          : `Seluruh ${stageItems.length} tahap telah selesai.`,
      ],
      primaryLabel: nextStage ? `Jalankan ${nextStage.shortName}` : "Lihat Hasil Akhir",
      primaryAction: () => {
        if (busy) return;
        if (nextStage) onAdvance?.();
        else onOpenWorkspace?.(stageItems.length - 1);
      },
    };
  }, [sleep, stageItems, doneCount, displayedText, message, pulse, greeting, felisaLang, busy, onOpenWorkspace, onAdvance]);

  const start = (event) => {
    event.preventDefault();
    const cleanName = nameDraft.trim();
    if (!cleanName) return;
    localStorage.setItem(NAME_KEY, cleanName);
    setName(cleanName);
    setStarted(true);
    speak("greeting", {
      name: cleanName,
      lang: felisaLang,
      voice: felisaVoice,
      onText: setDisplayedText,
      onSpeaking: setSpeaking,
      onLevel: setAudioLevel,
      duration: 3200,
    });
  };

  const replayBriefing = () => {
    const lineOptions = {
      name,
      errorCode,
      lang: felisaLang,
      voice: felisaVoice,
      text: displayedText,
      onText: setDisplayedText,
      onSpeaking: setSpeaking,
      onLevel: setAudioLevel,
    };

    if (errorCode) {
      speak(`error:${errorCode}`, lineOptions);
    } else if (pulse <= 1) {
      speak("greeting", lineOptions);
    } else {
      speak(`status:${status}`, lineOptions);
    }
  };

  const toggleMute = () => {
    const nextMuted = setFelisaMuted(!muted);
    setMuted(nextMuted);
    if (nextMuted) setAudioLevel(0);
  };

  const closeRoom = () => {
    stopSpeaking();
    setSpeaking(false);
    setAudioLevel(0);
    localStorage.setItem(ROOM_KEY, "closed");
    onClose();
  };

  const openRoom = () => {
    localStorage.setItem(ROOM_KEY, "open");
    onOpen?.();
  };

  if (!open) {
    return (
      <button
        onClick={openRoom}
        className="fixed right-3 bottom-14 z-50 pointer-events-auto flex items-center gap-2.5 rounded-full border border-cyan-400/40 bg-slate-950/90 px-2.5 py-2 pr-3.5 shadow-lg backdrop-blur-md hover:border-cyan-300"
        title="Buka Ruang Felisa (F)"
      >
        <span
          className="grid h-8 w-8 place-items-center rounded-full border text-xs font-bold"
          style={{ borderColor: `${theme.accent}88`, background: `${theme.accent}22`, color: theme.accent }}
        >
          F
        </span>
        <span className="max-w-[230px] truncate text-left text-[11px] font-mono-tech text-slate-100">
          {video?.waiting_approval
            ? `Menunggu: ${video.waiting_approval}`
            : status === "failed"
              ? "Perlu perhatian: tahap gagal"
              : status === "running"
                ? "Produksi sedang berjalan"
                : `Felisa siap (${doneCount}/${stageItems.length})`}
        </span>
      </button>
    );
  }

  return (
    <div className="leader-room-root fixed inset-0 z-[60] flex flex-col overflow-hidden bg-slate-950/35 backdrop-blur-[2px]">
      {/* Vignette tepi halus agar studio 3D di belakang tetap jelas namun fokus terjaga */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 52%, transparent 22%, rgba(2,6,23,0.58) 78%, rgba(2,6,23,0.82) 100%)",
        }}
      />

      {/* TOP BAR: Strip Pipeline + Tombol Tutup */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/75 px-4 py-2.5 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-0.5" aria-label="Status Pipeline">
          {stageItems.map((item, idx) => {
            const pillStyle =
              item.state === "failed"
                ? "border-rose-400/60 bg-rose-500/20 text-rose-200"
                : item.state === "waiting"
                  ? "border-amber-400/60 bg-amber-500/20 text-amber-200"
                  : item.state === "running"
                    ? "border-cyan-400/70 bg-cyan-500/25 text-cyan-100 animate-pulse"
                    : item.state === "done"
                      ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200/90"
                      : "border-white/10 bg-slate-900/60 text-slate-400";

            return (
              <React.Fragment key={item.key}>
                <button
                  onClick={() => onOpenWorkspace?.(item.index)}
                  className={`rounded-md border px-2 py-1 text-[10px] font-mono-tech transition hover:brightness-125 ${pillStyle}`}
                  title={`Buka ruang kerja ${item.shortName}`}
                >
                  {item.shortName}
                </button>
                {idx < stageItems.length - 1 && (
                  <span className="text-[10px] text-slate-600 select-none">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <button
          onClick={closeRoom}
          className="ml-auto shrink-0 rounded-lg border border-cyan-300/35 bg-slate-900/90 px-3.5 py-1.5 text-[11px] font-mono-tech font-bold text-cyan-100 hover:bg-slate-800"
        >
          Tutup Felisa → Lihat Studio Full [ESC]
        </button>
      </header>

      {/* MAIN STAGE: rail agen + potret + briefing, center terhadap topbar dan tab bar */}
      <main className="leader-stage relative z-10 w-full">
        {/* Kiri: Rail daftar agen */}
        <aside className="leader-agent-rail" aria-label="Status 10 agen">
          <div className="leader-agent-rail-title">
            <span>AGEN STUDIO</span>
            <span>{doneCount}/{stageItems.length}</span>
          </div>
          <div className="leader-agent-rail-list">
            {stageItems.map((item) => {
              const railState =
                item.state === "failed"
                  ? { dot: "#fb7185", text: "gagal" }
                  : item.state === "waiting"
                    ? { dot: "#fbbf24", text: "persetujuan" }
                    : item.state === "running"
                      ? { dot: "#22d3ee", text: "berjalan" }
                      : item.state === "done"
                        ? { dot: "#34d399", text: "selesai" }
                        : { dot: "#64748b", text: "standby" };
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onOpenWorkspace?.(item.index)}
                  className="leader-agent-row"
                  title={`Buka ruang kerja ${item.shortName}`}
                >
                  <span className="leader-agent-row-dot" style={{ background: railState.dot }} />
                  <span className="leader-agent-row-name">{item.shortName}</span>
                  <span className="leader-agent-row-status">{railState.text}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Tengah: Potret Felisa dengan rasio asli */}
        <section className="felisa-figure-column" aria-label="Potret Felisa">
          {/* Cahaya proyektor: sempit di bawah, melebar ke atas, tepat di belakang Felisa */}
          <div
            aria-hidden="true"
            className="felisa-holo-beam"
            style={{
              background: `linear-gradient(to top, ${theme.aura} 0%, ${theme.aura} 12%, rgba(34,211,238,0.10) 52%, transparent 100%)`,
              filter: sleep ? "blur(18px) saturate(.25)" : "blur(12px)",
              opacity: sleep ? 0.18 : 0.9,
            }}
          />
          <div
            aria-hidden="true"
            className="felisa-holo-scan"
            style={{
              borderColor: `${theme.accent}55`,
              backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 8px, ${theme.accent}12 9px, transparent 10px)`,
              opacity: sleep ? 0.12 : 0.34,
            }}
          />
          <div
            aria-hidden="true"
            className="felisa-holo-platform"
            style={{
              borderColor: `${theme.accent}aa`,
              color: theme.accent,
              boxShadow: `0 0 10px ${theme.accent}55, 0 0 28px ${theme.aura}`,
              opacity: sleep ? 0.18 : 0.82,
            }}
          />

          {/* Ambient Glow dinamis di belakang bahu/tubuh Felisa */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[56%] h-[58%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-500"
            style={{
              background: `radial-gradient(circle, ${theme.aura} 0%, transparent 70%)`,
              filter: "blur(30px)",
              opacity: sleep ? 0.28 : 0.72,
            }}
          />

          {/* Wadah Felisa: rasio asli, tinggi penuh, tanpa crop */}
          <div
            className="felisa-float-stage felisa-figure"
            style={{
              background: "transparent",
              border: "none",
              boxShadow: "none",
            }}
          >
            <FelisaLayered
              speaking={speaking}
              level={audioLevel}
              pulse={pulse}
              sleep={sleep}
              glowMode={glowMode}
              mood={status === "failed" ? "concerned" : status === "waiting_approval" ? "thinking" : "happy"}
              fps={24}
              opacity={opacity}
              onStatus={setFelisaStatus}
              className="relative z-10"
              style={{
                width: "100%",
                height: "100%",
                maxHeight: "none",
                display: "block",
                WebkitMaskImage: "radial-gradient(ellipse 50% 54% at 50% 46%, #000 58%, transparent 100%)",
                maskImage: "radial-gradient(ellipse 50% 54% at 50% 46%, #000 58%, transparent 100%)",
              }}
            />
          </div>

          <style>{`
            .leader-stage {
              --leader-topbar: 56px;
              --leader-tabbar: 56px;
              display: grid;
              grid-template-columns: 260px minmax(0, 1fr) 440px;
              gap: 32px;
              align-items: center;
              max-width: 1360px;
              height: calc(100vh - var(--leader-topbar) - var(--leader-tabbar));
              min-height: 0;
              margin: 0 auto;
              padding: 8px 24px 0;
            }
            .leader-agent-rail {
              align-self: center;
              max-height: calc(100% - 24px);
              overflow: hidden;
              border-left: 1px solid rgba(148,163,184,.12);
              padding: 8px 8px 8px 12px;
            }
            .leader-agent-rail-title {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 7px;
              color: #94a3b8;
              font-family: "JetBrains Mono", monospace;
              font-size: 9px;
              letter-spacing: .08em;
            }
            .leader-agent-rail-list {
              display: flex;
              flex-direction: column;
              gap: 3px;
            }
            .leader-agent-row {
              display: grid;
              grid-template-columns: 8px minmax(58px, 1fr) auto;
              align-items: center;
              gap: 8px;
              width: 100%;
              min-height: 38px;
              padding: 5px 7px;
              border: 1px solid rgba(148,163,184,.18);
              border-radius: 8px;
              background: rgba(15,23,42,.88);
              box-shadow: inset 0 1px 0 rgba(255,255,255,.035), 0 6px 16px rgba(2,6,23,.24);
              backdrop-filter: blur(10px);
              -webkit-backdrop-filter: blur(10px);
              color: #cbd5e1;
              text-align: left;
              cursor: pointer;
              transition: border-color .15s ease, background .15s ease;
            }
            .leader-agent-row:hover {
              border-color: rgba(34,211,238,.20);
              background: rgba(15,23,42,.55);
            }
            .leader-agent-row-dot {
              width: 7px;
              height: 7px;
              border-radius: 999px;
              box-shadow: 0 0 10px currentColor;
            }
            .leader-agent-row-name {
              font-size: 12px;
              font-weight: 700;
            }
            .leader-agent-row-status {
              color: #94a3b8;
              font-family: "JetBrains Mono", monospace;
              font-size: 8.5px;
              text-transform: uppercase;
            }
            .felisa-figure-column {
              position: relative;
              display: flex;
              height: 100%;
              min-width: 0;
              min-height: 0;
              align-items: center;
              justify-content: center;
              overflow: visible;
            }
            .felisa-holo-beam {
              position: absolute;
              z-index: 1;
              left: 50%;
              bottom: 4%;
              width: 96%;
              height: 82%;
              transform: translateX(-50%);
              clip-path: polygon(43% 100%, 57% 100%, 92% 0, 8% 0);
              transform-origin: 50% 100%;
              pointer-events: none;
            }
            .felisa-holo-scan {
              position: absolute;
              z-index: 2;
              left: 50%;
              bottom: 6%;
              width: 64%;
              height: 68%;
              transform: translateX(-50%);
              clip-path: polygon(43% 100%, 57% 100%, 88% 0, 12% 0);
              border-left: 1px solid;
              border-right: 1px solid;
              mask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,.7) 55%, transparent 100%);
              -webkit-mask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,.7) 55%, transparent 100%);
              pointer-events: none;
              animation: holoScanMove 3.8s linear infinite;
            }
            .felisa-holo-platform {
              position: absolute;
              z-index: 3;
              left: 50%;
              bottom: 1.5%;
              width: 78%;
              height: 8.5%;
              transform: translateX(-50%);
              border: 1px solid;
              border-radius: 50%;
              background: radial-gradient(ellipse at center, rgba(15,23,42,.28) 0%, transparent 68%);
              pointer-events: none;
            }
            .felisa-holo-platform::before,
            .felisa-holo-platform::after {
              content: "";
              position: absolute;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%);
              border: 1px solid currentColor;
              border-radius: 50%;
            }
            .felisa-holo-platform::before {
              width: 58%;
              height: 58%;
              opacity: .65;
            }
            .felisa-holo-platform::after {
              width: 34%;
              height: 34%;
              opacity: .9;
            }
            @keyframes holoScanMove {
              0% { background-position: 0 0; }
              100% { background-position: 0 18px; }
            }
            .felisa-figure {
              position: relative;
              z-index: 10;
              height: auto;
              max-height: 100%;
              width: min(100%, calc((100vh - var(--leader-topbar) - var(--leader-tabbar)) * 0.76));
              max-width: 100%;
              aspect-ratio: 460 / 605;
              justify-self: center;
            }
            .felisa-figure canvas {
              width: 100%;
              height: 100%;
              max-height: none;
              display: block;
            }
            .felisa-float-stage {
              animation: felisaFloat 5s ease-in-out infinite;
            }
            @keyframes felisaFloat {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-5px); }
            }
            @media (prefers-reduced-motion: reduce) {
              .felisa-float-stage { animation: none !important; }
            }
            @media (max-width: 1100px) {
              .leader-stage {
                grid-template-columns: minmax(0, 1fr) 440px;
                max-width: 900px;
              }
              .leader-agent-rail {
                display: none;
              }
            }
            @media (max-width: 800px) {
              .leader-stage {
                grid-template-columns: 1fr;
                height: calc(100vh - var(--leader-topbar) - var(--leader-tabbar));
                gap: 8px;
                overflow-y: auto;
                padding: 8px 12px 12px;
              }
              .felisa-figure-column {
                height: min(52vh, 520px);
              }
              .felisa-figure {
                width: min(100%, 355px);
                height: auto;
                max-height: 520px;
              }
              .leader-stage > aside:last-of-type {
                width: min(440px, 100%);
                justify-self: center;
              }
            }
          `}</style>
        </section>

        {/* Kanan: Panel Briefing & Kontrol Pemimpin Studio */}
        <aside className="pointer-events-auto relative rounded-2xl border border-white/15 bg-slate-950/88 p-5 text-slate-100 shadow-2xl backdrop-blur-xl">
          {/* Header Kartu + Tombol Pengaturan Dev */}
          <div className="mb-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono-tech font-bold uppercase tracking-wider ${theme.badge}`}
              >
                Studio Leader
              </span>
              <h1 className="font-heading text-lg font-bold tracking-tight text-white">Felisa</h1>
              <button
                type="button"
                onClick={replayBriefing}
                disabled={muted}
                className="grid h-7 w-7 place-items-center rounded-full border border-cyan-400/30 bg-slate-900/80 text-sm text-cyan-200 hover:border-cyan-300/60 disabled:opacity-40"
                title={muted ? "Suara Felisa dibisukan" : "Putar ulang briefing Felisa"}
                aria-label="Putar ulang briefing Felisa"
              >
                🔊
              </button>
              {video?.title && (
                <span className="hidden truncate text-[11px] font-mono-tech text-slate-400 sm:inline max-w-[170px]">
                  · {video.title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-[11px] font-mono-tech text-slate-300 hover:border-white/25"
                title={muted ? "Aktifkan suara Felisa" : "Bisukan suara Felisa"}
                aria-label={muted ? "Suara Aktif" : "Bisukan"}
              >
                {muted ? "🔇" : "🔊"} {muted ? "Suara Aktif" : "Bisukan"}
              </button>
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-[11px] font-mono-tech text-slate-400 hover:border-white/25 hover:text-slate-200"
                title="Pengaturan Tampilan & Gudang"
              >
                ⚙
              </button>
            </div>
          </div>

          {/* Drawer Pengaturan Teknis (Tersembunyi secara bawaan) */}
          {showSettings && (
            <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/90 p-3 text-[11px] font-mono-tech text-slate-300 space-y-2.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  RIG: {felisaStatus ? `${felisaStatus.activeCount}/${felisaStatus.totalCount} LAYER` : "20/20 LAYER"}
                </span>
                <span>{felisaStatus ? `${felisaStatus.width}×${felisaStatus.height}px` : "460×605px"}</span>
              </div>
              <label className="flex items-center justify-between gap-3">
                <span>Transparansi Potret</span>
                <input
                  type="range"
                  min="0.4"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-28 accent-cyan-400"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Bahasa Felisa</span>
                <select
                  value={felisaLang}
                  onChange={(event) => {
                    const nextLang = setFelisaLang(event.target.value);
                    setFelisaLangState(nextLang);
                    setDisplayedText(nextLang === "en"
                      ? getStatusLine(status, name, errorCode, "en")
                      : getStatusLine(status, name, errorCode, "id"));
                  }}
                  className="rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-slate-200"
                >
                  <option value="id">Indonesia</option>
                  <option value="en">English</option>
                </select>
              </label>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2">
                  <span>Suara Felisa</span>
                  <select
                    value={felisaVoice}
                    onChange={(event) => setFelisaVoiceState(setFelisaVoice(event.target.value))}
                    className="rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-slate-200"
                  >
                    {felisaVoiceOptions.map((option) => (
                      <option key={option.voice} value={option.voice}>
                        {option.label}{option.status === "preview_only" ? " (belum lengkap)" : ""}
                      </option>
                    ))}
                    {felisaVoiceOptions.length === 0 && (
                      <option value="Leda">Belum ada preview Gemini</option>
                    )}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => previewVoice({
                    lang: felisaLang,
                    voice: felisaVoice,
                    onSpeaking: setSpeaking,
                    onLevel: setAudioLevel,
                  })}
                  disabled={muted}
                  className="shrink-0 rounded-md border border-cyan-400/30 bg-cyan-950/60 px-2 py-1 text-cyan-200 hover:border-cyan-300/60 disabled:opacity-40"
                >
                  Preview
                </button>
              </div>
              {felisaVoiceOptions.find((option) => option.voice === felisaVoice)?.status === "preview_only" && (
                <p className="mt-1 text-[10px] text-slate-400">
                  Buat set lengkap: jalankan generator dengan FELISA_VOICE={felisaVoice}
                </p>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowSettings(false);
                    onOpenStorage?.();
                  }}
                  className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
                >
                  Buka Gudang Proyek
                </button>
                <button
                  onClick={() => {
                    stopSpeaking();
                    setSpeaking(false);
                    setAudioLevel(0);
                    localStorage.removeItem(NAME_KEY);
                    setStarted(false);
                    setShowSettings(false);
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  Ganti Nama
                </button>
              </div>
            </div>
          )}

          {!started ? (
            <form onSubmit={start} className="space-y-3">
              <p className="text-sm leading-relaxed text-slate-200">
                Sebelum mulai memimpin produksi hari ini, siapa nama panggilanmu?
              </p>
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Masukkan nama..."
                autoFocus
                className="w-full rounded-lg border border-cyan-400/30 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-300"
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
            <div className="space-y-3.5">
              {/* 1. Briefing Terstruktur (Headline + 2 Poin Singkat) */}
              <div className="rounded-xl border border-white/10 bg-slate-900/75 p-3.5">
                <p className="text-sm font-semibold leading-snug text-white">{briefing.headline}</p>
                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-slate-300">
                  {briefing.bullets.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: theme.accent }} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                {showExplain && (
                  <p className="mt-2.5 border-t border-white/10 pt-2 text-[11px] text-slate-400">
                    {errorCode
                      ? `Diagnostik: terdeteksi pola error "${errorCode}" dari log tahap.`
                      : "Diagnostik: status dipetakan langsung dari status tahapan Orchestrator."}
                  </p>
                )}
              </div>

              {/* 2. Satu Rekomendasi Utama (Tombol Penuh) + Aksi Sekunder */}
              <div className="space-y-2">
                <button
                  onClick={briefing.primaryAction}
                  disabled={busy}
                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-mono-tech font-bold shadow-md transition disabled:opacity-50 ${theme.cta}`}
                >
                  {briefing.primaryLabel}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={closeRoom}
                    className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-[11px] font-mono-tech text-slate-300 hover:bg-slate-800"
                  >
                    Lihat Studio 3D
                  </button>
                  <button
                    onClick={() => {
                      const next = !showExplain;
                      setShowExplain(next);
                      speak("explain", {
                        name,
                        errorCode,
                        lang: felisaLang,
                        voice: felisaVoice,
                        text: briefing.headline,
                        onText: setDisplayedText,
                        onSpeaking: setSpeaking,
                        onLevel: setAudioLevel,
                        duration: 2800,
                      });
                    }}
                    className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-[11px] font-mono-tech text-slate-300 hover:bg-slate-800"
                  >
                    {showExplain ? "Tutup Detail" : "Detail Status"}
                  </button>
                </div>
              </div>

              {/* 3. Daftar "Butuh Perhatianmu" (Hanya muncul bila ada approval / gagal) */}
              {attentionItems.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono-tech uppercase tracking-wider text-slate-400">
                    Butuh Perhatianmu ({attentionItems.length})
                  </div>
                  {attentionItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                        item.type === "failed"
                          ? "border-rose-400/35 bg-rose-950/35"
                          : "border-amber-400/35 bg-amber-950/35"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-white">{item.title}</div>
                        <div className="truncate text-[10px] text-slate-300">{item.detail}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={item.onAction}
                          className="rounded-md border border-white/15 bg-slate-900/85 px-2.5 py-1 text-[10px] font-mono-tech font-bold text-slate-100 hover:bg-slate-800"
                        >
                          {item.actionLabel}
                        </button>
                        {item.secondaryLabel && (
                          <button
                            onClick={item.onSecondary}
                            disabled={busy}
                            className="rounded-md bg-amber-400 px-2.5 py-1 text-[10px] font-mono-tech font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                          >
                            {item.secondaryLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Roster Agen Ringkas */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 text-[10px] font-mono-tech">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: theme.accent }} />
                  <span>
                    {activeAgents.length > 0
                      ? `Aktif: ${activeAgents.map((a) => a.shortName).join(", ")}`
                      : "Semua agen standby"}
                  </span>
                </div>
                <span className="text-slate-400">
                  {doneCount}/{stageItems.length} selesai
                </span>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}