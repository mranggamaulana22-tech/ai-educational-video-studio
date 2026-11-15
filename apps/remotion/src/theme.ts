export const theme = {
  colors: {
    bg0: "#070b14",
    bg1: "#0e1627",
    ink: "#f4f7ff",
    inkSoft: "#9fb0cc",
    line: "#24344f",
    cyan: "#35e0ff",
    green: "#4ade80",
    yellow: "#ffd04d",
    orange: "#ff8a3d",
    red: "#ff5c6c",
    violet: "#a78bfa",
  },
  font: {
    sans: "'Segoe UI', Arial, Helvetica, sans-serif",
    mono: "Consolas, 'Courier New', monospace",
  },
  // Area aman Reels: atas dan bawah tertutup UI Instagram.
  safe: { top: 260, bottom: 420, side: 70 },
  // Semua gerak memakai pegas ini supaya terasa seragam dan mulus.
  motion: {
    pop: { damping: 11, stiffness: 140, mass: 0.8 }, // muncul dengan pantulan
    smooth: { damping: 200 }, // geser halus tanpa pantulan
    soft: { damping: 20, stiffness: 90 }, // melayang pelan
    fadeFrames: 10,
  },
} as const;