import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Subtitle } from "./storyboard";
import { msToFrames } from "./components";
import { theme } from "./theme";

const COLORS: Record<string, string> = {
  teal: theme.colors.cyan,
  orange: theme.colors.orange,
  violet: theme.colors.violet,
  red: theme.colors.red,
};

type Word = { text: string; color?: string; startMs: number };

const MAX_WORDS = 4;
const MAX_CHARS = 24;

// Pecah teks jadi kata. Penanda {{warna:teks}} mewarnai kata di dalamnya.
const parseWords = (text: string) => {
  const out: { text: string; color?: string }[] = [];
  const re = /\{\{(\w+):([^}]+)\}\}|\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) {
      const c = COLORS[m[1]];
      m[2].split(/\s+/).forEach((w) => w && out.push({ text: w, color: c }));
    } else {
      out.push({ text: m[0] });
    }
  }
  return out;
};

// Bagi satu subtitle jadi potongan pendek; waktu tiap kata diperkirakan dari panjang huruf.
const buildChunks = (s: Subtitle) => {
  const words = parseWords(s.text);
  const weights = words.map((w) => w.text.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  const dur = s.endMs - s.startMs;
  let acc = 0;
  const timed: Word[] = words.map((w, i) => {
    const startMs = s.startMs + (dur * acc) / total;
    acc += weights[i];
    return { ...w, startMs };
  });

  const groups: Word[][] = [];
  let cur: Word[] = [];
  let chars = 0;
  timed.forEach((w) => {
    if (cur.length && (cur.length >= MAX_WORDS || chars + w.text.length > MAX_CHARS)) {
      groups.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(w);
    chars += w.text.length + 1;
    if (/[,.?!:]$/.test(w.text)) {
      groups.push(cur);
      cur = [];
      chars = 0;
    }
  });
  if (cur.length) groups.push(cur);

  return groups.map((ws, i) => ({
    words: ws,
    startMs: ws[0].startMs,
    endMs: i < groups.length - 1 ? groups[i + 1][0].startMs : s.endMs,
  }));
};

const Chunk: React.FC<{ words: Word[]; startMs: number }> = ({ words, startMs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = words.map((w) => msToFrames(w.startMs - startMs, fps));
  let current = -1;
  rel.forEach((r, i) => {
    if (frame >= r) current = i;
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 630,
        paddingLeft: theme.safe.side,
        paddingRight: theme.safe.side,
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontFamily: theme.font.sans,
          fontWeight: 700,
          fontSize: 78,
          lineHeight: 1.2,
          maxWidth: 940,
        }}
      >
        {words.map((w, i) => {
          const local = frame - rel[i];
          const shown = local >= 0;
          const pop = spring({ frame: Math.max(0, local), fps, config: theme.motion.pop });
          const scale = shown ? interpolate(pop, [0, 1], [0.75, 1]) : 0.75;
          const color = i === current ? theme.colors.yellow : w.color ?? "#ffffff";
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                visibility: shown ? "visible" : "hidden",
                transform: `scale(${scale})`,
                color,
                marginRight: 18,
                WebkitTextStroke: `10px ${theme.colors.ink}`,
                paintOrder: "stroke fill",
                textShadow: "0 6px 0 rgba(0,0,0,0.25)",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const FunSubtitleTrack: React.FC<{ subtitles: Subtitle[] }> = ({ subtitles }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {subtitles.flatMap((s) =>
        buildChunks(s).map((c, i) => {
          const from = msToFrames(c.startMs, fps);
          const dur = Math.max(1, msToFrames(c.endMs, fps) - from);
          return (
            <Sequence key={`${s.id}-${i}`} from={from} durationInFrames={dur}>
              <Chunk words={c.words} startMs={c.startMs} />
            </Sequence>
          );
        })
      )}
    </>
  );
};