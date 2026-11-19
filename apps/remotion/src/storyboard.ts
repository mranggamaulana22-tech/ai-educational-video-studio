export type Subtitle = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  // Waktu mulai tiap kata (ms), urutan sama dengan kata di teks. Diisi tools/apply_word_times.py.
  // Kalau kosong, waktu kata diperkirakan dari panjang huruf.
  wordStartsMs?: number[];
};

export type Scene = {
  id: string;
  startMs: number;
  durationMs: number;
  // Kontrak v1.3 memakai componentId + componentVersion (diisi sistem/resolver).
  // Field "component" dipertahankan opsional untuk kompatibilitas storyboard v1.1.
  componentId?: string;
  componentVersion?: string;
  component?: string;
  props: Record<string, unknown>;
  transition?: "none" | "fade" | "slide" | "zoom" | "wipe";
};

export type Storyboard = {
  schemaVersion: string;
  video: {
    title: string;
    width: number;
    height: number;
    fps: number;
    durationMs: number;
    theme?: "classic" | "v2";
    // Lencana kecil di atas layar, mis. "HARI 1/15 | Intro to Software Engineering".
    badge?: { day: string; course: string };
  };
  audio: { src: string; durationMs: number };
  scenes: Scene[];
  subtitles: Subtitle[];
};