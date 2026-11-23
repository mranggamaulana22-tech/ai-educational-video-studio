import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";

const usePop = (config: object = theme.motion.pop) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (atMs: number) => {
    const local = frame - Math.round((atMs / 1000) * fps);
    if (local < 0) return 0;
    return spring({ frame: local, fps, config });
  };
};

const LINES = ["100%", "86%", "94%", "58%", "76%"];

const Card: React.FC<{ title: string; color: string; fg: string }> = ({ title, color, fg }) => (
  <div
    style={{
      width: 440,
      height: 470,
      background: theme.colors.card,
      border: `7px solid ${theme.colors.ink}`,
      borderRadius: 28,
      overflow: "hidden",
      boxShadow: `0 10px 0 ${theme.colors.ink}`,
    }}
  >
    <div
      style={{
        background: color,
        color: fg,
        padding: "22px 0",
        textAlign: "center",
        fontFamily: theme.font.sans,
        fontWeight: 700,
        fontSize: 40,
        borderBottom: `7px solid ${theme.colors.ink}`,
      }}
    >
      {title}
    </div>
    <div style={{ padding: "22px 30px" }}>
      <div style={{ fontFamily: theme.font.mono, fontSize: 24, color: theme.colors.inkSoft, marginBottom: 18 }}>
        LOWONGAN
      </div>
      {LINES.map((w, i) => (
        <div key={i} style={{ width: w, height: 20, borderRadius: 10, background: "#e6e8ef", marginBottom: 20 }} />
      ))}
      <div
        style={{
          display: "inline-block",
          marginTop: 8,
          padding: "4px 18px",
          borderRadius: 20,
          background: "#eef0f6",
          fontFamily: theme.font.sans,
          fontWeight: 600,
          fontSize: 24,
          color: theme.colors.inkSoft,
        }}
      >
        Full-time
      </div>
    </div>
  </div>
);

const BUILDINGS = [
  { h: 120, c: theme.colors.cyan },
  { h: 160, c: theme.colors.orange },
  { h: 110, c: theme.colors.violet },
  { h: 170, c: "#3b82f6" },
  { h: 130, c: theme.colors.orange },
  { h: 150, c: theme.colors.cyan },
];

const Building: React.FC<{ h: number; c: string; p: number }> = ({ h, c, p }) => (
  <div
    style={{
      width: 100,
      height: h,
      background: c,
      border: `6px solid ${theme.colors.ink}`,
      borderRadius: 12,
      transformOrigin: "bottom center",
      transform: `scaleY(${interpolate(p, [0, 1], [0.1, 1])})`,
      opacity: Math.min(1, p * 4),
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      padding: 12,
      alignContent: "start",
    }}
  >
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} style={{ height: 16, background: "rgba(255,255,255,0.85)", borderRadius: 3 }} />
    ))}
  </div>
);

export const JobScene: React.FC<{
  label?: string;
  // [label, kartu A, kartu B, gedung, stempel] dalam ms sejak scene mulai
  cuesMs?: number[];
}> = ({ label = "DI LOWONGAN KERJA", cuesMs = [200, 700, 1200, 3500, 6200] }) => {
  const pop = usePop();
  const smooth = usePop(theme.motion.smooth);
  const pLabel = pop(cuesMs[0]);
  const pA = pop(cuesMs[1]);
  const pB = pop(cuesMs[2]);
  const pStamp = pop(cuesMs[4]);
  const swap = smooth(cuesMs[4] + 500);

  const xA = interpolate(swap, [0, 1], [80, 560]);
  const xB = interpolate(swap, [0, 1], [560, 80]);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 290,
          width: "100%",
          textAlign: "center",
          opacity: pLabel,
          fontFamily: theme.font.mono,
          fontWeight: 700,
          fontSize: 38,
          letterSpacing: 4,
          color: theme.colors.inkSoft,
        }}
      >
        {label}
      </div>

      <div
        style={{
          position: "absolute",
          top: 370,
          left: xA,
          opacity: Math.min(1, pA * 3),
          transform: `translateY(${interpolate(pA, [0, 1], [60, 0])}px)`,
        }}
      >
        <Card title="Software Engineer" color={theme.colors.cyan} fg="#ffffff" />
      </div>
      <div
        style={{
          position: "absolute",
          top: 370,
          left: xB,
          opacity: Math.min(1, pB * 3),
          transform: `translateY(${interpolate(pB, [0, 1], [60, 0])}px)`,
        }}
      >
        <Card title="Software Developer" color={theme.colors.orange} fg={theme.colors.ink} />
      </div>

      <div style={{ position: "absolute", top: 880, width: "100%", textAlign: "center" }}>
        <div
          style={{
            opacity: pop(cuesMs[3]),
            fontFamily: theme.font.sans,
            fontWeight: 700,
            fontSize: 36,
            color: theme.colors.inkSoft,
            marginBottom: 12,
          }}
        >
          banyak perusahaan
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 22, height: 180 }}>
          {BUILDINGS.map((b, i) => (
            <Building key={i} h={b.h} c={b.c} p={pop(cuesMs[3] + 120 * i)} />
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 560,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: Math.min(1, pStamp * 4),
          transform: `scale(${interpolate(pStamp, [0, 1], [2.4, 1])}) rotate(-8deg)`,
        }}
      >
        <div
          style={{
            border: `10px solid ${theme.colors.red}`,
            borderRadius: 16,
            color: theme.colors.red,
            background: "rgba(255,255,255,0.88)",
            padding: "14px 36px",
            fontFamily: theme.font.sans,
            fontWeight: 700,
            fontSize: 74,
            letterSpacing: 3,
          }}
        >
          DIPAKAI GANTIAN
        </div>
      </div>
    </AbsoluteFill>
  );
};