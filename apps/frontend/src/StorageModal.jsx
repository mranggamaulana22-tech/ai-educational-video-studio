import React, { useEffect, useMemo, useState } from "react";
import { API, api } from "./api.js";

export default function StorageModal({ onClose, onSwitchProject, onDeleted, onError, onInfo }) {
  const [tab, setTab] = useState("projects");
  const [overview, setOverview] = useState({ projects: [], archives: [] });
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteArmedId, setDeleteArmedId] = useState(null);
  const [deleteArchiveArmedFolder, setDeleteArchiveArmedFolder] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getStorageOverview();
      setOverview(data);
      if (!selectedProjectId && data.projects.length) {
        setSelectedProjectId(data.projects[0].video_id);
      }
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const selectedProject = useMemo(
    () => overview.projects.find((project) => project.video_id === selectedProjectId) || null,
    [overview.projects, selectedProjectId]
  );

  const selectProject = (project) => {
    setSelectedProjectId(project.video_id);
    setSelectedFile(null);
    setPreview(null);
  };

  const openPreview = async (file) => {
    if (!selectedProject) {
      return;
    }
    setSelectedFile(file);
    setPreview(null);
    try {
      setPreview(await api.previewStorageFile(selectedProject.video_id, file.key));
    } catch (error) {
      onError(error.message);
    }
  };

  const archiveProject = async (project) => {
    setLoading(true);
    try {
      const result = await api.archiveProject(project.video_id);
      onInfo(`Proyek "${project.title}" diarsipkan ke ${result.folder}.`);
      await load();
      setSelectedFile(null);
      setPreview(null);
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (project) => {
    if (deleteArmedId !== project.video_id) {
      setDeleteArmedId(project.video_id);
      onInfo(`Konfirmasi terakhir: tekan HAPUS lagi untuk "${project.title}".`);
      return;
    }
    setLoading(true);
    try {
      await api.deleteProject(project.video_id);
      setDeleteArmedId(null);
      onDeleted(project.video_id);
      onInfo(`Proyek "${project.title}" dan file aktifnya dihapus.`);
      setSelectedProjectId(null);
      await load();
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteArchive = async (archive) => {
    if (deleteArchiveArmedFolder !== archive.folder) {
      setDeleteArchiveArmedFolder(archive.folder);
      onInfo(`Konfirmasi terakhir: tekan HAPUS ARSIP lagi untuk "${archive.folder}".`);
      return;
    }
    setLoading(true);
    try {
      await api.deleteArchive(archive.folder);
      setDeleteArchiveArmedFolder(null);
      onInfo(`Arsip "${archive.folder}" telah dihapus permanen.`);
      await load();
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-modal="true"
      className="fixed inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="ops-glass flex flex-col w-full max-w-6xl h-[86vh] max-h-[860px] overflow-hidden rounded-2xl border border-cyan-400/30"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
          <div>
            <div className="text-[10px] font-mono-tech text-cyan-300">STORAGE VAULT // PROJECT ARTIFACTS</div>
            <h2 className="text-lg font-heading font-bold text-white">Gudang Proyek</h2>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono-tech hover:bg-slate-700">
            TUTUP [ESC]
          </button>
        </header>

        <div className="flex border-b border-slate-800 px-5 gap-5 font-mono-tech text-xs">
          <button
            onClick={() => setTab("projects")}
            className={`py-2.5 border-b-2 ${tab === "projects" ? "border-cyan-400 text-cyan-300 font-bold" : "border-transparent text-slate-400"}`}
          >
            PROYEK AKTIF ({overview.projects.length})
          </button>
          <button
            onClick={() => setTab("archives")}
            className={`py-2.5 border-b-2 ${tab === "archives" ? "border-cyan-400 text-cyan-300 font-bold" : "border-transparent text-slate-400"}`}
          >
            ARSIP ({overview.archives.length})
          </button>
        </div>

        {tab === "projects" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] flex-1 min-h-0">
            <aside className="border-r border-slate-800 p-3 space-y-2 overflow-y-auto">
              {overview.projects.map((project) => (
                <div
                  key={project.video_id}
                  className={`rounded-xl border p-3 space-y-2 ${
                    selectedProjectId === project.video_id
                      ? "border-cyan-400/60 bg-cyan-950/25"
                      : "border-slate-800 bg-slate-950/70"
                  }`}
                >
                  <button onClick={() => selectProject(project)} className="w-full text-left">
                    <div className="text-[10px] font-mono-tech text-slate-500">HARI {project.day} // ID {project.video_id}</div>
                    <div className="text-sm font-bold text-white mt-0.5">{project.title}</div>
                    <div className="text-[10px] font-mono-tech text-cyan-300 mt-1">{project.slug}</div>
                  </button>
                  <button
                    onClick={() => {
                      onSwitchProject(project.video_id);
                      onClose();
                    }}
                    className="w-full py-1.5 rounded-lg border border-cyan-500/30 text-cyan-200 text-[10px] font-mono-tech hover:bg-cyan-950/40"
                  >
                    ⇄ QUICK-SWITCH PROYEK
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={loading}
                      onClick={() => archiveProject(project)}
                      className="py-1.5 rounded-lg border border-amber-400/40 text-amber-200 text-[10px] font-mono-tech hover:bg-amber-950/30 disabled:opacity-50"
                    >
                      📦 Arsipkan
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => deleteProject(project)}
                      className={`py-1.5 rounded-lg border text-[10px] font-mono-tech disabled:opacity-50 ${
                        deleteArmedId === project.video_id
                          ? "border-rose-300 bg-rose-500 text-white"
                          : "border-rose-400/40 text-rose-200 hover:bg-rose-950/30"
                      }`}
                    >
                      {deleteArmedId === project.video_id ? "⚠ Konfirmasi Hapus" : "🗑 Hapus"}
                    </button>
                  </div>
                </div>
              ))}
              {!overview.projects.length && (
                <div className="text-xs text-slate-500 p-3">Belum ada proyek aktif.</div>
              )}
            </aside>

            <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] min-h-0">
              <section className="border-r border-slate-800 p-3 overflow-y-auto">
                <div className="text-xs font-mono-tech text-cyan-300 mb-2">FILE HASIL GENERATE</div>
                {selectedProject ? (
                  <div className="space-y-1.5">
                    {selectedProject.files.map((file) => (
                      <button
                        key={file.key}
                        onClick={() => openPreview(file)}
                        className={`w-full text-left rounded-lg border p-2.5 ${
                          selectedFile?.key === file.key
                            ? "border-cyan-400/60 bg-cyan-950/25"
                            : "border-slate-800 bg-slate-950/60 hover:border-slate-600"
                        } disabled:opacity-60`}
                      >
                        <div className="text-xs text-white">{file.label}</div>
                        <div className="text-[10px] font-mono-tech text-slate-400 mt-1 break-all">{file.name}</div>
                        <div className="text-[9px] font-mono-tech text-slate-500 mt-1">
                          {file.size_bytes.toLocaleString("id-ID")} bytes
                        </div>
                      </button>
                    ))}
                    {!selectedProject.files.length && (
                      <div className="text-xs text-slate-500">Belum ada file proyek.</div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Pilih proyek aktif.</div>
                )}
              </section>

              <section className="p-4 min-h-0 overflow-y-auto bg-slate-950/40">
                <div className="text-xs font-mono-tech text-violet-300 mb-3">PRATINJAU</div>
                {!preview && <div className="text-xs text-slate-500">Pilih file untuk melihat isi.</div>}
                {preview?.kind === "text" && (
                  <div>
                    <div className="text-[10px] font-mono-tech text-slate-400 mb-2">{preview.name}</div>
                    <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-200 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 select-text">
                      {preview.content}
                    </pre>
                  </div>
                )}
                {preview?.kind === "media" && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono-tech text-slate-400">{preview.name}</div>
                    {preview.key === "audio" ? (
                      <audio controls className="w-full" src={`${API}${preview.media_url}`} />
                    ) : (
                      <video controls className="w-full max-h-[520px] rounded-xl border border-slate-800" src={`${API}${preview.media_url}`} />
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3">
            {overview.archives.map((archive) => (
              <div key={archive.folder} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-white font-bold">{archive.manifest.title || archive.folder}</div>
                    <div className="text-[10px] font-mono-tech text-cyan-300 mt-1">{archive.folder}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {archive.manifest.archived_at && (
                      <div className="text-[10px] font-mono-tech text-slate-500">{archive.manifest.archived_at}</div>
                    )}
                    <button
                      disabled={loading}
                      onClick={() => deleteArchive(archive)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg border text-[10px] font-mono-tech disabled:opacity-50 ${
                        deleteArchiveArmedFolder === archive.folder
                          ? "border-rose-300 bg-rose-500 text-white"
                          : "border-rose-400/40 text-rose-200 hover:bg-rose-950/30"
                      }`}
                    >
                      {deleteArchiveArmedFolder === archive.folder ? "⚠ Konfirmasi Hapus Arsip" : "🗑 Hapus Arsip"}
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {archive.files.map((file) => (
                    <div key={file.path} className="rounded-lg border border-slate-800 p-2 text-[10px] font-mono-tech text-slate-300">
                      <div className="break-all">{file.path}</div>
                      <div className="text-slate-500 mt-1">{file.size_bytes.toLocaleString("id-ID")} bytes</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!overview.archives.length && (
              <div className="text-xs text-slate-500">Belum ada arsip.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
