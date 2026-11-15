import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";

// Latar penuh layar: gradasi gelap, titik-titik halus, dan dua cahaya yang bergeser pelan.
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const x1 = width * (0.25 + 0.08 * Math.sin(t / 3));
  const y1 = height * (0.3 + 0.05 * Math.cos(t / 4));
  const x2 = width * (0.78 + 0.07 * Math.cos(t / 3.5));
  const y2 = height * (0.72 + 0.05 * Math.sin(t / 5));

  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(180deg, ${theme.colors.bg1} 0%, ${theme.colors.bg0} 100%)` }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${theme.colors.line} 2px, transparent 2.5px)`,
          backgroundSize: "60px 60px",
          opacity: 0.55,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(700px circle at ${x1}px ${y1}px, rgba(53,224,255,0.14), transparent 70%),
                       radial-gradient(800px circle at ${x2}px ${y2}px, rgba(255,208,77,0.10), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }}
      />
    </AbsoluteFill>
  );
};