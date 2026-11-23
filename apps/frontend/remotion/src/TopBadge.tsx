import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";

// Lencana kecil di atas: "HARI 1/15 | Intro to Software Engineering".
export const TopBadge: React.FC<{ day: string; course: string }> = ({ day, course }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: theme.motion.pop });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 200 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: theme.colors.card,
          border: `5px solid ${theme.colors.ink}`,
          borderRadius: 50,
          padding: "8px 28px 8px 8px",
          opacity: Math.min(1, p * 3),
          transform: `scale(${interpolate(p, [0, 1], [0.8, 1])})`,
        }}
      >
        <div
          style={{
            background: theme.colors.yellow,
            borderRadius: 40,
            padding: "6px 22px",
            fontFamily: theme.font.sans,
            fontWeight: 700,
            fontSize: 30,
            color: theme.colors.ink,
          }}
        >
          {day}
        </div>
        <div style={{ fontFamily: theme.font.sans, fontWeight: 600, fontSize: 32, color: theme.colors.ink }}>
          {course}
        </div>
      </div>
    </AbsoluteFill>
  );
};
