import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";

// Simbol kode samar yang melayang pelan di latar.
const TOKENS = [
  { s: "{ }", x: 0.1, y: 0.07, r: -8, size: 96 },
  { s: ".css", x: 0.62, y: 0.18, r: 6, size: 80 },
  { s: "<p>", x: 0.06, y: 0.5, r: 10, size: 84 },
  { s: "( )", x: 0.8, y: 0.45, r: -6, size: 100 },
  { s: ".js", x: 0.2, y: 0.82, r: 5, size: 84 },
  { s: "#", x: 0.74, y: 0.78, r: -10, size: 96 },
  { s: "[ ]", x: 0.45, y: 0.93, r: 4, size: 84 },
];

export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  return (
    <AbsoluteFill style={{ background: theme.colors.bg0 }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${theme.colors.line} 2.5px, transparent 3px)`,
          backgroundSize: "48px 48px",
        }}
      />
      {TOKENS.map((k, i) => (
        <div
          key={k.s}
          style={{
            position: "absolute",
            left: k.x * width,
            top: k.y * height + Math.sin(t / (2.5 + i * 0.4) + i) * 16,
            transform: `rotate(${k.r}deg)`,
            fontFamily: theme.font.mono,
            fontWeight: 700,
            fontSize: k.size,
            color: theme.colors.ink,
            opacity: 0.06,
          }}
        >
          {k.s}
        </div>
      ))}
    </AbsoluteFill>
  );
};