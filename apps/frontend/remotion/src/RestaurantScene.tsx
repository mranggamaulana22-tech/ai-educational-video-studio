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

const INK = theme.colors.ink;

const Tag: React.FC<{ label: string; bg: string; fg: string; p: number; dim: number }> = ({
  label,
  bg,
  fg,
  p,
  dim,
}) => (
  <div
    style={{
      opacity: Math.min(1, p * 3) * dim,
      transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
      background: bg,
      color: fg,
      border: `6px solid ${INK}`,
      borderRadius: 60,
      padding: "14px 44px",
      fontFamily: theme.font.sans,
      fontWeight: 700,
      fontSize: 46,
      letterSpacing: 2,
    }}
  >
    {label}
  </div>
);

const Restaurant: React.FC = () => {
  const W = 500 / 7;
  return (
    <svg width={560} height={440} viewBox="0 0 560 440">
      <rect x={50} y={170} width={460} height={250} rx={10} fill="#ffe3b8" stroke={INK} strokeWidth={6} />
      <rect x={90} y={240} width={130} height={110} rx={8} fill="#bfe3ff" stroke={INK} strokeWidth={6} />
      <rect x={340} y={240} width={130} height={110} rx={8} fill="#bfe3ff" stroke={INK} strokeWidth={6} />
      <rect x={240} y={250} width={80} height={170} rx={6} fill="#c9783a" stroke={INK} strokeWidth={6} />
      {Array.from({ length: 7 }).map((_, i) => {
        const x = 30 + i * W;
        const fill = i % 2 === 0 ? theme.colors.orange : "#ffffff";
        return (
          <g key={i}>
            <rect x={x} y={96} width={W} height={70} fill={fill} stroke={INK} strokeWidth={6} />
            <path d={`M ${x} 166 a ${W / 2} ${W / 2} 0 0 0 ${W} 0`} fill={fill} stroke={INK} strokeWidth={6} />
          </g>
        );
      })}
      <rect x={150} y={0} width={260} height={76} rx={14} fill={INK} />
      <text x={280} y={54} textAnchor="middle" fill="#fff" fontSize={46} fontWeight={700} fontFamily={theme.font.sans}>
        RESTORAN
      </text>
    </svg>
  );
};

const DocIcon: React.FC = () => (
  <svg width={120} height={120} viewBox="0 0 120 120">
    <rect x={28} y={14} width={64} height={92} rx={10} fill="#fff" stroke={INK} strokeWidth={6} />
    {[42, 60, 78].map((y) => (
      <line key={y} x1={44} y1={y} x2={76} y2={y} stroke={INK} strokeWidth={6} strokeLinecap="round" />
    ))}
  </svg>
);

const PotIcon: React.FC<{ t: number }> = ({ t }) => (
  <svg width={120} height={120} viewBox="0 0 120 120">
    {[0, 1, 2].map((i) => (
      <path
        key={i}
        d={`M ${40 + i * 20} 52 q -8 -9 0 -17 q 8 -8 0 -16`}
        fill="none"
        stroke={INK}
        strokeWidth={5}
        strokeLinecap="round"
        opacity={0.35 + 0.65 * Math.abs(Math.sin(t * 2 + i))}
      />
    ))}
    <path d="M28 62 h64 v22 a18 18 0 0 1 -18 18 h-28 a18 18 0 0 1 -18 -18 z" fill="#9db0d6" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    <line x1={20} y1={62} x2={100} y2={62} stroke={INK} strokeWidth={6} strokeLinecap="round" />
  </svg>
);

const TableIcon: React.FC = () => (
  <svg width={120} height={120} viewBox="0 0 120 120">
    <line x1={32} y1={70} x2={26} y2={106} stroke={INK} strokeWidth={6} strokeLinecap="round" />
    <line x1={88} y1={70} x2={94} y2={106} stroke={INK} strokeWidth={6} strokeLinecap="round" />
    <ellipse cx={60} cy={66} rx={46} ry={12} fill="#e8a060" stroke={INK} strokeWidth={6} />
    <ellipse cx={60} cy={56} rx={22} ry={7} fill="#fff" stroke={INK} strokeWidth={5} />
    <ellipse cx={60} cy={53} rx={10} ry={4} fill={theme.colors.orange} />
  </svg>
);

const Tile: React.FC<{ label: string; p: number; children: React.ReactNode }> = ({ label, p, children }) => (
  <div
    style={{
      width: 220,
      textAlign: "center",
      opacity: Math.min(1, p * 3),
      transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px) scale(${interpolate(p, [0, 1], [0.7, 1])})`,
    }}
  >
    <div
      style={{
        width: 220,
        height: 220,
        background: theme.colors.card,
        border: `8px solid ${theme.colors.cyan}`,
        borderRadius: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 10px 0 ${INK}`,
      }}
    >
      {children}
    </div>
    <div style={{ marginTop: 26, fontFamily: theme.font.sans, fontWeight: 700, fontSize: 42, color: INK }}>
      {label}
    </div>
  </div>
);

const Arrow: React.FC<{ p: number }> = ({ p }) => (
  <svg width={100} height={30} viewBox="0 0 100 30" style={{ opacity: Math.min(1, p * 3), marginTop: -52 }}>
    <line x1={8} y1={15} x2={84} y2={15} stroke={INK} strokeWidth={7} strokeLinecap="round" />
    <polygon points="82,4 98,15 82,26" fill={INK} />
  </svg>
);

const DOT_COLORS = [theme.colors.orange, theme.colors.violet, theme.colors.cyan];

export const RestaurantScene: React.FC<{
  // [tag Engineer, tag Developer, restoran, ganti ke alur, alur mulai] dalam ms sejak scene mulai
  cuesMs?: number[];
}> = ({ cuesMs = [300, 700, 3000, 4900, 5300] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pop = usePop();
  const smooth = usePop(theme.motion.smooth);

  const pA = pop(cuesMs[0]);
  const pB = pop(cuesMs[1]);
  const pR = pop(cuesMs[2]);
  const sw = smooth(cuesMs[3]);
  const pTile = [0, 1, 2].map((i) => pop(cuesMs[4] + i * 350));
  const pArrow = [pop(cuesMs[4] + 175), pop(cuesMs[4] + 525)];
  const pDots = pop(cuesMs[4] + 1500);

  const FLOW_W = 860;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 290, width: "100%", display: "flex", justifyContent: "center", gap: 40 }}>
        <Tag label="ENGINEER" bg={theme.colors.cyan} fg="#ffffff" p={pA} dim={1} />
        <Tag label="DEVELOPER" bg={theme.colors.orange} fg={INK} p={pB} dim={interpolate(sw, [0, 1], [1, 0.35])} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 410,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: Math.min(1, pR * 3) * (1 - sw),
          transform: `translateY(${interpolate(pR, [0, 1], [60, 0])}px) scale(${interpolate(pR, [0, 1], [0.7, 1]) * interpolate(sw, [0, 1], [1, 0.85])})`,
        }}
      >
        <Restaurant />
      </div>

      <div style={{ position: "absolute", top: 480, left: (1080 - FLOW_W) / 2, width: FLOW_W }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Tile label="Pesanan" p={pTile[0]}>
            <DocIcon />
          </Tile>
          <Arrow p={pArrow[0]} />
          <Tile label="Dapur" p={pTile[1]}>
            <PotIcon t={t} />
          </Tile>
          <Arrow p={pArrow[1]} />
          <Tile label="Meja" p={pTile[2]}>
            <TableIcon />
          </Tile>
        </div>
        {DOT_COLORS.map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 110 - 14,
              left: ((t * 0.4 + i / 3) % 1) * FLOW_W - 14,
              width: 28,
              height: 28,
              borderRadius: 14,
              background: c,
              border: `4px solid ${INK}`,
              opacity: pDots,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};