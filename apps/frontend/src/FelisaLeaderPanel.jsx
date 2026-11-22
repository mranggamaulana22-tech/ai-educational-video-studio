import React, { useEffect, useRef, useState } from "react";
import { FELISA_LEADER } from "./agentsConfig.js";
import {
  executeLeaderAction,
  getEventsUrl,
  getLeaderStatus,
  sendLeaderCommand,
} from "./api.js";
import FelisaLayered from "./FelisaLayered.jsx";

const ACTION_LABEL = {
  open_tutor: "Buka Sesi Tutor",
  open_approval: "Buka Approval",
  open_stage: "Buka Tahap",
};

function formatTime(timestamp) {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function FelisaLeaderPanel({ videoId, onEvent, onAction, onNavigate }) {
  const [status, setStatus] = useState("connecting");
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [leaderMessage, setLeaderMessage] = useState("");
  const [command, setCommand] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [commandBusy, setCommandBusy] = useState(false);
  const [felisaStatus, setFelisaStatus] = useState(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    const source = new EventSource(getEventsUrl());
    sourceRef.current = source;

    source.onopen = () => setStatus("connected");
    source.onerror = () => setStatus("reconnecting");
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        setHistory((items) => [event, ...items.filter((item) => item.id !== event.id)].slice(0, 50));
        onEvent?.(event);
      } catch {
        // Pesan ping SSE tidak membawa payload JSON.
      }
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [onEvent]);

  useEffect(() => {
    let alive = true;
    getLeaderStatus()
      .then((brief) => {
        if (alive) setLeaderMessage(brief.reply || "");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const submitCommand = async (text) => {
    const message = (text || command).trim();
    if (!message || commandBusy) return;
    setCommandBusy(true);
    setPendingAction(null);
    try {
      const response = await sendLeaderCommand(message, videoId);
      setLeaderMessage(response.result?.reply || "");
      setPendingAction(response.pending_action || null);
      onNavigate?.(response.result);
    } catch (error) {
      setLeaderMessage(error.message);
    } finally {
      setCommandBusy(false);
      setCommand("");
    }
  };

  const confirmAction = async () => {
    if (!pendingAction || commandBusy) return;
    setCommandBusy(true);
    try {
      const response = await executeLeaderAction(pendingAction);
      setLeaderMessage(
        response.result?.status === "approved"
          ? "Persetujuan telah dilaksanakan."
          : "Aksi Felisa sudah dijalankan."
      );
      setPendingAction(null);
      onNavigate?.({ ...pendingAction, intent: pendingAction.action });
    } catch (error) {
      setLeaderMessage(error.message);
    } finally {
      setCommandBusy(false);
    }
  };

  const latest = history[0] || null;
  const latestStatus = latest?.type || "";
  const speaking = ["running", "started"].includes(latestStatus);
  const glowMode =
    latestStatus === "failed"
      ? "flicker"
      : latestStatus === "waiting_approval"
        ? "calm"
        : "normal";
  const statusStyle =
    status === "connected"
      ? "bg-emerald-400"
      : status === "reconnecting"
        ? "bg-amber-400 animate-pulse"
        : "bg-slate-400 animate-pulse";

  if (minimized) {
    return (
        <aside className="fixed right-3 bottom-12 z-30 pointer-events-auto">
          <button
            onClick={() => setMinimized(false)}
            className="ops-glass rounded-full px-3.5 py-2.5 flex items-center gap-2 text-xs font-mono-tech text-cyan-100 cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${statusStyle}`} />
            <span className="font-heading font-bold">Felisa</span>
            <span className="text-cyan-300/70">Expand ▲</span>
          </button>
        </aside>
    );
  }

  return (
    <aside className="fixed right-3 bottom-12 z-30 w-[min(340px,calc(100vw-24px))] pointer-events-auto">
      <div className="ops-glass rounded-2xl overflow-hidden border-cyan-400/20">
        <div className="px-3.5 py-3 border-b border-white/8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusStyle}`} />
                <span className="font-heading text-sm font-bold text-cyan-100">Felisa</span>
                <span className="text-[9px] font-mono-tech text-cyan-300/70">STUDIO LEADER</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{FELISA_LEADER.scopeTag}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono-tech text-slate-400 whitespace-nowrap">
                {status === "connected" ? "REALTIME" : status === "reconnecting" ? "NYAMBUNG..." : "MENGHUBUNG"}
              </span>
              <button
                onClick={() => setMinimized(true)}
                className="rounded-md border border-white/10 px-2 py-1 text-[9px] font-mono-tech text-slate-300 hover:text-white cursor-pointer"
                title="Minimize panel Felisa"
              >
                —
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-end gap-3">
            <div className="w-[138px] h-[181px] shrink-0 rounded-xl overflow-hidden bg-slate-950/40">
              <FelisaLayered
                speaking={speaking}
                level={speaking ? 0.55 : 0}
                pulse={history.length}
                sleep={false}
                glowMode={glowMode}
                mood={latestStatus === "failed" ? "concerned" : latestStatus === "waiting_approval" ? "thinking" : "happy"}
                fps={24}
                onStatus={setFelisaStatus}
              />
            </div>
            {felisaStatus && (
              <div className="pb-1 min-w-0 text-[9px] font-mono-tech text-slate-400 leading-relaxed">
                <div className={felisaStatus.failedNames.length ? "text-amber-300" : "text-emerald-300"}>
                  {felisaStatus.activeCount}/{felisaStatus.totalCount} layer aktif
                </div>
                <div>{felisaStatus.width}×{felisaStatus.height}px</div>
                {felisaStatus.failedNames.length > 0 && (
                  <div className="mt-1 text-amber-300/80 break-words">
                    Gagal: {felisaStatus.failedNames.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 rounded-xl bg-slate-950/55 border border-white/7 px-3 py-2.5">
            {leaderMessage ? (
              <>
                <p className="text-xs leading-relaxed text-slate-100">{leaderMessage}</p>
                {latest?.video_title && (
                  <p className="mt-1 text-[9px] font-mono-tech text-cyan-300/70 truncate">
                    {latest.video_title} · {latest.stage || latest.type}
                  </p>
                )}
                {latest?.action_hint && (
                  <button
                    onClick={() => onAction?.(latest)}
                    className="mt-2.5 w-full rounded-lg border border-cyan-400/35 bg-cyan-500/12 hover:bg-cyan-500/22 px-3 py-2 text-[10px] font-mono-tech font-bold text-cyan-100 cursor-pointer"
                  >
                    {ACTION_LABEL[latest.action_hint] || "Buka"} →
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs leading-relaxed text-slate-400">
                Menunggu aktivitas studio. Saya akan mengingatkanmu saat proses atau persetujuan membutuhkan tindakan.
              </p>
            )}
          </div>
        </div>

        {pendingAction && (
          <div className="mx-3.5 mb-2.5 rounded-xl border border-amber-400/30 bg-amber-950/25 px-3 py-2.5">
            <p className="text-[10px] leading-relaxed text-amber-100">
              Konfirmasi aksi: <strong>{pendingAction.action}</strong>
              {pendingAction.stage ? ` · ${pendingAction.stage}` : ""}
              {pendingAction.approval_point ? ` · ${pendingAction.approval_point}` : ""}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={confirmAction}
                disabled={commandBusy}
                className="rounded-lg bg-cyan-500/20 border border-cyan-400/40 px-2 py-2 text-[10px] font-mono-tech font-bold text-cyan-100 cursor-pointer disabled:opacity-50"
              >
                Jalankan
              </button>
              <button
                onClick={() => setPendingAction(null)}
                className="rounded-lg bg-slate-800/70 border border-white/10 px-2 py-2 text-[10px] font-mono-tech text-slate-300 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        <div className="px-3.5 pb-2.5 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {["Status proyek", "Lanjutkan tahap", "Setujui"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => submitCommand(suggestion)}
                disabled={commandBusy}
                className="rounded-full border border-cyan-400/20 bg-cyan-500/8 px-2.5 py-1 text-[9px] font-mono-tech text-cyan-200 cursor-pointer disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitCommand();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Perintah singkat untuk Felisa..."
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-2 text-[10px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/40"
            />
            <button
              type="submit"
              disabled={commandBusy}
              className="rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-2 text-[10px] font-mono-tech font-bold text-cyan-100 cursor-pointer disabled:opacity-50"
            >
              Kirim
            </button>
          </form>
        </div>

        <button
          onClick={() => setExpanded((value) => !value)}
          className="w-full px-3.5 py-2 flex items-center justify-between text-[10px] font-mono-tech text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <span>RIWAYAT AKTIVITAS · {history.length}</span>
          <span>{expanded ? "▲" : "▼"}</span>
        </button>

        {expanded && (
          <div className="max-h-44 overflow-y-auto px-3.5 pb-3 space-y-1.5">
            {history.map((event) => (
              <div key={event.id} className="rounded-lg border border-white/6 bg-white/[0.025] px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono-tech text-cyan-300/80">{event.type}</span>
                  <span className="text-[8px] font-mono-tech text-slate-600">{formatTime(event.timestamp)}</span>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-300">{event.felisa_message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
