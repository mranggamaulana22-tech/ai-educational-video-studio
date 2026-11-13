import data from "./storyboards/html-css-js.json";

export type Subtitle = { id: string; startMs: number; endMs: number; text: string };

export type Scene = {
  id: string;
  startMs: number;
  durationMs: number;
  component: string;
  props: Record<string, unknown>;
};

export type Storyboard = {
  schemaVersion: string;
  video: { title: string; width: number; height: number; fps: number; durationMs: number };
  audio: { src: string; durationMs: number };
  scenes: Scene[];
  subtitles: Subtitle[];
};

export const storyboard = data as Storyboard;