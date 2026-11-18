import React, { useCallback, useEffect, useRef, useState } from "react";
import { api, fileUrl, sampleUrl } from "./api.js";

const STAGES = [
  { key: "notes", label: "Catatan", approval: "notes", manual: true },
  { key: "script", label: "Naskah", approval: "script" },
  { key: "audio", label: "Suara", approval: "audio" },
  { key: "words", label: "Waktu kata" },
  { key: "storyboard", label: "Storyboard" },
  { key: "render", label: "Video", approval: "video" },
];

const STATUS_LABEL = { empty: "kosong", draft: "draf", approved: "disetujui", stale: "usang" };

function Chip({ status }) {
  return <span className={`chip chip-${status}`}>{STATUS_LABEL[status] || status}</span>;
}

function Dots({ stages }) {
  return (
    <span className="dots">
      {STAGES.map((s) => (
        <i key={s.key} className={`dot dot-${stages[s.key]?.status || "empty"}`} title={s.label} />
      ))}
    </span>
  );
}

function NewVideo({ onCreated, onError }) {
  const [f, setF] = useState({ name: "", day: 1, title: "", next_topic: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try {
      const v = await api.createVideo({ ...f, day: Number(f.day) || 1 });
      setF({ name: "", day: (Number(f.day) || 1) + 1, title: "", next_topic: "" });
      onCreated(v);
    } catch (err) {
      onError(err.message);
    }
  };
  return (
    <form className="newvideo" onSubmit={submit}>
      <h3>Video baru</h3>
      <input placeholder="nama-file (tanpa spasi)" value={f.name} onChange={set("name")} required pattern="[a-z0-9\-]+" title="huruf kecil, angka, dan tanda minus" />
      <input type="number" min="1" placeholder="Hari ke-" value={f.day} onChange={set("day")} />
      <input placeholder="Judul" value={f.title} onChange={set("title")} />
      <input placeholder="Topik besok (untuk teaser)" value={f.next_topic} onChange={set("next_topic")} />
      <button className="btn primary">Tambah</button>
    </form>
  );
}

function TextEditor({ video, stage, title, reload, onError, onInfo }) {
  const [text, setText] = useState("");
  const [meta, setMeta] = useState(null);
  const [dirty, setDirty] = useState(false);
  const info = video.stages[stage];
  useEffect(() => {
    let off = false;
    setDirty(false);
    if (!info.version) {
      setText("");
      setMeta(null);
      return;
    }
    api
      .text(video.id, stage)
      .then((r) => {
        if (!off) {
          setText(r.text);
          setMeta(r);
        }
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [video.id, stage, info.version]);
  const save = async () => {
    try {
      await api.saveText(video.id, stage, text);
      onInfo(`${title} disimpan sebagai versi baru. Tahap setelahnya ditandai usang bila sudah ada.`);
      setDirty(false);
      reload();
    } catch (e) {
      onError(e.message);
    }
  };
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
        <span className="muted">
          {info.version ? `v${info.version}` : "belum ada"} · {words} kata{stage === "script" && words ? ` · ±${Math.round(words / 2.5)} dtk` : ""}
        </span>
      </div>
      <textarea value={text} onChange={(e) => { setText(e.target.value); setDirty(true); }} rows={stage === "script" ? 9 : 7} placeholder={`Tulis atau tempel ${title.toLowerCase()} di sini...`} />
      <div className="row">
        <button className="btn" disabled={!dirty || !text.trim()} onClick={save}>Simpan versi baru</button>
        {dirty && <span className="muted">belum disimpan</span>}
      </div>
    </section>
  );
}

function StoryboardView({ info }) {
  const [txt, setTxt] = useState("");
  useEffect(() => {
    if (!info.artifact_id) return setTxt("");
    fetch(fileUrl(info.artifact_id)).then((r) => r.text()).then(setTxt).catch(() => setTxt(""));
  }, [info.artifact_id]);
  if (!info.artifact_id) return null;
  let sum = "";
  try {
    const j = JSON.parse(txt);
    sum = `${j.scenes.length} scene · ${j.subtitles.length} subtitle · ${(j.video.durationMs / 1000).toFixed(1)} dtk`;
  } catch {}
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Storyboard</h3>
        <span className="muted">{sum}</span>
      </div>
      <pre className="code">{txt.slice(0, 6000)}{txt.length > 6000 ? "\n..." : ""}</pre>
    </section>
  );
}

function VoicePicker({ video, reload, onError, onInfo }) {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const audio = useRef(null);
  useEffect(() => { api.voices().then(setVoices).catch(() => {}); }, []);
  const change = async (e) => {
    try {
      await api.patchVideo(video.id, { voice: e.target.value });
      onInfo("Narator diganti. Buat ulang suara supaya memakai narator baru.");
      reload();
    } catch (err) { onError(err.message); }
  };
  const play = () => {
    setLoading(true);
    const a = new Audio(sampleUrl(video.voice));
    audio.current = a;
    a.oncanplay = () => { setLoading(false); a.play(); };
    a.onerror = () => { setLoading(false); onError("Gagal memuat contoh suara (cek GEMINI_API_KEY di .env dan server backend)."); };
  };
  return (
    <div className="voice">
      <label>Narator</label>
      <select value={video.voice} onChange={change}>
        {voices.map((v) => <option key={v}>{v}</option>)}
      </select>
      <button className="btn" onClick={play} disabled={loading}>{loading ? "Membuat contoh..." : "Dengar contoh"}</button>
    </div>
  );
}

function Pipeline({ video, act, busy }) {
  return (
    <div className="pipeline">
      {STAGES.map((s) => {
        const st = video.stages[s.key];
        const running = st.last_run && ["queued", "running"].includes(st.last_run.status);
        const canApprove = s.approval && st.version && st.status === "draft";
        return (
          <div key={s.key} className={`step step-${st.status}`}>
            <div className="step-top">
              <b>{s.label}</b>
              <Chip status={st.status} />
            </div>
            <div className="muted small">
              {st.version ? `v${st.version} · ${st.source === "manual" ? "manual" : st.source === "imported" ? "diimpor" : "otomatis"}` : "belum ada"}
            </div>
            <div className="step-actions">
              {!s.manual && (
                <button className="btn small-btn" disabled={busy || running || !st.can_run} title={st.why_not} onClick={() => act("run", s.key)}>
                  {running ? "Berjalan..." : st.version ? "Ulangi" : "Jalankan"}
                </button>
              )}
              {s.approval && (
                <button className="btn small-btn ok" disabled={!canApprove} onClick={() => act("approve", s.approval)}>
                  Setujui
                </button>
              )}
            </div>
            {!s.manual && !st.can_run && st.why_not && !running && <div className="why small">{st.why_not}</div>}
            {st.last_run?.status === "failed" && <div className="why small bad">tahap terakhir gagal</div>}
          </div>
        );
      })}
    </div>
  );
}

function Runs({ videoId, tick }) {
  const [runs, setRuns] = useState([]);
  const [open, setOpen] = useState(null);
  useEffect(() => { api.runs(videoId).then(setRuns).catch(() => {}); }, [videoId, tick]);
  if (!runs.length) return null;
  return (
    <section className="panel">
      <div className="panel-head"><h3>Riwayat menjalankan</h3></div>
      {runs.map((r) => (
        <div key={r.id} className="run">
          <div className="run-head" onClick={() => setOpen(open === r.id ? null : r.id)}>
            <span>#{r.id} {r.stage}</span>
            <span className={`chip chip-run-${r.status}`}>{r.status}</span>
          </div>
          {open === r.id && <pre className="code">{r.log || "(log kosong)"}</pre>}
        </div>
      ))}
    </section>
  );
}

export default function App() {
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const error = (m) => setToast({ kind: "error", text: m });
  const info = (m) => setToast({ kind: "info", text: m });

  const load = useCallback(async () => {
    try {
      const v = await api.videos();
      setVideos(v);
      setTick((t) => t + 1);
      return v;
    } catch (e) {
      error(e.message);
      return [];
    }
  }, []);

  useEffect(() => { load().then((v) => v.length && setSelected((s) => s ?? v[0].id)); }, [load]);

  const video = videos.find((v) => v.id === selected);
  const anyRunning = video && Object.values(video.stages).some((s) => s.last_run && ["queued", "running"].includes(s.last_run.status));
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [anyRunning, load]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 7000); return () => clearTimeout(t); } }, [toast]);

  const act = async (kind, arg) => {
    setBusy(true);
    try {
      if (kind === "run") { await api.run(video.id, arg); info(`Tahap ${arg} dimulai...`); }
      else { await api.approve(video.id, arg); info(`Titik persetujuan "${arg}" disetujui.`); }
      await load();
    } catch (e) { error(e.message); }
    setBusy(false);
  };

  const scan = async () => {
    try {
      const r = await api.scan(video.id);
      info(r.registered.length ? `Terdaftar: ${r.registered.join(", ")}` : "Tidak ada file baru yang ditemukan.");
      load();
    } catch (e) { error(e.message); }
  };

  return (
    <div className="app">
      <aside className="side">
        <h1>Video Studio</h1>
        <div className="vlist">
          {videos.map((v) => (
            <button key={v.id} className={`vitem ${v.id === selected ? "active" : ""}`} onClick={() => setSelected(v.id)}>
              <span className="vday">Hari {v.day}</span>
              <span className="vname">{v.title || v.name}</span>
              <Dots stages={v.stages} />
            </button>
          ))}
          {!videos.length && <p className="muted">Belum ada video.</p>}
        </div>
        <NewVideo onCreated={(v) => { load(); setSelected(v.id); }} onError={error} />
      </aside>

      <main className="main">
        {toast && <div className={`toast ${toast.kind}`} onClick={() => setToast(null)}>{toast.text}</div>}
        {!video ? (
          <div className="empty"><h2>Pilih atau buat video</h2><p className="muted">Mulai dari "Video baru" di kiri.</p></div>
        ) : (
          <>
            <header className="vhead">
              <div>
                <h2>{video.title || video.name}</h2>
                <div className="muted">Hari {video.day} · {video.name}{video.next_topic ? ` · besok: ${video.next_topic}` : ""}</div>
              </div>
              <div className="vhead-actions">
                <VoicePicker video={video} reload={load} onError={error} onInfo={info} />
                <button className="btn" onClick={scan} title="Daftarkan file yang sudah ada di folder proyek (mis. hasil pipeline.py)">Scan file yang ada</button>
              </div>
            </header>

            <Pipeline video={video} act={act} busy={busy} />

            <div className="grid">
              <TextEditor video={video} stage="notes" title="Catatan belajar" reload={load} onError={error} onInfo={info} />
              <TextEditor video={video} stage="script" title="Naskah" reload={load} onError={error} onInfo={info} />
            </div>

            {video.stages.audio.artifact_id && (
              <section className="panel">
                <div className="panel-head"><h3>Suara</h3><Chip status={video.stages.audio.status} /></div>
                <audio controls key={video.stages.audio.artifact_id} src={fileUrl(video.stages.audio.artifact_id)} />
              </section>
            )}
            <StoryboardView info={video.stages.storyboard} />
            {video.stages.render.artifact_id && (
              <section className="panel">
                <div className="panel-head"><h3>Video</h3><Chip status={video.stages.render.status} /></div>
                <video controls className="player" key={video.stages.render.artifact_id} src={fileUrl(video.stages.render.artifact_id)} />
              </section>
            )}
            <Runs videoId={video.id} tick={tick} />
          </>
        )}
      </main>
    </div>
  );
}
