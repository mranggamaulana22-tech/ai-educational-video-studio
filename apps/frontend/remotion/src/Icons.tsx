import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { msToFrames } from "./components";
import { theme } from "./theme";

const PATHS = {
  file: ["M28 10H58L76 28V90H28Z", "M58 10V28H76", "M38 50H66", "M38 64H66", "M38 78H54"],
  folder: ["M8 26H38L46 36H92V82H8Z", "M8 48H92"],
  cloud: ["M28 76H72A17 17 0 0 0 74 42A23 23 0 0 0 31 40A18 18 0 0 0 28 76Z"],
  laptop: ["M22 20H78V62H22Z", "M8 72H92V76A4 4 0 0 1 88 80H12A4 4 0 0 1 8 76Z"],
  commit: ["M4 50H34", "M66 50H96", "M50 34A16 16 0 1 0 50 66A16 16 0 1 0 50 34Z"],
  branch: ["M28 26V74", "M28 60C28 46 72 54 72 40", "M28 10A8 8 0 1 0 28 26A8 8 0 1 0 28 10Z", "M28 74A8 8 0 1 0 28 90A8 8 0 1 0 28 74Z", "M72 24A8 8 0 1 0 72 40A8 8 0 1 0 72 24Z"],
  check: ["M50 6A44 44 0 1 0 50 94A44 44 0 1 0 50 6Z", "M30 52L44 66L72 36"],
  clock: ["M50 6A44 44 0 1 0 50 94A44 44 0 1 0 50 6Z", "M50 28V52L68 64"],
  lock: ["M24 44H76V88H24Z", "M34 44V32A16 16 0 0 1 66 32V44", "M50 60V72"],
  people: ["M36 18A12 12 0 1 0 36 42A12 12 0 1 0 36 18Z", "M12 86V80A24 24 0 0 1 60 80V86", "M70 27A9 9 0 1 0 70 45A9 9 0 1 0 70 27Z", "M72 62A20 20 0 0 1 90 82V86"],
  code: ["M34 28L12 50L34 72", "M66 28L88 50L66 72", "M56 20L44 80"],
  gear: ["M50 22A28 28 0 1 0 50 78A28 28 0 1 0 50 22Z", "M50 40A10 10 0 1 0 50 60A10 10 0 1 0 50 40Z", "M80 50L92 50", "M71.2 71.2L79.7 79.7", "M50 80L50 92", "M28.8 71.2L20.3 79.7", "M20 50L8 50", "M28.8 28.8L20.3 20.3", "M50 20L50 8", "M71.2 28.8L79.7 20.3"],
  arrow: ["M12 50H86", "M62 26L86 50L62 74"],
  bug: ["M50 32C66 32 70 46 70 58C70 74 62 88 50 88C38 88 30 74 30 58C30 46 34 32 50 32Z", "M40 32A10 10 0 0 1 60 32", "M30 52H12", "M30 68H14", "M70 52H88", "M70 68H86", "M32 40L18 30", "M68 40L82 30", "M50 46V86"],
} as const;

export type IconName = keyof typeof PATHS;
export const iconNames = Object.keys(PATHS) as IconName[];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Icon: React.FC<{
  name: IconName;
  size?: number;
  color?: string;
  delayMs?: number;
  drawMs?: number;
  enter?: "draw" | "pop" | "none";
  float?: boolean;
}> = ({
  name,
  size = 200,
  color = theme.colors.cyan,
  delayMs = 0,
  drawMs = 700,
  enter = "draw",
  float = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const paths = PATHS[name];
  const n = paths.length;
  const local = frame - msToFrames(delayMs, fps);

  const pop = spring({ frame: Math.max(0, local), fps, config: theme.motion.pop });
  const scale = enter === "none" ? 1 : 0.55 + 0.45 * pop;
  const visible = enter === "none" ? 1 : local >= 0 ? 1 : 0;

  const drawFrames = Math.max(1, msToFrames(drawMs, fps));
  const draw =
    enter === "draw"
      ? interpolate(local, [0, drawFrames], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
      : 1;
  const stagger = 0.5 / n;
  const denom = 1 - stagger * (n - 1);

  const bob = float ? Math.sin((frame / fps) * ((2 * Math.PI) / 3) + name.length) * 10 : 0;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={5}
      strokeOpacity={0.88}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        opacity: visible,
        transform: `translateY(${bob}px) scale(${scale})`,
        filter: `drop-shadow(0 0 ${size * 0.035}px color-mix(in srgb, ${color} 40%, transparent))`,
        overflow: "visible",
      }}
    >
      {paths.map((d, i) => {
        const p = Math.min(1, Math.max(0, (draw - i * stagger) / denom));
        return (
          <path
            key={i}
            d={d}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - p}
            opacity={p <= 0.001 ? 0 : 1}
          />
        );
      })}
    </svg>
  );
};

const palette = [
  theme.colors.cyan,
  theme.colors.yellow,
  theme.colors.green,
  theme.colors.orange,
  theme.colors.violet,
  theme.colors.red,
];

// Komponen uji: menampilkan semua ikon satu per satu.
export const IconShowcase: React.FC<{ names?: string[] }> = ({ names }) => {
  const list = (names && names.length ? names : iconNames) as IconName[];
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
        fontFamily: theme.font.sans,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 50, width: 960 }}>
        {list.map((n, i) => (
          <div key={n} style={{ width: 260, textAlign: "center" }}>
            <Icon name={n} size={230} color={palette[i % palette.length]} delayMs={i * 250} float />
            <div style={{ color: theme.colors.inkSoft, fontSize: 34, marginTop: 8 }}>{n}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};