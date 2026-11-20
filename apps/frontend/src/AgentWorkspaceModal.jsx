import React, { useEffect, useRef, useState } from "react";
import { api, fileUrl, sampleUrl } from "./api.js";
import { AGENT_STAGES, STATUS_LABEL } from "./agentsConfig.js";

function IdeasDeck({ video, stageInfo, reload, onError, onInfo, busy }) {
  const [ideasData, setIdeasData] = useState(null);
  const [selecting, setSelecting] = useState(null);

  useEffect(() => {
    if (!stageInfo?.artifact_id) {
      setIdeasData(null);
      return;
    }
    fetch(fileUrl(stageInfo.artifact_id))
      .then((r) => r.json())
      .then(setIdeasData)
      .catch(() => setIdeasData(null));
  }, [stageInfo?.artifact_id, stageInfo?.version]);

  const handleSelect = async (idx) => {
    setSelecting(idx);
    try {
      await api.selectIdea(video.id, idx);
      onInfo(`Ide #${idx + 1} dipilih & disetujui! Format dan hook diteruskan ke Writer.`);
      reload();
    } catch (e) {
      onError(e.message);
    } finally {
      setSelecting(null);
    }
  };

  if (!stageInfo?.artifact_id) {
    return (
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
        Belum ada daftar ide. Jalankan tahap <strong>Planner (ideas)</strong> terlebih dahulu setelah Notes disetujui.
      </div>
    );
  }

  const ideas = ideasData?.videos || [];
  return (
    <div className="space-y-3">
      <div className="text-xs font-mono-tech text-violet-300">
        SERI: {ideasData?.series || "-"} • PILIH SATU IDE UNTUK DIPRODUKSI:
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ideas.map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-950/90 border border-violet-500/30 hover:border-violet-400/70 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-violet-500/20 text-violet-200 border border-violet-400/30">
                  HARI {item.day} • {item.format}
                </span>
                {item.next && <span className="text-[10px] font-mono-tech text-slate-400">Next: {item.next}</span>}
              </div>
              <h5 className="font-heading text-sm font-bold text-white">{item.title}</h5>
              <div className="text-xs text-cyan-200 bg-cyan-950/30 border border-cyan-500/20 rounded-lg p-2">
                <strong>Hook:</strong> “{item.hook}”
              </div>
              {item.angle && <p className="text-[11px] text-slate-400">{item.angle}</p>}
            </div>

            <button
              disabled={busy || selecting !== null}
              onClick={() => handleSelect(idx)}
              className="w-full py-2 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-slate-950 font-mono-tech text-xs font-bold cursor-pointer transition"
            >
              {selecting === idx ? "Menyimpan pilihan..." : "✓ PILIH IDE INI & SETUJUI"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewAuditBoard({ stageInfo, waitingReason }) {
  const [reviewData, setReviewData] = useState(null);

  useEffect(() => {
    if (!stageInfo?.artifact_id) {
      setReviewData(null);
      return;
    }
    fetch(fileUrl(stageInfo.artifact_id))
      .then((r) => r.json())
      .then(setReviewData)
      .catch(() => setReviewData(null));
  }, [stageInfo?.artifact_id, stageInfo?.version]);

  if (!stageInfo?.artifact_id) {
    return (
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
        Belum ada laporan audit. Jalankan tahap <strong>Reviewer (review)</strong> untuk memeriksa 5 kategori PRD.
      </div>
    );
  }

  const checks = reviewData?.checks || {};
  const checkLabels = [
    ["accuracy", "Accuracy (Fakta)"],
    ["storytelling", "Storytelling (Hook/Alur)"],
    ["clarity", "Clarity (≤14 kata)"],
    ["consistency", "Consistency (TTS/Gaya)"],
    ["duration", "Duration (Panjang)"],
  ];
  const items = reviewData?.feedback_items || [];
  const notPassed = waitingReason === "belum lolos review" || reviewData?.review_status === "belum lolos review";

  return (
    <div className="space-y-3">
      {notPassed && (
        <div className="bg-rose-950/70 border border-rose-500/50 rounded-xl p-3 text-xs text-rose-200 flex items-center justify-between gap-2">
          <div>
            <strong className="font-mono-tech uppercase">⚠ BELUM LOLOS REVIEW (BATAS 2 REVISI TERCAPAI)</strong>
            <p className="text-[11px] text-rose-300/90 mt-0.5">
              Anda dapat mengedit naskah manual di ruang Writer, menyetujui apa adanya (Approval 3), atau mengulangi putaran revisi.
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono-tech text-slate-300">5 KATEGORI AUDIT PRD 9F</span>
          <span
            className={`text-[11px] font-mono-tech font-bold px-2.5 py-0.5 rounded-full uppercase ${
              reviewData?.verdict === "pass"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
            }`}
          >
            VERDICT: {reviewData?.verdict || "-"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {checkLabels.map(([k, label]) => {
            const ok = checks[k];
            return (
              <div
                key={k}
                className={`rounded-lg p-2 border text-[11px] font-mono-tech ${
                  ok
                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                }`}
              >
                <div className="font-bold">{ok ? "✓ LOLOS" : "✕ PERLU REVISI"}</div>
                <div className="text-[10px] text-slate-300 mt-0.5">{label}</div>
              </div>
            );
          })}
        </div>

        {reviewData?.summary && (
          <p className="text-xs text-slate-200 bg-slate-900/90 rounded-lg p-2.5 border border-slate-800">
            {reviewData.summary}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-mono-tech text-amber-300">CATATAN PER SEGMEN ({items.length}):</div>
          {items.map((it, idx) => (
            <div key={idx} className="bg-slate-950/90 border border-amber-500/30 rounded-lg p-2.5 text-xs">
              <span className="font-mono-tech text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 mr-2">
                {it.segment_id} • {it.severity}
              </span>
              <span className="text-slate-200">{it.suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VoiceBoothPanel({ video, reload, onError, onInfo }) {
  const [voices, setVoices] = useState([]);
  const [loadingSample, setLoadingSample] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    api.voices().then(setVoices).catch(() => {});
  }, []);

  const handleVoiceChange = async (e) => {
    try {
      await api.patchVideo(video.id, { voice: e.target.value });
      onInfo(`Narator diganti ke ${e.target.value}. Jalankan ulang tahap Narrator untuk merekam ulang.`);
      reload();
    } catch (err) {
      onError(err.message);
    }
  };

  const handlePlaySample = () => {
    setLoadingSample(true);
    const a = new Audio(sampleUrl(video.voice));
    audioRef.current = a;
    a.oncanplay = () => {
      setLoadingSample(false);
      a.play();
    };
    a.onerror = () => {
      setLoadingSample(false);
      onError("Gagal memuat contoh suara (cek GEMINI_API_KEY di .env dan server backend).");
    };
  };

  const audioStage = video.stages?.audio;

  return (
    <div className="space-y-4">
      <div className="bg-slate-950/85 border border-indigo-500/30 rounded-xl p-4 space-y-3">
        <div className="text-xs font-mono-tech text-indigo-300 uppercase">PEMILIH KARAKTER NARATOR GEMINI TTS</div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={video.voice}
            onChange={handleVoiceChange}
            className="bg-slate-900 border border-slate-700 focus:border-indigo-400 rounded-lg px-3 py-2 text-xs text-white font-mono-tech"
          >
            {(voices.length ? voices : [video.voice]).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <button
            onClick={handlePlaySample}
            disabled={loadingSample}
            className="px-3.5 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-mono-tech text-xs font-bold cursor-pointer transition"
          >
            {loadingSample ? "Membuat contoh..." : "🔊 Dengar Contoh Suara"}
          </button>
        </div>
      </div>

      {audioStage?.artifact_id && (
        <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono-tech">
            <span className="text-emerald-300">REKAMAN VOICE-OVER AKTIF (v{audioStage.version})</span>
            <span className="text-slate-400 uppercase">{STATUS_LABEL[audioStage.status] || audioStage.status}</span>
          </div>
          <audio controls className="w-full" key={audioStage.artifact_id} src={fileUrl(audioStage.artifact_id)} />
        </div>
      )}
    </div>
  );
}

function ArtifactJsonViewer({ artifactId, label }) {
  const [raw, setRaw] = useState("");
  useEffect(() => {
    if (!artifactId) {
      setRaw("");
      return;
    }
    fetch(fileUrl(artifactId))
      .then((r) => r.text())
      .then(setRaw)
      .catch(() => setRaw(""));
  }, [artifactId]);

  if (!artifactId) {
    return (
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
        Belum ada artifak {label}. Klik tombol <strong>Jalankan</strong> di atas untuk membuat data tahap ini.
      </div>
    );
  }

  let summary = "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed.scenes && parsed.subtitles) {
      summary = `${parsed.scenes.length} scene • ${parsed.subtitles.length} subtitle • ${(parsed.video?.durationMs / 1000).toFixed(1)} dtk`;
    } else if (Array.isArray(parsed.words)) {
      summary = `${parsed.words.length} kata terkalibrasi`;
    } else if (parsed.topics) {
      summary = `${parsed.topics.length} topik • ${parsed.key_concepts?.length || 0} konsep kunci`;
    }
  } catch {}

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono-tech">
        <span className="text-slate-300">{label}</span>
        {summary && <span className="text-cyan-300">{summary}</span>}
      </div>
      <pre className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 font-mono-tech text-[11px] text-cyan-100 max-h-72 overflow-auto leading-relaxed">
        {raw.slice(0, 8000)}
        {raw.length > 8000 ? "\n..." : ""}
      </pre>
    </div>
  );
}

function renderTutorText(text) {
  return String(text || "")
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index} className="text-cyan-200">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <React.Fragment key={index}>{part}</React.Fragment>
      )
    );
}

function TutorLearningPanel({ video, reload, onError, onInfo, busy, onOpenNotes }) {
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const chatEndRef = useRef(null);

  const load = async () => {
    try {
      setSession(await api.getTutorSession(video.id));
    } catch (e) {
      onError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, [video.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages?.length]);

  const send = async (text) => {
    const value = (text || message).trim();
    if (!value) return;
    setSending(true);
    try {
      setSession(await api.sendTutorTurn(video.id, value));
      setMessage("");
    } catch (e) {
      onError(e.message);
    } finally {
      setSending(false);
    }
  };

  const finish = async () => {
    setFinishing(true);
    try {
      await api.finishTutorSession(video.id);
      onInfo("Sesi belajar diakhiri. Catatan sedang disusun.");
      reload();
      onOpenNotes();
    } catch (e) {
      onError(e.message);
    } finally {
      setFinishing(false);
    }
  };

  const skip = async () => {
    setFinishing(true);
    try {
      await api.finishTutorSession(video.id);
      onInfo("Sesi dilewati. Catatan sedang disusun dari materi dan analisis.");
      reload();
      onOpenNotes();
    } catch (e) {
      onError(e.message);
    } finally {
      setFinishing(false);
    }
  };

  const statusLabel = (status) =>
    status === "paham" ? "Paham" : status === "sebagian" ? "Sebagian paham" : "Belum dibahas";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
      <div className="lg:col-span-8 flex flex-col min-h-[420px] lg:min-h-0 bg-slate-950/90 border border-cyan-500/20 rounded-xl overflow-hidden">
        <div className="flex-1 min-h-[420px] p-4 space-y-4 overflow-y-auto">
          {!session?.messages?.length && (
            <div className="text-xs text-slate-400">Tutor sedang menyiapkan peta konsep...</div>
          )}
          {session?.messages?.map((item, idx) => (
            <div key={idx} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-3xl rounded-xl px-4 py-3.5 text-sm leading-7 ${
                  item.role === "user"
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-800 border border-slate-700 text-slate-100"
                }`}
              >
                <div className="text-[10px] font-mono-tech font-bold mb-1 opacity-70">
                  {item.role === "user" ? "KAMU" : "TUTOR"}
                </div>
                <div className="whitespace-pre-wrap space-y-3">{renderTutorText(item.text)}</div>
                {(item.verifikasi_tags || []).map((fact, factIdx) => (
                  <div key={factIdx} className="mt-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2 py-1.5 text-[10px] text-amber-200">
                    ⚠ Perlu Verifikasi: {fact}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-slate-800 p-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {["Belum paham, jelaskan ulang", "Kasih analogi lain", "Contohnya di kerjaan nyata?", "Lanjut konsep berikutnya"].map((label) => (
              <button
                key={label}
                disabled={sending || finishing || busy}
                onClick={() => send(label)}
                className="px-2.5 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 text-cyan-200 text-[10px] font-mono-tech hover:bg-cyan-900/40 disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Tulis pertanyaan atau sela penjelasan Tutor..."
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white"
            />
            <button
              disabled={sending || finishing || busy || !message.trim()}
              onClick={() => send()}
              className="px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold"
            >
              {sending ? "Mengirim..." : "Kirim"}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 min-h-0 overflow-y-auto space-y-3">
        <div className="bg-slate-950/90 border border-violet-500/20 rounded-xl p-3.5 space-y-2">
          <div className="text-xs font-mono-tech text-violet-300">PETA KONSEP</div>
          {(session?.concepts || []).map((concept) => (
            <div key={concept.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-100 font-semibold">{concept.name}</span>
                {concept.is_thin && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">TIPIS</span>}
              </div>
              <div className={`mt-1 text-[10px] font-mono-tech ${
                concept.status === "paham" ? "text-emerald-300" : concept.status === "sebagian" ? "text-amber-300" : "text-slate-400"
              }`}>
                {concept.status === "paham" ? "🟢" : concept.status === "sebagian" ? "🟡" : "⚪"} {statusLabel(concept.status)}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-950/90 border border-emerald-500/20 rounded-xl p-3.5">
          <div className="text-xs font-mono-tech text-emerald-300 mb-2">BANK ANALOGI</div>
          <div className="space-y-1.5">
            {[...(session?.concepts || [])].flatMap((c) => c.analogies || []).length ? (
              [...new Set([...(session?.concepts || [])].flatMap((c) => c.analogies || []))].map((analogy, idx) => (
                <div key={idx} className="text-[11px] text-slate-300 border-l-2 border-emerald-400/50 pl-2">{analogy}</div>
              ))
            ) : (
              <div className="text-[11px] text-slate-500">Analogi akan muncul setelah diskusi.</div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <button
            disabled={finishing || busy}
            onClick={finish}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-mono-tech text-xs font-bold"
          >
            {finishing ? "Menunggu..." : "✓ Akhiri Sesi & Susun Catatan"}
          </button>
          <button
            disabled={finishing || busy}
            onClick={skip}
            className="w-full py-2.5 rounded-lg border border-slate-600 hover:border-slate-400 text-slate-300 font-mono-tech text-xs"
          >
            Lewati Sesi → Langsung Susun Catatan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentWorkspaceModal({
  video,
  agentIndex,
  onClose,
  onSelectAgent,
  onRunStage,
  onApprovePoint,
  reload,
  onError,
  onInfo,
  busy,
  onFullscreenChange,
}) {
  const [tab, setTab] = useState("workspace");
  const [isFullscreen, setIsFullscreen] = useState(agentIndex === 2);
  const [text, setText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [runs, setRuns] = useState([]);
  const [openRunId, setOpenRunId] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [notesSubMode, setNotesSubMode] = useState("tutor");
  const agent = AGENT_STAGES[agentIndex];

  const isTutorMode = agent?.key === "notes" && notesSubMode === "tutor";

  useEffect(() => {
    const active = agent?.key === "notes";
    setIsFullscreen(active);
    if (onFullscreenChange) onFullscreenChange(active, agent?.key, notesSubMode);
  }, [agent?.key, agentIndex]);

  useEffect(() => {
    if (onFullscreenChange) onFullscreenChange(isFullscreen, agent?.key, notesSubMode);
  }, [isFullscreen, agent?.key, notesSubMode]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== "f") return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      event.preventDefault();
      setIsFullscreen((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const st = video?.stages?.[agent.key];
  const running = Boolean(st?.last_run && ["queued", "running"].includes(st.last_run.status));
  const canApprove = Boolean(agent.approval && st?.version && st.status === "draft");
  const canRun = Boolean(st?.can_run && !running && !busy);

  useEffect(() => {
    setDirty(false);
    if (!agent.editableText || !video || !st?.version) {
      setText("");
      return;
    }
    let off = false;
    api
      .text(video.id, agent.key)
      .then((r) => {
        if (!off) setText(r.text || "");
      })
      .catch(() => {
        if (!off) setText("");
      });
    return () => {
      off = true;
    };
  }, [video?.id, agent.key, agent.editableText, st?.version]);

  useEffect(() => {
    if (!video) return;
    api.runs(video.id).then(setRuns).catch(() => {});
  }, [video?.id, st?.last_run?.id, st?.last_run?.status]);

  useEffect(() => {
    if (agent?.key === "notes") {
      setNotesSubMode(st?.status === "approved" || st?.status === "draft" ? "notes" : "tutor");
    }
  }, [agent?.key, video?.id, st?.status]);

  if (!video || !agent) return null;

  const handleSaveText = async () => {
    try {
      await api.saveText(video.id, agent.key, text);
      onInfo(`${agent.name} disimpan sebagai versi baru. Tahap setelahnya ditandai usang bila sudah ada.`);
      setDirty(false);
      reload();
    } catch (e) {
      onError(e.message);
    }
  };

  const handleUploadMaterial = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingFile(true);
    try {
      await api.uploadMaterial(video.id, file);
      onInfo(`Dokumen "${file.name}" berhasil diekstrak dan disimpan sebagai materi baru.`);
      setDirty(false);
      reload();
    } catch (err) {
      onError(err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const wordsCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div
      data-modal="true"
      className={`fixed inset-0 z-30 flex items-center justify-center ${
        isFullscreen ? "bg-slate-950/95 backdrop-blur-md" : "bg-slate-950/75 backdrop-blur-sm p-4"
      }`}
      onClick={onClose}
    >
      <div
        className={`ops-glass flex flex-col overflow-hidden ${
          isFullscreen
            ? "w-screen h-screen max-w-none max-h-none rounded-none border-cyan-400/40 shadow-[0_0_50px_rgba(34,211,238,0.12)]"
            : "rounded-2xl w-full max-w-4xl max-h-[88vh]"
        }`}
        style={{ borderColor: `${agent.colorCss}55` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ruang Kerja Agen */}
        <div className="px-5 py-3.5 border-b border-slate-800/90 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: agent.colorCss }} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-slate-800" style={{ color: agent.colorCss }}>
                  {agent.scopeTag}
                </span>
                <h3 className="font-heading text-base md:text-lg font-bold text-white">
                  {agent.index + 1}. {agent.name} — {agent.roleTitle}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{agent.persona}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectAgent((agentIndex + AGENT_STAGES.length - 1) % AGENT_STAGES.length)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono-tech text-xs cursor-pointer"
              title="Agen sebelumnya"
            >
              ◀
            </button>
            <button
              onClick={() => onSelectAgent((agentIndex + 1) % AGENT_STAGES.length)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono-tech text-xs cursor-pointer"
              title="Agen berikutnya"
            >
              ▶
            </button>
            <button
              onClick={() => setIsFullscreen((current) => !current)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-mono-tech text-xs cursor-pointer"
              title="Toggle fullscreen (F)"
            >
              {isFullscreen ? "🗗 COMPACT [F]" : "⛶ FULLSCREEN [F]"}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono-tech text-xs cursor-pointer ml-1"
            >
              TUTUP [ESC]
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800/80 bg-slate-950/50 px-5 gap-5 font-mono-tech text-xs">
          <button
            onClick={() => setTab("workspace")}
            className={`py-2.5 border-b-2 cursor-pointer ${
              tab === "workspace" ? "border-cyan-400 text-cyan-300 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            RUANG KERJA AGEN
          </button>
          <button
            onClick={() => setTab("runs")}
            className={`py-2.5 border-b-2 cursor-pointer ${
              tab === "runs" ? "border-cyan-400 text-cyan-300 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            RIWAYAT RUN ({runs.length})
          </button>
        </div>

        {/* Body */}
        <div className={`p-5 overflow-y-auto flex-1 min-h-0 space-y-4 ${agent.key === "notes" && isTutorMode ? "flex flex-col" : ""}`}>
          {tab === "workspace" ? (
            <>
              {agent.key === "notes" && (
                <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 shrink-0">
                  <button
                    onClick={() => setNotesSubMode("tutor")}
                    className={`px-3.5 py-2 rounded-lg font-mono-tech text-xs font-bold ${
                      notesSubMode === "tutor"
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    🎓 Sesi Belajar (Tutor)
                  </button>
                  <button
                    onClick={() => setNotesSubMode("notes")}
                    className={`px-3.5 py-2 rounded-lg font-mono-tech text-xs font-bold ${
                      notesSubMode === "notes"
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    📝 Catatan & Approval 1
                  </button>
                </div>
              )}

              {agent.key === "notes" && notesSubMode === "tutor" && (
                <TutorLearningPanel
                  video={video}
                  reload={reload}
                  onError={onError}
                  onInfo={onInfo}
                  busy={busy}
                  onOpenNotes={() => setNotesSubMode("notes")}
                />
              )}

              {!(agent.key === "notes" && notesSubMode === "tutor") && (
              <>
              {/* Bar Kontrol Tahap (can_run, why_not, Approval) */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <div className="text-[10px] font-mono-tech text-slate-400 uppercase">
                    Status Tahap {agent.key} • {st?.version ? `v${st.version} (${st.source})` : "belum ada"}
                  </div>
                  <div className="text-xs font-mono-tech font-bold mt-0.5" style={{ color: agent.colorCss }}>
                    {running ? "Sedang berjalan di latar belakang..." : `Status: ${(STATUS_LABEL[st?.status] || st?.status || "empty").toUpperCase()}`}
                  </div>
                  {!running && !st?.can_run && st?.why_not && (
                    <div className="text-[11px] text-amber-300 mt-1">⚠ {st.why_not}</div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={!canRun}
                    title={st?.why_not || ""}
                    onClick={() => onRunStage(agent.key)}
                    className={`px-3.5 py-2 rounded-lg font-mono-tech text-xs font-bold transition ${
                      canRun
                        ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {running ? "Berjalan..." : st?.version ? "↻ Jalankan Ulang" : "▶ Jalankan Agen"}
                  </button>

                  {agent.approval && (
                    <button
                      disabled={!canApprove || busy}
                      onClick={() => onApprovePoint(agent.approval)}
                      className={`px-3.5 py-2 rounded-lg font-mono-tech text-xs font-bold transition ${
                        canApprove && !busy
                          ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      ✓ {agent.approvalLabel}
                    </button>
                  )}
                </div>
              </div>

              {/* Konten Spesifik Karakteristik Setiap Agen */}
              {agent.editableText && (
                <div className="flex flex-col flex-1 min-h-0 space-y-2">
                  {agent.key === "material" && (
                    <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-cyan-100">
                        <strong>Unggah Dokumen Materi</strong>{" "}
                        <span className="text-slate-400 font-mono-tech">(.docx, .pdf, .txt, .md)</span>
                      </div>
                      <label className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono-tech text-xs font-bold cursor-pointer transition">
                        {uploadingFile ? "Mengekstrak dokumen..." : "📁 Pilih File Dokumen"}
                        <input
                          type="file"
                          accept=".docx,.pdf,.txt,.md"
                          disabled={uploadingFile || busy}
                          onChange={handleUploadMaterial}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs font-mono-tech">
                    <span className="text-slate-300">
                      EDITOR {agent.name.toUpperCase()} ({agent.key})
                    </span>
                    <span className="text-slate-400">
                      {wordsCount} kata
                      {agent.key === "script" && wordsCount > 0 ? ` • ±${Math.round(wordsCount / 2.0)} dtk (kalibrasi 2,0 kata/dtk)` : ""}
                    </span>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setDirty(true);
                    }}
                    placeholder={`Tulis atau tempel isi ${agent.name.toLowerCase()} di sini...`}
                    className="flex-1 min-h-[280px] h-full w-full resize-y leading-relaxed text-sm bg-slate-950/90 border border-slate-700 focus:border-cyan-400 rounded-xl p-3.5 text-slate-100 focus:outline-none select-text"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      disabled={!dirty || !text.trim() || busy}
                      onClick={handleSaveText}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-mono-tech text-xs font-bold cursor-pointer transition"
                    >
                      Simpan sebagai versi baru
                    </button>
                    {dirty && <span className="text-xs text-amber-300 font-mono-tech">• perubahan belum disimpan</span>}
                  </div>
                </div>
              )}

              {agent.key === "analysis" && (
                <ArtifactJsonViewer artifactId={st?.artifact_id} label="HASIL PEMETAAN MATERI (analysis.json)" />
              )}

              {agent.key === "ideas" && (
                <IdeasDeck
                  video={video}
                  stageInfo={st}
                  reload={reload}
                  onError={onError}
                  onInfo={onInfo}
                  busy={busy}
                />
              )}

              {agent.key === "review" && (
                <ReviewAuditBoard stageInfo={st} waitingReason={video.waiting_approval_reason} />
              )}

              {agent.key === "audio" && (
                <VoiceBoothPanel video={video} reload={reload} onError={onError} onInfo={onInfo} />
              )}

              {agent.key === "words" && (
                <ArtifactJsonViewer artifactId={st?.artifact_id} label="KALIBRASI TIMESTAMP KATA WHISPER (words.json)" />
              )}

              {agent.key === "storyboard" && (
                <ArtifactJsonViewer artifactId={st?.artifact_id} label="STORYBOARD JSON SCHEMA v1.3" />
              )}

              {agent.key === "render" && (
                <div className="space-y-3">
                  {st?.artifact_id ? (
                    <div className="bg-slate-950/90 border border-orange-500/30 rounded-xl p-4 flex flex-col items-center gap-3">
                      <div className="w-full flex items-center justify-between text-xs font-mono-tech">
                        <span className="text-orange-300">HASIL RENDER FINAL MP4 (1080×1920)</span>
                        <span className="text-slate-400">v{st.version}</span>
                      </div>
                      <video
                        controls
                        className="max-h-[420px] rounded-xl border border-slate-800 bg-black"
                        key={st.artifact_id}
                        src={fileUrl(st.artifact_id)}
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                      Video MP4 belum dirender. Jalankan tahap <strong>Renderer</strong> setelah Storyboard selesai (WebGL otomatis masuk Sleep Mode selama rendering).
                    </div>
                  )}
                </div>
              )}
              </>
              )}
            </>
          ) : (
            /* Tab Riwayat Run */
            <div className="space-y-2">
              {!runs.length ? (
                <div className="text-xs text-slate-400">Belum ada riwayat eksekusi untuk video ini.</div>
              ) : (
                runs.map((r) => (
                  <div key={r.id} className="bg-slate-950/85 border border-slate-800 rounded-xl overflow-hidden">
                    <div
                      onClick={() => setOpenRunId(openRunId === r.id ? null : r.id)}
                      className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 font-mono-tech text-xs"
                    >
                      <span>
                        #{r.id} • <strong>{r.stage}</strong>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          r.status === "succeeded"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : r.status === "failed"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-cyan-500/20 text-cyan-300"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    {openRunId === r.id && (
                      <pre className="p-3.5 border-t border-slate-800 text-[11px] font-mono-tech text-slate-300 overflow-x-auto max-h-60">
                        {r.log || "(log kosong)"}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}