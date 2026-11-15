import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

export type TransitionName = "none" | "fade" | "slide" | "zoom" | "wipe";

export const TRANSITION_OVERLAP = 10; // frame tumpang tindih dengan scene berikutnya
const IN_FRAMES = 14;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const SceneTransition: React.FC<{
  type: TransitionName;
  total: number; // total frame scene ini (sudah termasuk tumpang tindih)
  hasOut: boolean; // scene terakhir tidak punya gerak keluar
  children: React.ReactNode;
}> = ({ type, total, hasOut, children }) => {
  const frame = useCurrentFrame();

  const pIn = interpolate(frame, [0, IN_FRAMES], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const pOut = hasOut
    ? interpolate(frame, [total - TRANSITION_OVERLAP, total], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) })
    : 0;

  const opacity = pIn * (1 - pOut);
  let style: React.CSSProperties = { opacity };

  if (type === "slide") {
    style = { opacity, transform: `translateX(${(1 - pIn) * 160 - pOut * 160}px)` };
  } else if (type === "zoom") {
    style = { opacity, transform: `scale(${0.9 + 0.1 * pIn + 0.08 * pOut})` };
  } else if (type === "wipe") {
    style = { clipPath: `inset(0 ${(1 - pIn) * 100}% 0 ${pOut * 100}%)` };
  }

  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};