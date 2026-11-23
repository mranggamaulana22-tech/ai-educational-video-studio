import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { theme } from "./theme";
import { fade, usePop } from "./fx";
import { FunIcon } from "./FunIcons";

const IconBadge: React.FC<{ name?: string; color?: string; size: number; p: number; motion?: any; phase?: number }> = ({ name, color, size, p, motion, phase }) =>
  name ? (
    <div style={{ opacity: fade(p), transform: `scale(${interpolate(p, [0, 1], [0.2, 1])}) rotate(${interpolate(p, [0, 1], [-25, 0])}deg)` }}>
      <FunIcon name={name} size={size} color={color} motion={motion ?? "float"} phase={phase ?? 0} />
    </div>
  ) : null;

// Scene umum gaya fun: semua isi (teks, warna, jumlah item) datang dari props JSON.
// cuesMs = waktu muncul (ms sejak scene mulai). Kalau kosong, muncul berurutan otomatis.

const INK = theme.colors.ink;
const FONT = theme.font.sans;

export type ColorName = "teal" | "orange" | "violet" | "red" | "green" | "yellow";

const COLORS: Record<ColorName, { bg: string; fg: string }> = {
  teal: { bg: theme.colors.cyan, fg: "#ffffff" },
  orange: { bg: theme.colors.orange, fg: INK },
  violet: { bg: theme.colors.violet, fg: "#ffffff" },
  red: { bg: theme.colors.red, fg: "#ffffff" },
  green: { bg: theme.colors.green, fg: "#ffffff" },
  yellow: { bg: theme.colors.yellow, fg: INK },
};
const col = (c?: string) => COLORS[(c as ColorName) ?? "teal"] ?? COLORS.teal;

// Waktu cue ke-i: pakai cuesMs kalau ada, kalau tidak 300 ms + i * jarak.
const cueAt = (cues: number[] | undefined, i: number, gap = 900) => cues?.[i] ?? 300 + i * gap;

const Area: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 36 }) => (
  <AbsoluteFill>
    <div
      style={{
        position: "absolute",
        top: 330,
        left: theme.safe.side,
        right: theme.safe.side,
        height: 760,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap,
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

const Heading: React.FC<{ text: string; p: number }> = ({ text, p }) => (
  <div
    style={{
      opacity: fade(p),
      transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 56,
      color: INK,
      textAlign: "center",
      lineHeight: 1.15,
    }}
  >
    {text}
  </div>
);

// ---------- 1. BigStatement: 1-4 baris besar berwarna ----------

export const BigStatement: React.FC<{
  kicker?: string;
  icon?: string;
  iconColor?: string;
  lines: { text: string; color?: string }[];
  cuesMs?: number[];
}> = ({ kicker, icon, iconColor, lines, cuesMs }) => {
  const pop = usePop();
  return (
    <Area gap={32}>
      <IconBadge name={icon} color={iconColor ?? lines[0]?.color} size={300} p={pop(150)} motion="float" />
      {kicker ? <Heading text={kicker} p={pop(cueAt(cuesMs, 0, 700) - 100)} /> : null}
      {lines.map((l, i) => {
        const p = pop(cueAt(cuesMs, i + (kicker ? 0 : 0), 900));
        const c = col(l.color);
        return (
          <div
            key={i}
            style={{
              opacity: fade(p),
              transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
              background: c.bg,
              color: c.fg,
              border: `8px solid ${INK}`,
              borderRadius: 70,
              padding: "22px 56px",
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 84,
              lineHeight: 1.1,
              textAlign: "center",
              boxShadow: `0 10px 0 ${INK}`,
            }}
          >
            {l.text}
          </div>
        );
      })}
    </Area>
  );
};

// ---------- 2. CompareCards: dua kartu berdampingan ----------

type Side = { title: string; color?: string; icon?: string; items: string[] };

const SideCard: React.FC<{ side: Side; p: number; pop: (ms: number) => number; at: number }> = ({ side, p, pop, at }) => {
  const c = col(side.color);
  return (
    <div
      style={{
        flex: 1,
        background: theme.colors.card,
        border: `7px solid ${INK}`,
        borderRadius: 28,
        overflow: "hidden",
        boxShadow: `0 10px 0 ${INK}`,
        opacity: fade(p),
        transform: `translateY(${interpolate(p, [0, 1], [60, 0])}px)`,
      }}
    >
      <div
        style={{
          background: c.bg,
          color: c.fg,
          padding: "22px 12px",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 44,
          borderBottom: `7px solid ${INK}`,
        }}
      >
        {side.title}
      </div>
      <div style={{ padding: "26px 26px 30px", display: "flex", flexDirection: "column", gap: 22, alignItems: "stretch" }}>
        {side.icon ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <IconBadge name={side.icon} color={side.color} size={170} p={p} motion="wiggle" />
          </div>
        ) : null}
        {side.items.map((t, i) => {
          const q = pop(at + 500 + i * 500);
          return (
            <div
              key={i}
              style={{
                opacity: fade(q),
                transform: `translateX(${interpolate(q, [0, 1], [-30, 0])}px)`,
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 42,
                color: INK,
                lineHeight: 1.2,
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <span style={{ color: c.bg, fontSize: 38 }}>●</span>
              <span>{t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CompareCards: React.FC<{
  heading?: string;
  left: Side;
  right: Side;
  cuesMs?: number[]; // [judul, kartu kiri, kartu kanan]
}> = ({ heading, left, right, cuesMs }) => {
  const pop = usePop();
  const a = cueAt(cuesMs, 1, 1500);
  const b = cueAt(cuesMs, 2, 1500);
  return (
    <Area>
      {heading ? <Heading text={heading} p={pop(cueAt(cuesMs, 0, 300))} /> : null}
      <div style={{ display: "flex", gap: 28, width: "100%", alignItems: "flex-start" }}>
        <SideCard side={left} p={pop(a)} pop={pop} at={a} />
        <SideCard side={right} p={pop(b)} pop={pop} at={b} />
      </div>
    </Area>
  );
};

// ---------- 3. FlowSteps: langkah berurutan dengan panah ----------

export const FlowSteps: React.FC<{
  heading?: string;
  steps: { label: string; color?: string; icon?: string }[];
  cuesMs?: number[]; // [judul, langkah 1, langkah 2, ...]
}> = ({ heading, steps, cuesMs }) => {
  const pop = usePop();
  return (
    <Area gap={14}>
      {heading ? <Heading text={heading} p={pop(cueAt(cuesMs, 0, 300))} /> : null}
      {steps.map((s, i) => {
        const p = pop(cueAt(cuesMs, i + 1, 800));
        const c = col(s.color);
        return (
          <React.Fragment key={i}>
            {i > 0 ? (
              <div
                style={{
                  opacity: fade(p),
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: 56,
                  color: INK,
                  lineHeight: 1,
                }}
              >
                ↓
              </div>
            ) : null}
            <div
              style={{
                opacity: fade(p),
                transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
                background: c.bg,
                color: c.fg,
                border: `7px solid ${INK}`,
                borderRadius: 40,
                padding: "14px 50px 14px 30px",
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 58,
                boxShadow: `0 8px 0 ${INK}`,
                display: "flex",
                alignItems: "center",
                gap: 22,
              }}
            >
              {s.icon ? <FunIcon name={s.icon} size={96} color={s.color === "yellow" ? "violet" : "yellow"} motion={i % 2 ? "wiggle" : "float"} phase={i} /> : null}
              <span>{s.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </Area>
  );
};

// ---------- 4. CardList: daftar poin bernomor ----------

export const CardList: React.FC<{
  heading?: string;
  items: { text: string; color?: string; icon?: string }[];
  cuesMs?: number[]; // [judul, poin 1, poin 2, ...]
}> = ({ heading, items, cuesMs }) => {
  const pop = usePop();
  return (
    <Area gap={22}>
      {heading ? <Heading text={heading} p={pop(cueAt(cuesMs, 0, 300))} /> : null}
      {items.map((it, i) => {
        const p = pop(cueAt(cuesMs, i + 1, 1000));
        const c = col(it.color ?? (["teal", "orange", "violet", "red", "green"] as const)[i % 5]);
        return (
          <div
            key={i}
            style={{
              width: "100%",
              opacity: fade(p),
              transform: `translateX(${interpolate(p, [0, 1], [-80, 0])}px)`,
              display: "flex",
              alignItems: "center",
              gap: 24,
              background: theme.colors.card,
              border: `7px solid ${INK}`,
              borderRadius: 30,
              padding: "20px 28px",
              boxShadow: `0 8px 0 ${INK}`,
            }}
          >
            <div
              style={{
                flex: "0 0 auto",
                width: 96,
                height: 96,
                borderRadius: 48,
                background: it.icon ? "transparent" : c.bg,
                color: c.fg,
                border: it.icon ? "none" : `6px solid ${INK}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 42,
              }}
            >
              {it.icon ? <FunIcon name={it.icon} size={72} color={it.color ?? "teal"} motion="wiggle" phase={i} /> : i + 1}
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 50, color: INK, lineHeight: 1.15 }}>{it.text}</div>
          </div>
        );
      })}
    </Area>
  );
};

// ---------- 5. CtaCard: penutup / ajakan ----------

export const CtaCard: React.FC<{
  title: string;
  subtitle?: string;
  button?: string;
  color?: string;
  icon?: string;
  cuesMs?: number[]; // [judul, subjudul, tombol]
}> = ({ title, subtitle, button, color, icon, cuesMs }) => {
  const pop = usePop();
  const c = col(color ?? "orange");
  const p0 = pop(cueAt(cuesMs, 0, 600));
  const p1 = pop(cueAt(cuesMs, 1, 600));
  const p2 = pop(cueAt(cuesMs, 2, 600));
  return (
    <Area gap={40}>
      <IconBadge name={icon} color={color ?? "orange"} size={260} p={p0} motion="float" />
      <div
        style={{
          opacity: fade(p0),
          transform: `scale(${interpolate(p0, [0, 1], [0.7, 1])})`,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 88,
          color: INK,
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            opacity: fade(p1),
            transform: `translateY(${interpolate(p1, [0, 1], [30, 0])}px)`,
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 50,
            color: theme.colors.inkSoft,
            textAlign: "center",
          }}
        >
          {subtitle}
        </div>
      ) : null}
      {button ? (
        <div
          style={{
            opacity: fade(p2),
            transform: `scale(${interpolate(p2, [0, 1], [0.6, 1])})`,
            background: c.bg,
            color: c.fg,
            border: `8px solid ${INK}`,
            borderRadius: 80,
            padding: "24px 70px",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 60,
            boxShadow: `0 10px 0 ${INK}`,
          }}
        >
          {button}
        </div>
      ) : null}
    </Area>
  );
};

// ---------- 6. IconHero: satu ikon besar bergerak + judul ----------

export const IconHero: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  color?: string;
  motion?: "float" | "wiggle" | "pulse" | "spin" | "none";
  cuesMs?: number[]; // [ikon, judul, subjudul]
}> = ({ icon, title, subtitle, color, motion, cuesMs }) => {
  const pop = usePop();
  const p0 = pop(cueAt(cuesMs, 0, 700));
  const p1 = pop(cueAt(cuesMs, 1, 700));
  const p2 = pop(cueAt(cuesMs, 2, 700));
  const c = col(color);
  return (
    <Area gap={36}>
      <div
        style={{
          width: 420,
          height: 420,
          borderRadius: 210,
          background: c.bg,
          opacity: fade(p0) * 0.22,
          position: "absolute",
          top: 20,
          transform: `scale(${interpolate(p0, [0, 1], [0.3, 1])})`,
        }}
      />
      <IconBadge name={icon} color={color} size={340} p={p0} motion={motion ?? "float"} />
      <div
        style={{
          opacity: fade(p1),
          transform: `scale(${interpolate(p1, [0, 1], [0.7, 1])})`,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 92,
          color: INK,
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            opacity: fade(p2),
            transform: `translateY(${interpolate(p2, [0, 1], [30, 0])}px)`,
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 52,
            color: theme.colors.inkSoft,
            textAlign: "center",
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </Area>
  );
};

// ---------- 7. IconGrid: 2-4 ikon besar dengan label ----------

export const IconGrid: React.FC<{
  heading?: string;
  items: { icon: string; label: string; color?: string }[];
  cuesMs?: number[]; // [judul, item 1, item 2, ...]
}> = ({ heading, items, cuesMs }) => {
  const pop = usePop();
  return (
    <Area gap={30}>
      {heading ? <Heading text={heading} p={pop(cueAt(cuesMs, 0, 300))} /> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 28, justifyContent: "center", width: "100%" }}>
        {items.map((it, i) => {
          const p = pop(cueAt(cuesMs, i + 1, 900));
          return (
            <div
              key={i}
              style={{
                width: items.length === 3 ? 300 : 440,
                opacity: fade(p),
                transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
                background: theme.colors.card,
                border: `7px solid ${INK}`,
                borderRadius: 34,
                boxShadow: `0 10px 0 ${INK}`,
                padding: "26px 16px 22px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
              }}
            >
              <FunIcon name={it.icon} size={items.length === 3 ? 160 : 210} color={it.color ?? (["teal", "orange", "violet", "green"] as const)[i % 4]} motion={(["float", "wiggle", "pulse", "float"] as const)[i % 4]} phase={i * 0.7} />
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, color: INK, textAlign: "center", lineHeight: 1.1 }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </Area>
  );
};
