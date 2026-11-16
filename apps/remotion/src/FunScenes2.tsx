import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { fade, usePop } from "./fx";

const INK = theme.colors.ink;
const FONT = theme.font.sans;

// ---------- Bagian kecil yang dipakai bersama ----------

const Tag: React.FC<{ label: string; bg: string; fg: string; dim: number }> = ({ label, bg, fg, dim }) => (
  <div
    style={{
      opacity: dim,
      background: bg,
      color: fg,
      border: `6px solid ${INK}`,
      borderRadius: 60,
      padding: "14px 44px",
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 46,
      letterSpacing: 2,
    }}
  >
    {label}
  </div>
);

const Pill: React.FC<{ label: string; bg: string; fg: string; p: number; strike?: number }> = ({
  label,
  bg,
  fg,
  p,
  strike = 0,
}) => (
  <div
    style={{
      position: "relative",
      opacity: fade(p) * (1 - 0.45 * strike),
      transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
      background: bg,
      color: fg,
      border: `8px solid ${INK}`,
      borderRadius: 90,
      padding: "26px 70px",
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 68,
      boxShadow: `0 10px 0 ${INK}`,
    }}
  >
    {label}
    <div
      style={{
        position: "absolute",
        left: 30,
        top: "50%",
        marginTop: -7,
        height: 14,
        width: `calc((100% - 60px) * ${strike})`,
        borderRadius: 7,
        background: theme.colors.red,
      }}
    />
  </div>
);

const Bar: React.FC<{ w: string; p: number; color: string }> = ({ w, p, color }) => (
  <div
    style={{
      width: w,
      height: 40,
      marginBottom: 20,
      borderRadius: 14,
      background: color,
      border: `5px solid ${INK}`,
      transformOrigin: "left center",
      transform: `scaleX(${interpolate(p, [0, 1], [0, 1])})`,
      opacity: fade(p),
    }}
  />
);

// ---------- 1. Developer membangun bagiannya ----------

const FeatureCard: React.FC<{ title: string; p: number; children: React.ReactNode }> = ({ title, p, children }) => (
  <div
    style={{
      width: 440,
      height: 390,
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
        background: theme.colors.orange,
        padding: "22px 0",
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 42,
        color: INK,
        borderBottom: `7px solid ${INK}`,
      }}
    >
      {title}
    </div>
    <div style={{ padding: "36px 36px 0" }}>{children}</div>
  </div>
);

export const DeveloperScene: React.FC<{
  // [tag berganti, kartu A, centang A, kartu B] dalam ms sejak scene mulai
  cuesMs?: number[];
}> = ({ cuesMs = [200, 3000, 4300, 4700] }) => {
  const pop = usePop();
  const smooth = usePop(theme.motion.smooth);
  const sw = smooth(cuesMs[0]);
  const pA = pop(cuesMs[1]);
  const pCheck = pop(cuesMs[2]);
  const pB = pop(cuesMs[3]);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 290, width: "100%", display: "flex", justifyContent: "center", gap: 40 }}>
        <Tag label="ENGINEER" bg={theme.colors.cyan} fg="#ffffff" dim={interpolate(sw, [0, 1], [1, 0.35])} />
        <Tag label="DEVELOPER" bg={theme.colors.orange} fg={INK} dim={interpolate(sw, [0, 1], [0.35, 1])} />
      </div>

      <div style={{ position: "absolute", top: 450, left: 80 }}>
        <FeatureCard title="Sistem pemesanan" p={pA}>
          <Bar w="100%" p={pop(cuesMs[1] + 200)} color="#ffc08a" />
          <Bar w="88%" p={pop(cuesMs[1] + 400)} color="#ffc08a" />
          <Bar w="100%" p={pop(cuesMs[1] + 600)} color="#ffc08a" />
        </FeatureCard>
        <div
          style={{
            position: "absolute",
            top: -26,
            right: -26,
            width: 84,
            height: 84,
            borderRadius: 42,
            background: theme.colors.green,
            border: `6px solid ${INK}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: fade(pCheck),
            transform: `scale(${interpolate(pCheck, [0, 1], [0.2, 1])})`,
          }}
        >
          <svg width={48} height={48} viewBox="0 0 48 48">
            <path d="M10 25 l10 10 l19 -22" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div style={{ position: "absolute", top: 450, left: 560 }}>
        <FeatureCard title="Fitur pembayaran" p={pB}>
          <div style={{ height: 6, background: theme.colors.red, borderRadius: 3, marginBottom: 34, width: "100%" }} />
          <Bar w="100%" p={pop(cuesMs[3] + 200)} color="#ffc08a" />
          <Bar w="62%" p={pop(cuesMs[3] + 400)} color="#ffc08a" />
        </FeatureCard>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 2. Engineer vs Developer ----------

const GearIcon: React.FC<{ t: number }> = ({ t }) => (
  <svg width={52} height={52} viewBox="0 0 52 52">
    <g transform={`translate(26 26) rotate(${t * 40})`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={-5} y={-24} width={10} height={14} rx={3} fill="#fff" transform={`rotate(${i * 45})`} />
      ))}
      <circle r={16} fill="#fff" />
      <circle r={7} fill={theme.colors.cyan} />
    </g>
  </svg>
);

const RoleCard: React.FC<{
  head: React.ReactNode;
  headBg: string;
  headFg: string;
  title: string;
  lines: string[];
  p: number;
}> = ({ head, headBg, headFg, title, lines, p }) => (
  <div
    style={{
      width: 450,
      height: 470,
      background: theme.colors.card,
      border: `7px solid ${INK}`,
      borderRadius: 28,
      overflow: "hidden",
      boxShadow: `0 10px 0 ${INK}`,
      opacity: fade(p),
      transform: `translateY(${interpolate(p, [0, 1], [60, 0])}px) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
    }}
  >
    <div
      style={{
        background: headBg,
        color: headFg,
        padding: "20px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 44,
        borderBottom: `7px solid ${INK}`,
      }}
    >
      {head}
      {title}
    </div>
    <div style={{ padding: "36px 36px 0", fontFamily: FONT, fontSize: 38, lineHeight: 1.35, color: INK }}>
      <div style={{ fontWeight: 700, fontSize: 46, marginBottom: 10 }}>{lines[0]}</div>
      {lines.slice(1).map((l) => (
        <div key={l} style={{ fontWeight: 500, color: theme.colors.inkSoft }}>
          {l}
        </div>
      ))}
    </div>
  </div>
);

export const CompareScene: React.FC<{
  // [kartu Engineer, kartu Developer] dalam ms sejak scene mulai
  cuesMs?: number[];
}> = ({ cuesMs = [200, 3900] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pop = usePop();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 400, left: 60 }}>
        <RoleCard
          head={<GearIcon t={t} />}
          headBg={theme.colors.cyan}
          headFg="#ffffff"
          title="ENGINEER"
          lines={["Gambaran besar", "Sistem dirancang", "biar kuat"]}
          p={pop(cuesMs[0])}
        />
      </div>
      <div style={{ position: "absolute", top: 400, left: 570 }}>
        <RoleCard
          head={<span style={{ fontFamily: theme.font.mono }}>{"</>"}</span>}
          headBg={theme.colors.orange}
          headFg={INK}
          title="DEVELOPER"
          lines={["Bangun bagiannya", "Fitur dipastikan", "jalan dengan benar"]}
          p={pop(cuesMs[1])}
        />
      </div>
    </AbsoluteFill>
  );
};

// ---------- 3. Venn: tumpang tindih ----------

export const VennScene: React.FC<{
  // [pil, lingkaran Engineer, lingkaran Developer, tulisan tumpang tindih]
  cuesMs?: number[];
}> = ({ cuesMs = [200, 1800, 2300, 3900] }) => {
  const pop = usePop();
  const pPill = pop(cuesMs[0]);
  const pE = pop(cuesMs[1]);
  const pD = pop(cuesMs[2]);
  const pO = pop(cuesMs[3]);
  const R = 250;
  const label: React.CSSProperties = {
    position: "absolute",
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 48,
    color: INK,
    textAlign: "center",
  };
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 290, width: "100%", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            opacity: fade(pPill),
            transform: `scale(${interpolate(pPill, [0, 1], [0.6, 1])})`,
            background: theme.colors.yellow,
            border: `6px solid ${INK}`,
            borderRadius: 50,
            padding: "10px 40px",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 42,
            color: INK,
          }}
        >
          gambaran umum
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 380 - R,
          top: 680 - R,
          width: R * 2,
          height: R * 2,
          borderRadius: R,
          background: "rgba(15,143,126,0.62)",
          border: `6px solid ${INK}`,
          opacity: fade(pE),
          transform: `scale(${interpolate(pE, [0, 1], [0.5, 1])})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 700 - R,
          top: 680 - R,
          width: R * 2,
          height: R * 2,
          borderRadius: R,
          background: "rgba(251,146,60,0.68)",
          border: `6px solid ${INK}`,
          opacity: fade(pD),
          transform: `scale(${interpolate(pD, [0, 1], [0.5, 1])})`,
        }}
      />
      <div style={{ ...label, left: 160, top: 650, width: 240, opacity: fade(pE) }}>Engineer</div>
      <div style={{ ...label, left: 690, top: 650, width: 260, opacity: fade(pD) }}>Developer</div>
      <div
        style={{
          ...label,
          left: 440,
          top: 630,
          width: 200,
          fontSize: 36,
          lineHeight: 1.1,
          opacity: fade(pO),
          transform: `scale(${interpolate(pO, [0, 1], [0.5, 1])})`,
        }}
      >
        tumpang
        <br />
        tindih
      </div>
    </AbsoluteFill>
  );
};

// ---------- 4. Title dicoret ----------

export const StrikeScene: React.FC<{
  // [pil A, pil B, coret A, coret B]
  cuesMs?: number[];
}> = ({ cuesMs = [100, 400, 900, 1300] }) => {
  const pop = usePop();
  const smooth = usePop(theme.motion.smooth);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 420 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 54, alignItems: "center" }}>
        <Pill label="Software Engineer" bg={theme.colors.cyan} fg="#ffffff" p={pop(cuesMs[0])} strike={smooth(cuesMs[2])} />
        <Pill label="Software Developer" bg={theme.colors.orange} fg={INK} p={pop(cuesMs[1])} strike={smooth(cuesMs[3])} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- 5. Software yang beneran dipakai orang ----------

const Heart: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z"
      fill={theme.colors.red}
      stroke={INK}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  </svg>
);

const Person: React.FC<{ color: string }> = ({ color }) => (
  <svg width={150} height={170} viewBox="0 0 150 170">
    <path d="M20 170 a55 60 0 0 1 110 0 z" fill={color} stroke={INK} strokeWidth={6} />
    <circle cx={75} cy={62} r={44} fill="#ffe2bd" stroke={INK} strokeWidth={6} />
    <circle cx={60} cy={58} r={5} fill={INK} />
    <circle cx={90} cy={58} r={5} fill={INK} />
    <path d="M58 76 q17 16 34 0" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
  </svg>
);

export const LaptopScene: React.FC<{
  // [laptop, isi layar, centang, orang]
  cuesMs?: number[];
}> = ({ cuesMs = [100, 600, 1300, 1800] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pop = usePop();
  const pL = pop(cuesMs[0]);
  const pC = pop(cuesMs[1]);
  const pK = pop(cuesMs[2]);
  const pP = pop(cuesMs[3]);
  const blk = (p: number): React.CSSProperties => ({
    opacity: fade(p),
    transformBox: "fill-box",
    transformOrigin: "left center",
    transform: `scaleX(${interpolate(p, [0, 1], [0.2, 1])})`,
  });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 380,
          left: 160,
          opacity: fade(pL),
          transform: `translateY(${interpolate(pL, [0, 1], [80, 0])}px) scale(${interpolate(pL, [0, 1], [0.85, 1])})`,
        }}
      >
        <svg width={760} height={564} viewBox="0 0 620 460">
          <rect x={40} y={20} width={540} height={330} rx={26} fill={INK} />
          <rect x={62} y={42} width={496} height={286} rx={12} fill="#fff" />
          <path d="M62 54 a12 12 0 0 1 12 -12 h472 a12 12 0 0 1 12 12 v32 h-496 z" fill={theme.colors.cyan} />
          {[88, 112, 136].map((x) => (
            <circle key={x} cx={x} cy={64} r={7} fill="#fff" />
          ))}
          <g style={blk(pC)}>
            <rect x={84} y={110} width={170} height={170} rx={14} fill="#dff4ef" />
          </g>
          <g style={blk(pC)}>
            <rect x={280} y={116} width={250} height={44} rx={10} fill="#ffe1c4" />
          </g>
          <g style={blk(pop(cuesMs[1] + 250))}>
            <rect x={280} y={180} width={250} height={44} rx={10} fill="#e7e0ff" />
          </g>
          <g style={blk(pop(cuesMs[1] + 500))}>
            <rect x={280} y={244} width={190} height={36} rx={10} fill="#dff4ef" />
          </g>
          <g
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              opacity: fade(pK),
              transform: `scale(${interpolate(pK, [0, 1], [0.2, 1])})`,
            }}
          >
            <circle cx={169} cy={195} r={46} fill={theme.colors.green} stroke={INK} strokeWidth={6} />
            <path d="M148 196 l15 15 l28 -32" fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <rect x={10} y={350} width={600} height={24} rx={12} fill="#c3cbe0" stroke={INK} strokeWidth={6} />
        </svg>
      </div>

      {[
        { left: 20, color: theme.colors.violet, ph: 0 },
        { left: 910, color: theme.colors.orange, ph: 1.7 },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", left: s.left, top: 760, opacity: fade(pP), transform: `translateY(${interpolate(pP, [0, 1], [60, 0])}px)` }}>
          <Person color={s.color} />
          {[0, 1].map((h) => {
            const u = ((t * 0.5 + s.ph * 0.2 + h * 0.5) % 1);
            return (
              <div
                key={h}
                style={{
                  position: "absolute",
                  left: 55 + (h ? 36 : -20) * (i ? -1 : 1),
                  top: -20 - u * 130,
                  opacity: Math.sin(u * Math.PI) * fade(pP),
                  transform: `scale(${0.7 + 0.5 * u})`,
                }}
              >
                <Heart size={54} />
              </div>
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ---------- 6. SDLC ----------

const STEPS = ["Ide", "Desain", "Bangun", "Tes", "Rilis"];

export const SdlcScene: React.FC<{
  // [judul, langkah 1..5] dalam ms sejak scene mulai
  cuesMs?: number[];
}> = ({ cuesMs = [300, 3200, 3700, 4200, 4600, 5000] }) => {
  const pop = usePop();
  const smooth = usePop(theme.motion.smooth);
  const pTitle = pop(cuesMs[0]);
  const W = 860;
  const D = 112;
  const frac = (smooth(cuesMs[2]) + smooth(cuesMs[3]) + smooth(cuesMs[4]) + smooth(cuesMs[5])) / 4;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 330,
          width: "100%",
          textAlign: "center",
          opacity: fade(pTitle),
          transform: `scale(${interpolate(pTitle, [0, 1], [0.7, 1])})`,
        }}
      >
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 190, lineHeight: 1, color: theme.colors.violet }}>SDLC</div>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 40, color: theme.colors.inkSoft, marginTop: 14 }}>
          Software Development Life Cycle
        </div>
      </div>

      <div style={{ position: "absolute", top: 740, left: (1080 - W) / 2, width: W }}>
        <div style={{ position: "absolute", top: D / 2 - 6, left: D / 2, width: W - D, height: 12, borderRadius: 6, background: "#cfd6e8" }} />
        <div
          style={{
            position: "absolute",
            top: D / 2 - 6,
            left: D / 2,
            width: (W - D) * frac,
            height: 12,
            borderRadius: 6,
            background: theme.colors.violet,
          }}
        />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
          {STEPS.map((s, i) => {
            const p = pop(cuesMs[i + 1]);
            const active = p > 0.2;
            return (
              <div key={s} style={{ width: D, textAlign: "center" }}>
                <div
                  style={{
                    width: D,
                    height: D,
                    borderRadius: D / 2,
                    background: active ? theme.colors.violet : theme.colors.card,
                    color: active ? "#fff" : INK,
                    border: `7px solid ${INK}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT,
                    fontWeight: 700,
                    fontSize: 54,
                    transform: `scale(${active ? interpolate(p, [0, 1], [0.7, 1.08]) : 1})`,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ marginTop: 18, fontFamily: FONT, fontWeight: 700, fontSize: 38, color: INK }}>{s}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 7. Penutup: Follow ----------

const CONFETTI = [theme.colors.orange, theme.colors.violet, theme.colors.cyan, theme.colors.yellow, theme.colors.red];

export const CtaScene: React.FC<{
  // [tombol, confetti, titik perjalanan] dalam ms sejak scene mulai
  cuesMs?: number[];
}> = ({ cuesMs = [300, 700, 1500] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pop = usePop();
  const pBtn = pop(cuesMs[0]);
  const tc = Math.max(0, t - cuesMs[1] / 1000);
  const W = 940;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 330,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: fade(pBtn),
          transform: `scale(${interpolate(pBtn, [0, 1], [0.5, 1]) * (1 + 0.03 * Math.sin(t * 6))})`,
        }}
      >
        <div
          style={{
            background: theme.colors.orange,
            border: `8px solid ${INK}`,
            borderRadius: 100,
            padding: "26px 110px",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 96,
            color: INK,
            boxShadow: `0 12px 0 ${INK}`,
          }}
        >
          Follow
        </div>
      </div>

      {tc > 0 &&
        Array.from({ length: 34 }).map((_, i) => {
          const a = random(`a${i}`) * Math.PI * 2;
          const v = 350 + random(`v${i}`) * 500;
          const x = 540 + Math.cos(a) * v * tc * 0.9;
          const y = 440 + Math.sin(a) * v * tc * 0.7 + 900 * tc * tc * 0.5;
          const size = 14 + random(`s${i}`) * 14;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: size,
                height: size * 0.55,
                background: CONFETTI[i % CONFETTI.length],
                opacity: Math.max(0, 1 - tc / 1.8),
                transform: `rotate(${tc * 400 * (random(`r${i}`) - 0.5) * 2}deg)`,
              }}
            />
          );
        })}

      <div style={{ position: "absolute", top: 640, left: (1080 - W) / 2, width: W, textAlign: "center" }}>
        <div
          style={{
            opacity: fade(pop(cuesMs[2])),
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 42,
            color: theme.colors.inkSoft,
            marginBottom: 30,
          }}
        >
          perjalanan 15 course
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {Array.from({ length: 15 }).map((_, i) => {
            const p = pop(cuesMs[2] + 70 * i);
            const bg = i === 0 ? theme.colors.yellow : theme.colors.card;
            return (
              <div
                key={i}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: bg,
                  border: `5px ${i === 1 ? "dashed" : "solid"} ${i === 1 ? theme.colors.violet : INK}`,
                  opacity: fade(p),
                  transform: `scale(${interpolate(p, [0, 1], [0.3, 1])})`,
                }}
              />
            );
          })}
        </div>
        <div style={{ position: "relative", height: 50, marginTop: 14, opacity: fade(pop(cuesMs[2] + 600)) }}>
          <div style={{ position: "absolute", left: 0, fontFamily: FONT, fontWeight: 700, fontSize: 32, color: INK }}>Hari 1</div>
          <div style={{ position: "absolute", left: 135, fontFamily: FONT, fontWeight: 700, fontSize: 32, color: theme.colors.violet }}>
            Besok: SDLC
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
