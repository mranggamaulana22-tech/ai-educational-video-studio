import { loadFont } from "@remotion/google-fonts/Fredoka";

// Memuat font bulat tebal. Dipanggil sekali saat file ini diimpor.
const { fontFamily: fredoka } = loadFont("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
});

export const theme = {
  colors: {
    bg0: "#fdf3df", // krem utama
    bg1: "#fff8ea", // krem terang
    ink: "#1b2a4a", // biru tua untuk teks dan garis tepi
    inkSoft: "#5b6b8a",
    line: "#e3d5b8", // titik-titik latar
    card: "#ffffff",
    cyan: "#0f8f7e", // sekarang teal (warna Engineer)
    green: "#22a06b",
    yellow: "#ffc928",
    orange: "#fb923c", // warna Developer
    red: "#e5484d",
    violet: "#7c5ce6",
  },
  font: {
    sans: `${fredoka}, 'Segoe UI', Arial, sans-serif`,
    mono: "Consolas, 'Courier New', monospace",
  },
  // Area aman Reels: atas dan bawah tertutup UI Instagram.
  safe: { top: 260, bottom: 420, side: 70 },
  // Semua gerak memakai pegas ini supaya terasa seragam.
  motion: {
    pop: { damping: 11, stiffness: 140, mass: 0.8 },
    smooth: { damping: 200 },
    soft: { damping: 20, stiffness: 90 },
    fadeFrames: 10,
  },
} as const;