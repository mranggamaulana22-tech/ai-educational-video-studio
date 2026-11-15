import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { msToFrames } from "./components";
import type { Subtitle } from "./storyboard";
import { theme } from "./theme";

// Setelan yang bisa diubah:
const MIN_READ_MS = 850; // potongan minimal tampil sekian ms
const MAX_WORDS = 4; // maksimal kata per potongan
const MAX_CHARS = 22; // maksimal huruf per potongan
const FONT_SIZE = 84;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const WORD_SPRING = { damping: 14, stiffness: 190, mass: 0.6 };
const PUNCT = /[,.;:!?]["”']?$/;

const letters = (w: string) => w.replace(/[^A-Za-z0-9\u00C0-\u00FF]/g, "").length;
// Taksiran bobot waktu per kata (sementara sampai ada timing asli di Fase 4).
const weightOf = (w: string) => Math.max(2, letters(w)) + (PUNCT.test(w) ? 3 : 0);

type Item = { text: string; start: number };
type Chunk = { from: number; to: number; items: Item[] };

const buildChunks = (words: string[], starts: number[], totalFrames: number, fps: number): Chunk[] => {
  const minF = Math.round((MIN_READ_MS / 1000) * fps);
  const chunks: Chunk[] = [];
  let cur: Chunk | null = null;
  let chars = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const s = starts[i];
    const e = i < words.length - 1 ? starts[i + 1] : totalFrames;

    if (cur) {
      const dur = cur.to - cur.from;
      const full = cur.items.length >= MAX_WORDS || chars + 1 + w.length > MAX_CHARS;
      const longEnough = dur >= minF;
      const clauseEnd = PUNCT.test(cur.items[cur.items.length - 1].text) && dur >= minF * 0.6;
      if (full || longEnough || clauseEnd) {
        chunks.push(cur);
        cur = null;
      }
    }
    if (!cur) {
      cur = { from: s, to: e, items: [{ text: w, start: s }] };
      chars = w.length;
    } else {
      cur.items.push({ text: w, start: s });
      cur.to = e;
      chars += 1 + w.length;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
};

const OUTLINE =
  "-3px -3px 0 rgba(0,0,0,0.85), 3px -3px 0 rgba(0,0,0,0.85), -3px 3px 0 rgba(0,0,0,0.85), 3px 3px 0 rgba(0,0,0,0.85), 0 8px 22px rgba(0,0,0,0.55)";

const ChunkView: React.FC<{ chunk: Chunk }> = ({ chunk }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < chunk.from || frame >= chunk.to) return null;

  const fade = interpolate(frame, [chunk.to - 3, chunk.to], [1, 0], clamp);
  let active = 0;
  chunk.items.forEach((it, i) => {
    if (frame >= it.start) active = i;
  });
  const size = chunk.items.reduce((n, it) => n + it.text.length + 1, 0) > 18 ? FONT_SIZE - 8 : FONT_SIZE;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: 22,
        rowGap: 4,
        width: 940,
        opacity: fade,
      }}
    >
      {chunk.items.map((it, i) => {
        const shown = frame >= it.start;
        const p = spring({ frame: Math.max(0, frame - it.start), fps, config: WORD_SPRING });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: shown ? interpolate(frame, [it.start, it.start + 3], [0, 1], clamp) : 0,
              transform: `translateY(${(1 - p) * 22}px) scale(${0.85 + 0.15 * p})`,
              color: i === active ? theme.colors.yellow : "#ffffff",
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1.2,
              textShadow: OUTLINE,
            }}
          >
            {it.text}
          </span>
        );
      })}
    </div>
  );
};

const Sentence: React.FC<{ text: string; totalFrames: number }> = ({ text, totalFrames }) => {
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const weights = words.map(weightOf);
  const total = weights.reduce((a, b) => a + b, 0);

  const starts: number[] = [];
  let acc = 0;
  weights.forEach((w) => {
    starts.push(Math.round((acc / total) * totalFrames));
    acc += w;
  });

  const chunks = buildChunks(words, starts, totalFrames, fps);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: theme.safe.bottom + 40,
        fontFamily: theme.font.sans,
      }}
    >
      {chunks.map((c, i) => (
        <AbsoluteFill
          key={i}
          style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: theme.safe.bottom + 40 }}
        >
          <ChunkView chunk={c} />
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

export const KineticTrack: React.FC<{ subtitles: Subtitle[] }> = ({ subtitles }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {subtitles.map((s) => {
        const from = msToFrames(s.startMs, fps);
        const dur = Math.max(1, msToFrames(s.endMs, fps) - from);
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur}>
            <Sentence text={s.text} totalFrames={dur} />
          </Sequence>
        );
      })}
    </>
  );
};