import React, { useRef, useState } from "react";

// Kartu isian "proyek baru": judul + bahan belajar (file atau teks). Murni tampilan.
// Validasi dan penolakan ditangani FelisaRoom.startProject (lewat onSubmit).

export default function FelisaIntakeCard({ lang = "id", accent = "#22d3ee", busy, error, onSubmit, onCancel }) {
  const en = lang === "en";
  const t = (id, eng) => (en ? eng : id);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const submit = (event) => {
    event.preventDefault();
    if (busy) return;
    onSubmit?.({ title, text, file });
  };

  return (
    <form
      onSubmit={submit}
      className="flex h-[clamp(300px,calc(100vh-300px),560px)] flex-col gap-2.5 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/70 p-3.5"
      aria-label={t("Proyek baru", "New project")}
    >
      <div className="font-mono-tech text-[9px] uppercase tracking-[.14em]" style={{ color: accent }}>
        {t("PROYEK BARU // BRIEFING FELISA", "NEW PROJECT // FELISA BRIEFING")}
      </div>
      <p className="text-xs leading-relaxed text-slate-200">
        {t(
          "Oke Bos, aku butuh dua hal dulu: judul proyek dan bahan belajarnya. Setelah itu aku jalan sendiri dan kabari kalau ada masalah atau butuh persetujuanmu.",
          "Okay Boss, I need two things first: the project title and the study material. After that I run on my own and tell you if something breaks or I need your approval.",
        )}
      </p>

      <label className="block">
        <span className="mb-1 block font-mono-tech text-[10px] uppercase tracking-wider text-slate-400">
          {t("Judul proyek", "Project title")}
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder={t("mis. Hari 2: SDLC", "e.g. Day 2: SDLC")}
          aria-label={t("Judul proyek", "Project title")}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
        />
      </label>

      <div>
        <span className="mb-1 block font-mono-tech text-[10px] uppercase tracking-wider text-slate-400">
          {t("Bahan belajar", "Study material")}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept=".docx,.pdf,.txt,.md"
          className="hidden"
          aria-label={t("Pilih file bahan", "Choose material file")}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="shrink-0 rounded-lg border border-cyan-400/30 bg-cyan-950/50 px-2.5 py-1.5 font-mono-tech text-[10px] text-cyan-100 hover:border-cyan-300/60"
          >
            {t("Pilih file…", "Choose file…")}
          </button>
          <span className="min-w-0 flex-1 truncate font-mono-tech text-[10px] text-slate-400">
            {file ? file.name : ".docx · .pdf · .txt · .md"}
          </span>
          {file && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="shrink-0 font-mono-tech text-[10px] text-slate-500 hover:text-slate-300"
              aria-label={t("Hapus file", "Remove file")}
            >
              ✕
            </button>
          )}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          disabled={Boolean(file)}
          placeholder={file ? t("File dipakai sebagai bahan.", "The file is used as material.") : t("…atau tempel catatan belajar di sini", "…or paste your study notes here")}
          aria-label={t("Teks bahan", "Material text")}
          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60 disabled:opacity-50"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-400/40 bg-rose-950/40 px-3 py-2 text-[11px] leading-snug text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-auto flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 font-mono-tech text-[11px] text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        >
          {t("Batal", "Cancel")}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-cyan-400 px-4 py-2 font-mono-tech text-[11px] font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
        >
          {busy ? t("Memulai…", "Starting…") : t("Mulai produksi", "Start production")}
        </button>
      </div>
    </form>
  );
}