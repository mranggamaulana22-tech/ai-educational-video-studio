import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";

// Mengembalikan fungsi: progres pegas (0 sampai 1) untuk sebuah cue dalam milidetik
// sejak scene mulai. Sebelum cue tiba hasilnya 0.
export const usePop = (config: object = theme.motion.pop) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (atMs: number) => {
    const local = frame - Math.round((atMs / 1000) * fps);
    if (local < 0) return 0;
    return spring({ frame: local, fps, config });
  };
};

export const fade = (p: number) => Math.min(1, p * 3);
