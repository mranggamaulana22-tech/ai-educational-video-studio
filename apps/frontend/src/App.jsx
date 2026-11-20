import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { AGENT_STAGES } from "./agentsConfig.js";
import CommandCenter3D from "./CommandCenter3D.jsx";
import AgentWorkspaceModal from "./AgentWorkspaceModal.jsx";

const APPROVAL_TO_AGENT_INDEX = {
  notes: 2,
  ideas: 3,
  script: 5, // Reviewer gate
  audio: 6,
  video: 9,
};

function isHeavyStageRunning(video) {
  if (!video?.stages) return null;
  for (const key of ["render", "words"]) {
    const st = video.stages[key];
    if (st?.last_run && ["queued", "running"].includes(st.last_run.status)) {
      return key;
    }
  }
  return null;
}

export default function App() {
  const [videos, setVideos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [cameraRequest, setCameraRequest] = useState({ target: "overview", seq: 0 });
  const [workspaceIndex, setWorkspaceIndex] = useState(null);

  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fps, setFps] = useState(60);
  const [perfPreset, setPerfPreset] = useState("balanced");
  const [manualSleep, setManualSleep] = useState(false);
  const [workspaceSleep, setWorkspaceSleep] = useState(false);

  const [showNewVideo, setShowNewVideo] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", day: 1, title: "", next_topic: "" });
  const materialInputRef = useRef(null);

  const showError = useCallback((text) => setToast({ kind: "error", text }), []);
  const showInfo = useCallback((text) => setToast({ kind: "info", text }), []);

  const loadVideos = useCallback(async () => {
    try {
      const list = await api.videos();
      setVideos(list);
      return list;
    } catch (e) {
      showError(e.message);
      return [];
    }
  }, [showError]);

  useEffect(() => {
    loadVideos().then((list) => {
      if (list.length) setSelectedId((prev) => prev ?? list[0].id);
    });
  }, [loadVideos]);

  const video = videos.find((v) => v.id === selectedId) || null;

  // Polling setiap 2,5 detik selama ada tahap berstatus queued atau running (tetap jalan saat Sleep Mode)
  const anyRunning = Boolean(
    video &&
      Object.values(video.stages || {}).some(
        (s) => s?.last_run && ["queued", "running"].includes(s.last_run.status)
      )
  );

  useEffect(() => {
    if (!anyRunning) return;
    const timer = setInterval(loadVideos, 2500);
    return () => clearInterval(timer);
  }, [anyRunning, loadVideos]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast]);

  // Auto Sleep Mode saat render (Remotion) atau words (Whisper) berjalan untuk hemat RAM 8 GB & CPU
  const heavyRunningStage = isHeavyStageRunning(video);
  const isSleepMode = manualSleep || Boolean(heavyRunningStage);
  const is3DSleepMode = isSleepMode || workspaceSleep;

  const requestCamera = useCallback((target) => {
    if (typeof target === "number") {
      setFocusedIndex(target);
    } else {
      setFocusedIndex(null);
    }
    setCameraRequest((prev) => ({ target, seq: prev.seq + 1 }));
  }, []);

  // Pintasan keyboard: 1-9 & 0 untuk 10 agen, Spasi = Overview, E = Buka Ruang Kerja, Esc = Tutup
  useEffect(() => {
    const onKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        if (e.key === "Escape") {
          setWorkspaceIndex(null);
          setShowNewVideo(false);
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k >= "1" && k <= "9") {
        requestCamera(parseInt(k, 10) - 1);
      } else if (k === "0") {
        requestCamera(9);
      } else if (k === " ") {
        e.preventDefault();
        requestCamera("overview");
      } else if (k === "e") {
        if (video) setWorkspaceIndex(focusedIndex !== null ? focusedIndex : 0);
      } else if (k === "escape") {
        setWorkspaceIndex(null);
        setShowNewVideo(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedIndex, requestCamera, video]);

  const handleRunStage = async (stageKey) => {
    if (!video) return;
    setBusy(true);
    try {
      await api.run(video.id, stageKey);
      showInfo(`Tahap "${stageKey}" dijalankan di latar belakang...`);
      await loadVideos();
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleApprovePoint = async (point) => {
    if (!video) return;
    setBusy(true);
    try {
      await api.approve(video.id, point);
      showInfo(`Titik persetujuan "${point}" disetujui.`);
      await loadVideos();
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAdvance = async () => {
    if (!video) return;
    setBusy(true);
    try {
      const res = await api.advance(video.id);
      if (res.action === "waiting_approval") {
        showInfo(`Menunggu persetujuan di gate "${res.waiting_approval}"${res.waiting_approval_reason ? ` (${res.waiting_approval_reason})` : ""}.`);
        const targetIdx = APPROVAL_TO_AGENT_INDEX[res.waiting_approval];
        if (typeof targetIdx === "number") requestCamera(targetIdx);
      } else if (res.action === "started") {
        showInfo(`Advance menjalankan tahap "${res.stage}"...`);
      } else if (res.action === "done") {
        showInfo("Seluruh 10 tahap produksi video telah selesai!");
      } else {
        showInfo(`Status orkestrator: ${res.action}`);
      }
      await loadVideos();
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleScan = async () => {
    if (!video) return;
    setBusy(true);
    try {
      const r = await api.scan(video.id);
      showInfo(
        r.registered?.length
          ? `File terdaftar: ${r.registered.join(", ")}`
          : "Tidak ada file baru yang ditemukan di folder proyek."
      );
      await loadVideos();
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUploadMaterial = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !video) return;
    setBusy(true);
    try {
      await api.uploadMaterial(video.id, file);
      showInfo(`Materi "${file.name}" berhasil diekstrak dan disimpan.`);
      await loadVideos();
    } catch (e2) {
      showError(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateVideo = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await api.createVideo({
        ...newForm,
        day: Number(newForm.day) || 1,
      });
      setNewForm({ name: "", day: (Number(newForm.day) || 1) + 1, title: "", next_topic: "" });
      setShowNewVideo(false);
      await loadVideos();
      setSelectedId(created.id);
      showInfo(`Video "${created.title || created.name}" berhasil dibuat.`);
    } catch (e2) {
      showError(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const jumpToApprovalAgent = () => {
    if (!video?.waiting_approval) return;
    const idx = APPROVAL_TO_AGENT_INDEX[video.waiting_approval] ?? 0;
    requestCamera(idx);
    setWorkspaceIndex(idx);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 3D Command Center Engine */}
      <CommandCenter3D
        video={video}
        focusedIndex={focusedIndex}
        cameraRequest={cameraRequest}
        isSleepMode={is3DSleepMode}
        perfPreset={perfPreset}
        busy={busy}
        onFocusAgent={requestCamera}
        onOpenWorkspace={(idx) => setWorkspaceIndex(idx)}
        onRunStage={handleRunStage}
        onApprovePoint={handleApprovePoint}
        onFpsUpdate={setFps}
      />

      {/* TOP HUD BAR */}
      <header className="fixed top-0 left-0 right-0 z-20 px-3.5 py-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Kiri: Brand + Video Switcher + Tambah Video */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="hud-pill rounded-full px-3.5 py-1.5 flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full ${anyRunning ? "bg-amber-400 animate-ping" : "bg-cyan-400 animate-pulse"}`} />
            <span className="font-heading text-xs md:text-sm font-bold text-white tracking-wide">
              AI Video Studio
            </span>
          </div>

          <div className="hud-pill rounded-full px-2.5 py-1 flex items-center gap-1.5">
            <select
              value={selectedId || ""}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="bg-transparent text-xs font-mono-tech text-cyan-200 focus:outline-none max-w-[200px] sm:max-w-[260px] cursor-pointer"
            >
              {!videos.length && <option value="">Belum ada video</option>}
              {videos.map((v) => (
                <option key={v.id} value={v.id} className="bg-slate-950 text-slate-100">
                  Hari {v.day} • {v.title || v.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewVideo(true)}
              className="px-2 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 font-mono-tech text-[11px] font-bold cursor-pointer"
              title="Buat video baru"
            >
              + Baru
            </button>
          </div>

          {video && (
            <>
              <button
                onClick={handleAdvance}
                disabled={busy || anyRunning}
                className="hud-pill bg-cyan-500/25 hover:bg-cyan-500/40 disabled:opacity-50 border-cyan-400/50 rounded-full px-3.5 py-1.5 text-xs font-mono-tech font-bold text-cyan-100 cursor-pointer transition"
                title="Jalankan tahap berikutnya secara otomatis hingga titik persetujuan"
              >
                {anyRunning ? "⏳ PROSES BERJALAN..." : "⚡ ADVANCE"}
              </button>

              <button
                onClick={handleScan}
                disabled={busy}
                className="hud-pill hover:bg-slate-800/80 rounded-full px-3 py-1.5 text-[11px] font-mono-tech text-slate-300 cursor-pointer transition hidden md:inline-flex"
                title="Daftarkan file yang sudah ada di folder proyek"
              >
                Scan File
              </button>

              <button
                onClick={() => materialInputRef.current?.click()}
                disabled={busy}
                className="hud-pill hover:bg-cyan-950/60 rounded-full px-3 py-1.5 text-[11px] font-mono-tech text-cyan-200 cursor-pointer transition"
                title="Unggah dokumen .docx, .pdf, .txt, atau .md sebagai material"
              >
                Upload Dokumen
              </button>
              <input
                ref={materialInputRef}
                type="file"
                accept=".docx,.pdf,.txt,.md"
                className="hidden"
                onChange={handleUploadMaterial}
              />
            </>
          )}
        </div>

        {/* Kanan: Indikator Waiting Approval + FPS + Eco Mode + Sleep Mode */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {video?.waiting_approval && (
            <button
              onClick={jumpToApprovalAgent}
              className={`hud-pill rounded-full px-3.5 py-1.5 text-[11px] font-mono-tech font-bold cursor-pointer flex items-center gap-1.5 ${
                video.waiting_approval_reason === "belum lolos review"
                  ? "bg-rose-950/80 border-rose-400/60 text-rose-200 animate-pulse"
                  : "bg-amber-950/80 border-amber-400/60 text-amber-200 animate-pulse"
              }`}
            >
              <span>⚠ WAITING APPROVAL: {video.waiting_approval.toUpperCase()}</span>
              {video.waiting_approval_reason && <span>({video.waiting_approval_reason})</span>}
            </button>
          )}

          <div className="hud-pill rounded-full px-3 py-1.5 text-[11px] font-mono-tech text-slate-300 hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{fps} FPS</span>
          </div>

          <button
            onClick={() => setPerfPreset((p) => (p === "balanced" ? "eco" : "balanced"))}
            className="hud-pill hover:bg-slate-800/80 transition px-3 py-1.5 rounded-full text-[11px] font-mono-tech text-slate-200 cursor-pointer"
            title="Optimasi GPU & RAM 8 GB"
          >
            {perfPreset === "eco" ? "RAM 8GB ECO" : "BALANCED"}
          </button>

          <button
            onClick={() => setManualSleep((s) => !s)}
            className="hud-pill hover:bg-amber-950/60 transition px-3 py-1.5 rounded-full text-[11px] font-mono-tech text-amber-300 cursor-pointer"
            title="Bekukan 3D untuk menghemat RAM 8 GB & CPU"
          >
            ⏸ <span className="hidden lg:inline">SLEEP</span>
          </button>
        </div>
      </header>

      {/* TOAST NOTIFIKASI (TERMASUK ERROR 409 BERBAHASA INDONESIA) */}
      {toast && (
        <div
          onClick={() => setToast(null)}
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl text-xs font-mono-tech shadow-xl cursor-pointer max-w-xl text-center border backdrop-blur-md ${
            toast.kind === "error"
              ? "bg-rose-950/90 border-rose-400/60 text-rose-100"
              : "bg-slate-900/90 border-cyan-400/50 text-cyan-100"
          }`}
        >
          {toast.kind === "error" ? `✕ ${toast.text}` : toast.text}
        </div>
      )}

      {/* OVERLAY SLEEP MODE (OTOMATIS SAAT RENDER / WORDS WHISPER BERJALAN ATAU MANUAL) */}
      {isSleepMode && (
        <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="ops-glass rounded-2xl max-w-md p-6 space-y-4 border-amber-500/40">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center mx-auto text-base text-amber-300 font-mono-tech font-bold">
              8GB
            </div>
            <h2 className="font-heading text-lg font-bold text-amber-300">
              {heavyRunningStage
                ? `AUTO SLEEP MODE (${heavyRunningStage.toUpperCase()} BERJALAN)`
                : "COMMAND CENTER SLEEP MODE"}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Rendering WebGL 3D dibekukan sementara untuk membebaskan <strong>RAM 8 GB & CPU</strong> bagi{" "}
              <strong>{heavyRunningStage === "words" ? "Whisper Aligner" : "Remotion CLI"}</strong>. Polling status backend tetap aktif setiap 2,5 detik.
            </p>
            {manualSleep && (
              <button
                onClick={() => setManualSleep(false)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono-tech text-xs font-bold transition cursor-pointer"
              >
                AKTIFKAN KEMBALI COMMAND CENTER
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL VIDEO BARU */}
      {showNewVideo && (
        <div
          data-modal="true"
          className="fixed inset-0 z-30 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowNewVideo(false)}
        >
          <form
            onSubmit={handleCreateVideo}
            onClick={(e) => e.stopPropagation()}
            className="ops-glass rounded-2xl w-full max-w-md p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-white">Buat Proyek Video Baru</h3>
              <button
                type="button"
                onClick={() => setShowNewVideo(false)}
                className="text-xs font-mono-tech text-slate-400 hover:text-white cursor-pointer"
              >
                [ESC]
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-400 font-mono-tech mb-1">Slug Nama File (huruf kecil, angka, minus)</label>
                <input
                  required
                  pattern="[a-z0-9\-]+"
                  placeholder="mis. hari3-arsitektur-api"
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-tech select-text"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 font-mono-tech mb-1">Hari ke-</label>
                  <input
                    type="number"
                    min="1"
                    value={newForm.day}
                    onChange={(e) => setNewForm({ ...newForm, day: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-tech select-text"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 font-mono-tech mb-1">Judul Video</label>
                  <input
                    placeholder="Judul pendek"
                    value={newForm.title}
                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white select-text"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-mono-tech mb-1">Topik Besok (untuk teaser closing)</label>
                <input
                  placeholder="Opsional"
                  value={newForm.next_topic}
                  onChange={(e) => setNewForm({ ...newForm, next_topic: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white select-text"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono-tech text-xs font-bold cursor-pointer transition"
            >
              + TAMBAH KE COMMAND CENTER
            </button>
          </form>
        </div>
      )}

      {/* MODAL RUANG KERJA PER AGEN ([E]) */}
      {workspaceIndex !== null && video && (
        <AgentWorkspaceModal
          video={video}
          agentIndex={workspaceIndex}
          onClose={() => {
            setWorkspaceSleep(false);
            setWorkspaceIndex(null);
          }}
          onSelectAgent={(idx) => {
            setWorkspaceIndex(idx);
            requestCamera(idx);
          }}
          onRunStage={handleRunStage}
          onApprovePoint={handleApprovePoint}
          reload={loadVideos}
          onError={showError}
          onInfo={showInfo}
          busy={busy}
          onFullscreenChange={(active, agentKey, subMode) => {
            setWorkspaceSleep(active && (agentKey === "notes" || subMode === "tutor"));
          }}
        />
      )}

      {/* BOTTOM DOCK BAR: 10 AGENT WORKSTATIONS */}
      <footer className="fixed bottom-2.5 left-0 right-0 z-20 px-3 flex flex-col items-center pointer-events-none">
        <nav
          className="bottom-hud-bar rounded-xl px-1.5 py-1 flex items-center gap-1 overflow-x-auto max-w-full pointer-events-auto"
          aria-label="10 Agent Command Navigation"
        >
          <button
            onClick={() => requestCamera("overview")}
            className={`bottom-hud-item font-mono-tech whitespace-nowrap cursor-pointer ${
              focusedIndex === null && cameraRequest.target === "overview" ? "is-active" : ""
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => requestCamera("wall")}
            className={`bottom-hud-item font-mono-tech whitespace-nowrap cursor-pointer ${
              focusedIndex === null && cameraRequest.target === "wall" ? "is-active" : ""
            }`}
          >
            Wall
          </button>
          <div className="h-3.5 w-[1px] bg-white/10 mx-0.5" />
          {AGENT_STAGES.map((ag) => {
            const st = video?.stages?.[ag.key];
            const running = st?.last_run && ["queued", "running"].includes(st.last_run.status);
            const dotCol = running
              ? "#00f0ff"
              : st?.status === "approved"
              ? "#10b981"
              : st?.status === "draft"
              ? "#f59e0b"
              : st?.status === "stale"
              ? "#f43f5e"
              : "#64748b";
            return (
              <button
                key={ag.key}
                onClick={() => requestCamera(ag.index)}
                onDoubleClick={() => video && setWorkspaceIndex(ag.index)}
                title={`${ag.index + 1}. ${ag.name} (${ag.key}) — Klik untuk fokus, klik ganda/[E] untuk masuk ruang kerja`}
                className={`bottom-hud-item font-mono-tech whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                  focusedIndex === ag.index ? "is-active" : ""
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${running ? "animate-ping" : ""}`}
                  style={{ backgroundColor: dotCol }}
                />
                <span>
                  {ag.index + 1}.{ag.name}
                </span>
              </button>
            );
          })}
        </nav>
      </footer>
    </div>
  );
}