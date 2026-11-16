export type Subtitle = { id: string; startMs: number; endMs: number; text: string };

export type Scene = {
  id: string;
  startMs: number;
  durationMs: number;
  component: string;
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
