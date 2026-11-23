import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FONT = "Arial, Helvetica, sans-serif";
const MONO = "Consolas, 'Courier New', monospace";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const msToFrames = (ms: number, fps: number) => Math.round((ms * fps) / 1000);

export const Background: React.FC = () => (
  <AbsoluteFill
    style={{ background: "linear-gradient(160deg, #1f3a5f 0%, #0b1220 70%)" }}
  />
);

export const TitleReveal: React.FC<{
  title: string;
  subtitle?: string;
  delayMs?: number;
}> = ({ title, subtitle, delayMs = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = msToFrames(delayMs, fps);
  const s = spring({ frame: Math.max(0, frame - start), fps, config: { damping: 14 } });
  const opacity = interpolate(frame, [start, start + 12], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 90 }}>
      <div
        style={{
          opacity,
          transform: `scale(${0.85 + 0.15 * s})`,
          textAlign: "center",
          fontFamily: FONT,
        }}
      >
        <div style={{ color: "white", fontSize: 108, fontWeight: 800, lineHeight: 1.15 }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ color: "#8fb8ff", fontSize: 48, marginTop: 40, fontWeight: 600 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

type CodeSceneProps = {
  badge: string;
  caption: string;
  accent: string;
  filename: string;
  code: string[];
  preview: "plain" | "styled" | "lamp";
  typeStartMs?: number;
  typeMs?: number;
  lampOnMs?: number;
};

export const CodeScene: React.FC<CodeSceneProps> = ({
  badge,
  caption,
  accent,
  filename,
  code,
  preview,
  typeStartMs = 400,
  typeMs = 3000,
  lampOnMs = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const full = code.join("\n");
  const ends: number[] = [];
  let acc = 0;
  code.forEach((line) => {
    acc += line.length;
    ends.push(acc);
    acc += 1;
  });

  const startF = msToFrames(typeStartMs, fps);
  const endF = startF + Math.max(1, msToFrames(typeMs, fps));
  const shown = Math.floor(interpolate(frame, [startF, endF], [0, full.length], clamp));
  const linesDone = ends.filter((e) => shown >= e).length;
  const fade = interpolate(frame, [0, 10], [0, 1], clamp);

  const styled = preview === "styled";
  const showH1 = preview !== "plain" || linesDone >= 1;
  const showP = preview !== "plain" || linesDone >= 2;
  const showBtn = preview !== "plain" || linesDone >= 3;
  const h1Color = styled && linesDone >= 1 ? "#e4572e" : "#000000";
  const pColor = styled && linesDone >= 2 ? "#5b6b7f" : "#000000";
  const btnStyled = styled && linesDone >= 3;

  const lampFrame = msToFrames(lampOnMs, fps);
  const lampOn = preview === "lamp" && frame >= lampFrame;
  const glow = interpolate(frame, [lampFrame, lampFrame + 8], [0, 1], clamp);
  const pressScale = interpolate(
    frame,
    [lampFrame - 10, lampFrame - 5, lampFrame],
    [1, 0.9, 1],
    clamp,
  );

  return (
    <AbsoluteFill style={{ opacity: fade, fontFamily: FONT, alignItems: "center" }}>
      <div style={{ marginTop: 170, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: accent,
            color: "#0b1220",
            fontSize: 84,
            fontWeight: 800,
            padding: "6px 44px",
            borderRadius: 28,
          }}
        >
          {badge}
        </div>
        <div style={{ color: "white", fontSize: 54, marginTop: 24, fontWeight: 600 }}>
          {caption}
        </div>
      </div>

      <div
        style={{
          marginTop: 70,
          width: 920,
          borderRadius: 28,
          background: "#0f1b2d",
          border: "2px solid #2a3f5f",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 24px",
            background: "#16263d",
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#ff5f56" }} />
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#ffbd2e" }} />
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#27c93f" }} />
          <div style={{ marginLeft: 16, color: "#8fa6c8", fontSize: 28, fontFamily: MONO }}>
            {filename}
          </div>
        </div>
        <pre
          style={{
            margin: 0,
            padding: "32px 40px",
            minHeight: 250,
            color: "#d6e4ff",
            fontFamily: MONO,
            fontSize: 38,
            lineHeight: 1.5,
          }}
        >
          {full.slice(0, shown)}
        </pre>
      </div>

      <div
        style={{
          marginTop: 50,
          width: 920,
          height: 440,
          borderRadius: 28,
          background: preview === "lamp" ? "#101a2c" : "#ffffff",
          border: "2px solid #2a3f5f",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "'Times New Roman', serif",
          overflow: "hidden",
        }}
      >
        {preview === "lamp" ? (
          <>
            <div
              style={{
                width: 190,
                height: 190,
                borderRadius: 95,
                background: lampOn ? "#ffd84d" : "#3a4660",
                boxShadow: lampOn
                  ? `0 0 ${130 * glow}px ${50 * glow}px rgba(255,216,77,0.75)`
                  : "none",
              }}
            />
            <div
              style={{
                marginTop: 40,
                padding: "14px 40px",
                fontSize: 38,
                fontFamily: FONT,
                fontWeight: 700,
                color: "#0b1220",
                background: "#e7ecf5",
                borderRadius: 16,
                transform: `scale(${pressScale})`,
              }}
            >
              Saklar
            </div>
          </>
        ) : (
          <div style={{ textAlign: "left", width: 760 }}>
            {showH1 ? (
              <div style={{ fontSize: 64, fontWeight: 700, color: h1Color }}>Halo, dunia!</div>
            ) : null}
            {showP ? (
              <div style={{ fontSize: 38, marginTop: 14, color: pColor }}>
                Ini halaman pertamaku.
              </div>
            ) : null}
            {showBtn ? (
              <button
                style={{
                  marginTop: 32,
                  fontSize: 34,
                  fontFamily: FONT,
                  padding: btnStyled ? "14px 40px" : "8px 22px",
                  background: btnStyled ? "#3d8bfd" : "#efefef",
                  color: btnStyled ? "#ffffff" : "#000000",
                  border: btnStyled ? "none" : "1px solid #767676",
                  borderRadius: btnStyled ? 16 : 4,
                }}
              >
                Klik saya
              </button>
            ) : null}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

type Card = { label: string; text: string; color: string };

export const SummaryCards: React.FC<{
  cards: Card[];
  revealMs: number[];
  headline: string;
  headlineMs: number;
}> = ({ cards, revealMs, headline, headlineMs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hf = msToFrames(headlineMs, fps);
  const headOpacity = interpolate(frame, [hf, hf + 12], [0, 1], clamp);
  const headY = interpolate(frame, [hf, hf + 12], [30, 0], clamp);

  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 300, fontFamily: FONT }}>
      <div
        style={{
          height: 130,
          color: "white",
          fontSize: 92,
          fontWeight: 800,
          opacity: headOpacity,
          transform: `translateY(${headY}px)`,
        }}
      >
        {headline}
      </div>
      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 36 }}>
        {cards.map((c, i) => {
          const f = msToFrames(revealMs[i] ?? 0, fps);
          const s = spring({ frame: Math.max(0, frame - f), fps, config: { damping: 16 } });
          const op = interpolate(frame, [f, f + 8], [0, 1], clamp);
          return (
            <div
              key={c.label}
              style={{
                width: 920,
                height: 230,
                borderRadius: 32,
                background: c.color,
                display: "flex",
                alignItems: "center",
                padding: "0 56px",
                opacity: op,
                transform: `translateX(${(1 - s) * 120}px)`,
              }}
            >
              <div style={{ width: 400, color: "#0b1220", fontSize: 68, fontWeight: 800 }}>
                {c.label}
              </div>
              <div style={{ color: "#0b1220", fontSize: 54, fontWeight: 600 }}>{c.text}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

type Point = { text: string; color?: string };

export const KeyPoints: React.FC<{
  badge: string;
  accent: string;
  heading: string;
  points: Point[];
  revealMs: number[];
}> = ({ badge, accent, heading, points, revealMs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = interpolate(frame, [0, 10], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ opacity: fade, fontFamily: FONT, alignItems: "center" }}>
      <div style={{ marginTop: 170, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: accent,
            color: "#0b1220",
            fontSize: 84,
            fontWeight: 800,
            padding: "6px 44px",
            borderRadius: 28,
          }}
        >
          {badge}
        </div>
        <div style={{ color: "white", fontSize: 54, marginTop: 24, fontWeight: 600 }}>
          {heading}
        </div>
      </div>

      <div style={{ marginTop: 90, display: "flex", flexDirection: "column", gap: 36 }}>
        {points.map((p, i) => {
          const f = msToFrames(revealMs[i] ?? 0, fps);
          const s = spring({ frame: Math.max(0, frame - f), fps, config: { damping: 16 } });
          const op = interpolate(frame, [f, f + 8], [0, 1], clamp);
          return (
            <div
              key={p.text}
              style={{
                width: 920,
                minHeight: 200,
                borderRadius: 32,
                background: "#16263d",
                border: `3px solid ${p.color ?? accent}`,
                display: "flex",
                alignItems: "center",
                gap: 36,
                padding: "0 48px",
                opacity: op,
                transform: `translateX(${(1 - s) * 120}px)`,
              }}
            >
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  background: p.color ?? accent,
                  color: "#0b1220",
                  fontSize: 54,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ color: "white", fontSize: 52, fontWeight: 600, lineHeight: 1.25 }}>
                {p.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};