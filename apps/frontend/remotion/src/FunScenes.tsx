import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";

// Mengembalikan fungsi: progres pegas (0 sampai 1) untuk sebuah cue dalam milidetik.
const usePop = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (atMs: number) => {
    const local = frame - Math.round((atMs / 1000) * fps);
    if (local < 0) return 0;
    return spring({ frame: local, fps, config: theme.motion.pop });
  };
};

const Pill: React.FC<{ label: string; bg: string; fg: string; p: number; bob: number }> = ({
  label,
  bg,
  fg,
  p,
  bob,
}) => (
  <div
    style={{
      opacity: Math.min(1, p * 3),
      transform: `translateY(${bob}px) scale(${interpolate(p, [0, 1], [0.6, 1])})`,
      background: bg,
      color: fg,
      border: `8px solid ${theme.colors.ink}`,
      borderRadius: 90,
      padding: "26px 70px",
      fontFamily: theme.font.sans,
      fontWeight: 700,
      fontSize: 68,
      boxShadow: `0 10px 0 ${theme.colors.ink}`,
    }}
  >
    {label}
  </div>
);

const MARKS = [
  { x: 130, y: 120, size: 90, color: theme.colors.cyan },
  { x: 880, y: 60, size: 60, color: theme.colors.violet },
  { x: 90, y: 640, size: 70, color: theme.colors.violet },
  { x: 930, y: 690, size: 100, color: theme.colors.orange },
];

export const HookScene: React.FC<{
  line1?: string;
  line2?: string;
  labelA?: string;
  labelB?: string;
  // [judul, pil A, pil B, tanda ≠, tanda tanya] dalam ms sejak scene mulai
  cuesMs?: number[];
}> = ({
  line1 = "Beda atau",
  line2 = "sama aja?",
  labelA = "Software Engineer",
  labelB = "Software Developer",
  cuesMs = [200, 600, 1100, 5400, 6600],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pop = usePop();

  const pTitle = pop(cuesMs[0]);
  const pA = pop(cuesMs[1]);
  const pB = pop(cuesMs[2]);
  const pNeq = pop(cuesMs[3]);
  const pQ = pop(cuesMs[4]);

  const titleStyle: React.CSSProperties = {
    fontFamily: theme.font.sans,
    fontWeight: 700,
    fontSize: 136,
    lineHeight: 1.05,
    textAlign: "center",
  };

  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
      <div
        style={{
          opacity: Math.min(1, pTitle * 3),
          transform: `scale(${interpolate(pTitle, [0, 1], [0.8, 1])})`,
        }}
      >
        <div style={{ ...titleStyle, color: theme.colors.ink }}>{line1}</div>
        <div style={{ ...titleStyle, color: "#d9480f" }}>{line2}</div>
      </div>

      <div style={{ position: "relative", marginTop: 90, display: "flex", flexDirection: "column", gap: 54, alignItems: "center" }}>
        <Pill label={labelA} bg={theme.colors.cyan} fg="#ffffff" p={pA} bob={Math.sin(t * 2) * 5} />
        <Pill label={labelB} bg={theme.colors.orange} fg={theme.colors.ink} p={pB} bob={Math.sin(t * 2 + 1.5) * 5} />

        {/* Tanda di tengah: ≠ lalu berubah jadi ? */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 132,
            height: 132,
            marginLeft: -66,
            marginTop: -66,
            borderRadius: 66,
            background: theme.colors.card,
            border: `8px solid ${theme.colors.ink}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: theme.font.sans,
            fontWeight: 700,
            fontSize: 96,
            color: pQ > 0.5 ? theme.colors.violet : theme.colors.red,
            opacity: Math.min(1, pNeq * 3),
            transform: `scale(${interpolate(pNeq, [0, 1], [0.3, 1])}) rotate(${interpolate(pQ, [0, 1], [0, 360])}deg)`,
          }}
        >
          {pQ > 0.5 ? "?" : "≠"}
        </div>
      </div>

      {/* Tanda tanya melayang */}
      {MARKS.map((m, i) => {
        const p = pop(cuesMs[4] + 150 * i);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: m.x,
              top: 760 + m.y + Math.sin(t * 2.2 + i * 1.3) * 14,
              opacity: Math.min(1, p * 3),
              transform: `scale(${interpolate(p, [0, 1], [0.2, 1])}) rotate(${(i % 2 ? 1 : -1) * 12}deg)`,
              fontFamily: theme.font.sans,
              fontWeight: 700,
              fontSize: m.size,
              color: m.color,
            }}
          >
            ?
          </div>
        );
      })}
    </AbsoluteFill>
  );
};