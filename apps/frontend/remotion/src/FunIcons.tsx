import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "./theme";

// Ikon gaya fun: bentuk datar, garis tepi biru tua tebal. Dipakai oleh scene umum.
const INK = theme.colors.ink;
const W = "#ffffff";
const S = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

type Draw = (c: string) => React.ReactNode;

const ICONS: Record<string, Draw> = {
  laptop: (c) => (
    <>
      <rect x={18} y={20} width={64} height={44} rx={6} fill={W} {...S} />
      <rect x={26} y={28} width={48} height={28} rx={3} fill={c} />
      <path d="M8 74 H92 L86 82 H14 Z" fill={c} {...S} />
    </>
  ),
  code: (c) => (
    <>
      <rect x={10} y={18} width={80} height={64} rx={12} fill={c} {...S} />
      <path d="M38 38 L24 50 L38 62 M62 38 L76 50 L62 62" fill="none" stroke={W} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  gear: (c) => (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={43} y={6} width={14} height={20} rx={4} fill={c} {...S} transform={`rotate(${i * 45} 50 50)`} />
      ))}
      <circle cx={50} cy={50} r={30} fill={c} {...S} />
      <circle cx={50} cy={50} r={12} fill={W} {...S} />
    </>
  ),
  cloud: (c) => (
    <path d="M28 72 C12 72 10 50 28 48 C28 28 56 22 64 40 C84 36 92 62 74 72 Z" fill={c} {...S} />
  ),
  people: (c) => (
    <>
      <circle cx={34} cy={34} r={14} fill={W} {...S} />
      <path d="M10 80 C10 56 58 56 58 80 Z" fill={W} {...S} />
      <circle cx={66} cy={38} r={14} fill={c} {...S} />
      <path d="M42 84 C42 60 92 60 92 84 Z" fill={c} {...S} />
    </>
  ),
  bug: (c) => (
    <>
      <path d="M22 40 L8 32 M22 56 L6 56 M24 72 L10 82 M78 40 L92 32 M78 56 L94 56 M76 72 L90 82" fill="none" {...S} />
      <ellipse cx={50} cy={56} rx={26} ry={30} fill={c} {...S} />
      <circle cx={50} cy={26} r={14} fill={c} {...S} />
      <path d="M50 40 V86" stroke={INK} strokeWidth={5} />
      <circle cx={44} cy={24} r={3} fill={W} />
      <circle cx={56} cy={24} r={3} fill={W} />
    </>
  ),
  check: (c) => (
    <>
      <circle cx={50} cy={50} r={38} fill={c} {...S} />
      <path d="M30 52 L45 67 L72 36" fill="none" stroke={W} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  lock: (c) => (
    <>
      <path d="M30 44 V32 C30 10 70 10 70 32 V44" fill="none" {...S} strokeWidth={8} />
      <rect x={20} y={42} width={60} height={46} rx={10} fill={c} {...S} />
      <circle cx={50} cy={62} r={6} fill={W} />
      <rect x={47} y={64} width={6} height={12} rx={3} fill={W} />
    </>
  ),
  clock: (c) => (
    <>
      <circle cx={50} cy={50} r={38} fill={W} {...S} />
      <circle cx={50} cy={50} r={30} fill={c} opacity={0.25} />
      <path d="M50 28 V50 L66 60" fill="none" {...S} strokeWidth={7} />
    </>
  ),
  bulb: (c) => (
    <>
      <path d="M50 8 C24 8 18 38 34 54 C38 58 38 64 38 70 H62 C62 64 62 58 66 54 C82 38 76 8 50 8 Z" fill={c} {...S} />
      <rect x={38} y={70} width={24} height={12} rx={4} fill={W} {...S} />
      <path d="M42 90 H58" {...S} />
    </>
  ),
  rocket: (c) => (
    <>
      <path d="M50 6 C74 22 74 56 66 72 H34 C26 56 26 22 50 6 Z" fill={W} {...S} />
      <circle cx={50} cy={38} r={10} fill={c} {...S} />
      <path d="M34 54 L16 74 L34 72 Z M66 54 L84 74 L66 72 Z" fill={c} {...S} />
      <path d="M42 80 L50 96 L58 80 Z" fill={theme.colors.yellow} {...S} />
    </>
  ),
  book: (c) => (
    <>
      <path d="M8 22 C26 14 42 16 50 24 V84 C42 76 26 74 8 82 Z" fill={c} {...S} />
      <path d="M92 22 C74 14 58 16 50 24 V84 C58 76 74 74 92 82 Z" fill={W} {...S} />
      <path d="M62 38 H80 M62 50 H80 M62 62 H76" {...S} strokeWidth={4} />
    </>
  ),
  server: (c) => (
    <>
      <rect x={14} y={14} width={72} height={20} rx={6} fill={c} {...S} />
      <rect x={14} y={40} width={72} height={20} rx={6} fill={W} {...S} />
      <rect x={14} y={66} width={72} height={20} rx={6} fill={c} {...S} />
      <circle cx={28} cy={24} r={3} fill={W} />
      <circle cx={28} cy={50} r={3} fill={c} />
      <circle cx={28} cy={76} r={3} fill={W} />
    </>
  ),
  database: (c) => (
    <>
      <path d="M16 24 V76 C16 94 84 94 84 76 V24" fill={c} {...S} />
      <ellipse cx={50} cy={24} rx={34} ry={13} fill={W} {...S} />
      <path d="M16 50 C16 66 84 66 84 50" fill="none" {...S} />
    </>
  ),
  chat: (c) => (
    <>
      <path d="M12 18 H88 V66 H44 L26 84 V66 H12 Z" fill={c} {...S} />
      <circle cx={34} cy={42} r={4} fill={W} />
      <circle cx={50} cy={42} r={4} fill={W} />
      <circle cx={66} cy={42} r={4} fill={W} />
    </>
  ),
  star: (c) => (
    <path d="M50 8 L62 36 L92 38 L69 58 L77 88 L50 72 L23 88 L31 58 L8 38 L38 36 Z" fill={c} {...S} />
  ),
  target: (c) => (
    <>
      <circle cx={50} cy={50} r={40} fill={W} {...S} />
      <circle cx={50} cy={50} r={26} fill={c} {...S} />
      <circle cx={50} cy={50} r={10} fill={W} {...S} />
      <path d="M50 50 L86 14 M76 14 H88 V26" fill="none" {...S} />
    </>
  ),
  puzzle: (c) => (
    <path
      d="M14 30 H38 C32 14 56 14 50 30 H74 V52 C90 46 90 72 74 66 V86 H14 Z"
      fill={c}
      {...S}
    />
  ),
  folder: (c) => (
    <>
      <path d="M8 24 H38 L46 34 H92 V82 H8 Z" fill={c} {...S} />
      <path d="M8 44 H92" {...S} />
    </>
  ),
  file: (c) => (
    <>
      <path d="M22 8 H60 L80 28 V92 H22 Z" fill={W} {...S} />
      <path d="M60 8 V28 H80" fill={c} {...S} />
      <path d="M34 48 H68 M34 62 H68 M34 76 H56" {...S} strokeWidth={4} />
    </>
  ),
  restaurant: (c) => (
    <>
      <path d="M22 50 C6 46 10 22 30 26 C34 10 66 10 70 26 C90 22 94 46 78 50 V74 H22 Z" fill={W} {...S} />
      <rect x={22} y={66} width={56} height={14} rx={4} fill={c} {...S} />
    </>
  ),
  arrow: (c) => (
    <path d="M10 38 H56 V18 L92 50 L56 82 V62 H10 Z" fill={c} {...S} />
  ),
};

export const ICON_NAMES = Object.keys(ICONS);

const COLORS: Record<string, string> = {
  teal: theme.colors.cyan,
  orange: theme.colors.orange,
  violet: theme.colors.violet,
  red: theme.colors.red,
  green: theme.colors.green,
  yellow: theme.colors.yellow,
};

export type IconMotion = "float" | "wiggle" | "pulse" | "spin" | "none";

// Ikon bergerak terus-menerus (melayang, bergoyang, berdenyut, berputar).
export const FunIcon: React.FC<{
  name: string;
  size?: number;
  color?: string;
  motion?: IconMotion;
  phase?: number;
}> = ({ name, size = 140, color = "teal", motion = "float", phase = 0 }) => {
  const frame = useCurrentFrame();
  const t = frame / 30 + phase;
  const draw = ICONS[name] ?? ICONS.star;
  let tf = "";
  if (motion === "float") tf = `translateY(${Math.sin(t * 3) * 8}px)`;
  if (motion === "wiggle") tf = `rotate(${Math.sin(t * 5) * 6}deg)`;
  if (motion === "pulse") tf = `scale(${1 + Math.sin(t * 4) * 0.06})`;
  if (motion === "spin") tf = `rotate(${t * 40}deg)`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: tf, overflow: "visible" }}>
      {draw(COLORS[color] ?? COLORS.teal)}
    </svg>
  );
};
