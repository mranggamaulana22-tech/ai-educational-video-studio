import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { msToFrames } from "./components";
import { Icon } from "./Icons";
import type { IconName } from "./Icons";
import { theme } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const palette = [theme.colors.cyan, theme.colors.yellow, theme.colors.orange, theme.colors.violet, theme.colors.green, theme.colors.red];

/* ---------- (a) FileChaos: file bernama final, final_revisi, ... menumpuk berantakan ---------- */

const SLOTS = [
  { x: -250, y: -230, r: -9 },
  { x: 230, y: -110, r: 7 },
  { x: -80, y: 70, r: -4 },
  { x: 260, y: 190, r: 10 },
  { x: -270, y: 270, r: 6 },
  { x: 30, y: -350, r: 3 },
  { x: 70, y: 330, r: -7 },
];

export const FileChaos: React.FC<{ files: string[]; cuesMs: number[] }> = ({ files, cuesMs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ fontFamily: theme.font.sans }}>
      {files.map((label, i) => {
        const slot = SLOTS[i % SLOTS.length];
        const cue = msToFrames(cuesMs[i] ?? 0, fps);
        const local = frame - cue;
        if (local < 0) return null;
        const p = spring({ frame: local, fps, config: theme.motion.pop });
        const wob = Math.sin((frame / fps) * 2.2 + i * 1.7) * 2.2;
        const color = palette[i % palette.length];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540 + slot.x - 150,
              top: 860 + slot.y - 150,
              width: 300,
              textAlign: "center",
              transform: `rotate(${slot.r * p + wob}deg)`,
            }}
          >
            <Icon name="file" size={210} color={color} delayMs={cuesMs[i] ?? 0} drawMs={450} />
            <div
              style={{
                display: "inline-block",
                marginTop: 4,
                padding: "8px 26px",
                borderRadius: 18,
                background: "#16263d",
                border: `3px solid ${color}`,
                color: theme.colors.ink,
                fontFamily: theme.font.mono,
                fontSize: 38,
                fontWeight: 700,
                opacity: Math.min(1, local / 4),
                transform: `scale(${0.6 + 0.4 * p})`,
              }}
            >
              {label}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------- (b) CommitTimeline: garis waktu, titik simpanan, lalu panah mundur ---------- */

export const CommitTimeline: React.FC<{
  labels: string[];
  cuesMs: number[];
  rewindMs: number;
  rewindTo: number;
  rewindLabel?: string;
  headLabel?: string;
}> = ({ labels, cuesMs, rewindMs, rewindTo, rewindLabel = "Kembali!", headLabel = "HEAD" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = (ms: number) => msToFrames(ms, fps);
  const n = labels.length;
  const Y = 900;
  const R = 34;
  const xs = labels.map((_, i) => (n === 1 ? 540 : 150 + (i * 780) / (n - 1)));
  const rewindF = f(rewindMs);
  const to = Math.min(Math.max(0, rewindTo), n - 1);
  const toX = xs[to];
  const lastX = xs[n - 1];
  const nodeF = (i: number) => f(cuesMs[i] ?? 0) + (i > 0 ? 6 : 0);

  // Posisi penanda HEAD: bergeser halus ke tiap titik baru, lalu mundur.
  const steps = xs.map((x, i) => ({ x, f: nodeF(i) }));
  steps.push({ x: toX, f: rewindF + 8 });
  let headX = steps[0].x;
  for (let k = 1; k < steps.length; k++) {
    if (frame >= steps[k].f) {
      const s = spring({ frame: frame - steps[k].f, fps, config: { damping: 18, stiffness: 120 } });
      headX = steps[k - 1].x + (steps[k].x - steps[k - 1].x) * s;
    }
  }

  const dimP = interpolate(frame, [rewindF + 10, rewindF + 22], [0, 1], clamp);
  const arcP = interpolate(frame, [rewindF, rewindF + 26], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const midX = (lastX + toX) / 2;
  const arc = `M ${lastX} ${Y - 50} Q ${midX} ${Y - 260} ${toX} ${Y - 50}`;

  // Kepala panah di ujung busur
  const dx = toX - midX;
  const dy = 210;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const wing = (a: number) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return { x: toX - 30 * (ux * c - uy * s), y: Y - 50 - 30 * (ux * s + uy * c) };
  };
  const w1 = wing(0.5);
  const w2 = wing(-0.5);
  const headOpacity = interpolate(arcP, [0.9, 1], [0, 1], clamp);

  const ringP = spring({ frame: Math.max(0, frame - (rewindF + 20)), fps, config: theme.motion.pop });
  const ringOn = frame >= rewindF + 20;
  const headVisible = frame >= steps[0].f;

  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }} fontFamily={theme.font.sans}>
        {xs.map((x, i) => {
          if (i === 0) return null;
          const p = interpolate(frame, [f(cuesMs[i] ?? 0), f(cuesMs[i] ?? 0) + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          if (p <= 0.001) return null;
          const x0 = xs[i - 1] + R;
          const x1 = x - R;
          return (
            <line key={`l${i}`} x1={x0} y1={Y} x2={x0 + (x1 - x0) * p} y2={Y} stroke={theme.colors.line} strokeWidth={8} strokeLinecap="round" />
          );
        })}

        {xs.map((x, i) => {
          const local = frame - nodeF(i);
          if (local < 0) return null;
          const s = spring({ frame: local, fps, config: theme.motion.pop });
          const broken = i > to ? dimP : 0;
          return (
            <g key={`n${i}`} transform={`translate(${x} ${Y}) scale(${s})`} opacity={1 - 0.45 * broken}>
              <circle r={R} fill="#0e1627" stroke={theme.colors.cyan} strokeWidth={7} />
              <circle r={R} fill="none" stroke={theme.colors.red} strokeWidth={7} opacity={broken} />
              <circle r={10} fill={broken > 0.5 ? theme.colors.red : theme.colors.cyan} />
              <text y={92} textAnchor="middle" fontSize={34} fontWeight={700} fill={theme.colors.inkSoft}>
                {labels[i]}
              </text>
            </g>
          );
        })}

        {ringOn ? (
          <circle cx={toX} cy={Y} r={R + 8 + 14 * ringP} fill="none" stroke={theme.colors.yellow} strokeWidth={6} opacity={ringP * 0.9} />
        ) : null}

        {arcP > 0.001 ? (
          <>
            <path d={arc} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - arcP} fill="none" stroke={theme.colors.yellow} strokeWidth={9} strokeLinecap="round" />
            <path d={`M ${w1.x} ${w1.y} L ${toX} ${Y - 50} L ${w2.x} ${w2.y}`} fill="none" stroke={theme.colors.yellow} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={headOpacity} />
            <text x={midX} y={Y - 195} textAnchor="middle" fontSize={50} fontWeight={800} fill={theme.colors.yellow} opacity={interpolate(frame, [rewindF + 12, rewindF + 24], [0, 1], clamp)}>
              {rewindLabel}
            </text>
          </>
        ) : null}

        {headVisible ? (
          <g transform={`translate(${headX} ${Y + 140})`}>
            <path d="M -12 0 L 0 -16 L 12 0 Z" fill={theme.colors.yellow} />
            <rect x={-62} y={0} width={124} height={50} rx={16} fill={theme.colors.yellow} />
            <text x={0} y={35} textAnchor="middle" fontSize={30} fontWeight={800} fill="#0b1220">
              {headLabel}
            </text>
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- (c) CloudSync: laptop dan awan, paket file naik-turun, tim tersambung ---------- */

const CLOUD = { x: 540, y: 560 };
const LAPTOPS = [
  { x: 540, y: 1120 }, // laptopmu
  { x: 190, y: 1120 }, // rekan kiri
  { x: 890, y: 1120 }, // rekan kanan
];
const anchorTop = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - 80 });
const cloudAnchor = { x: CLOUD.x, y: CLOUD.y + 90 };

const Packet: React.FC<{ from: { x: number; y: number }; to: { x: number; y: number }; startF: number; color: string }> = ({ from, to, startF, color }) => {
  const frame = useCurrentFrame();
  const dur = 28;
  const local = frame - startF;
  if (local < 0 || local > dur) return null;
  const p = interpolate(local, [0, dur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const x = from.x + (to.x - from.x) * p;
  const y = from.y + (to.y - from.y) * p;
  const op = Math.min(1, local / 4) * Math.min(1, (dur - local) / 4);
  return (
    <svg width={60} height={70} viewBox="0 0 100 100" style={{ position: "absolute", left: x - 30, top: y - 35, opacity: op, overflow: "visible" }} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round">
      <path d="M22 8H58L80 30V92H22Z" />
      <path d="M58 8V30H80" fill="none" />
    </svg>
  );
};

export const CloudSync: React.FC<{
  uploadMs: number[];
  teamMs: number[];
  downloadMs: number[];
  laptopMs?: number;
  cloudMs?: number;
}> = ({ uploadMs, teamMs, downloadMs, laptopMs = 300, cloudMs = 100 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = (ms: number) => msToFrames(ms, fps);
  const travel = 28;

  // Awan "berdenyut" setiap paket tiba.
  let bump = 0;
  uploadMs.forEach((ms) => {
    const t = frame - (f(ms) + travel);
    if (t >= 0 && t <= 10) bump = Math.max(bump, 1 - t / 10);
  });

  const appear = [laptopMs, teamMs[0] ?? 99999, teamMs[1] ?? 99999];

  const lineFor = (idx: number, appearMs: number) => {
    const start = Math.max(appearMs, cloudMs) + 6;
    const p = interpolate(frame, [f(start), f(start) + 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    if (p <= 0.001) return null;
    const a = anchorTop(LAPTOPS[idx]);
    return (
      <line key={`c${idx}`} x1={a.x} y1={a.y} x2={a.x + (cloudAnchor.x - a.x) * p} y2={a.y + (cloudAnchor.y - a.y) * p} stroke={theme.colors.line} strokeWidth={6} strokeDasharray="4 16" strokeLinecap="round" />
    );
  };

  return (
    <AbsoluteFill style={{ fontFamily: theme.font.sans }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {LAPTOPS.map((_, i) => lineFor(i, appear[i]))}
      </svg>

      <div style={{ position: "absolute", left: CLOUD.x - 190, top: CLOUD.y - 190, transform: `scale(${1 + 0.07 * bump})` }}>
        <Icon name="cloud" size={380} color={theme.colors.violet} delayMs={cloudMs} drawMs={700} />
      </div>

      {LAPTOPS.map((p, i) => (
        <div key={i} style={{ position: "absolute", left: p.x - 115, top: p.y - 115 }}>
          <Icon name="laptop" size={230} color={i === 0 ? theme.colors.cyan : theme.colors.green} delayMs={appear[i]} drawMs={600} />
        </div>
      ))}

      {uploadMs.map((ms, i) => (
        <Packet key={`u${i}`} from={anchorTop(LAPTOPS[0])} to={cloudAnchor} startF={f(ms)} color={theme.colors.yellow} />
      ))}
      {downloadMs.map((ms, i) => {
        const idx = 1 + (i % 2);
        if (ms < (appear[idx] ?? 0) + 400) return null;
        return <Packet key={`d${i}`} from={cloudAnchor} to={anchorTop(LAPTOPS[idx])} startF={f(ms)} color={theme.colors.orange} />;
      })}
    </AbsoluteFill>
  );
};

/* ---------- Ringkasan berbasis ikon ---------- */

type SummaryItem = { icon: string; label: string; text: string; color: string };

export const IconSummary: React.FC<{
  items: SummaryItem[];
  revealMs: number[];
  headline: string;
  headlineMs: number;
}> = ({ items, revealMs, headline, headlineMs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hf = msToFrames(headlineMs, fps);
  const hp = spring({ frame: Math.max(0, frame - hf), fps, config: theme.motion.pop });
  const colW = 940 / Math.max(1, items.length);

  return (
    <AbsoluteFill style={{ fontFamily: theme.font.sans }}>
      <div
        style={{
          position: "absolute",
          left: 70,
          width: 940,
          top: 420,
          textAlign: "center",
          color: theme.colors.ink,
          fontSize: 96,
          fontWeight: 800,
          lineHeight: 1.1,
          opacity: frame >= hf ? Math.min(1, (frame - hf) / 5) : 0,
          transform: `translateY(${(1 - hp) * 40}px) scale(${0.9 + 0.1 * hp})`,
          textShadow: "0 8px 30px rgba(0,0,0,0.5)",
        }}
      >
        {headline}
      </div>

      {items.map((it, i) => {
        const rf = msToFrames(revealMs[i] ?? 0, fps);
        const local = frame - rf;
        const p = spring({ frame: Math.max(0, local), fps, config: theme.motion.pop });
        return (
          <div key={i} style={{ position: "absolute", left: 70 + i * colW, width: colW, top: 640, textAlign: "center" }}>
            <Icon name={it.icon as IconName} size={Math.min(280, colW - 40)} color={it.color} delayMs={revealMs[i] ?? 0} drawMs={700} />
            <div
              style={{
                marginTop: 18,
                color: it.color,
                fontSize: 64,
                fontWeight: 800,
                opacity: local >= 0 ? Math.min(1, local / 6) : 0,
                transform: `translateY(${(1 - p) * 24}px)`,
              }}
            >
              {it.label}
            </div>
            <div
              style={{
                marginTop: 6,
                color: theme.colors.inkSoft,
                fontSize: 40,
                fontWeight: 600,
                opacity: local >= 4 ? Math.min(1, (local - 4) / 6) : 0,
              }}
            >
              {it.text}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};