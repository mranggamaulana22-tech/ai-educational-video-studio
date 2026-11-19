import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { theme } from "./theme";
import { fade, usePop } from "./fx";
import { FunIcon } from "./FunIcons";
import type { ColorName } from "./GenericScenes";

const INK = theme.colors.ink;
const FONT = theme.font.sans;

const COLORS: Record<ColorName, { bg: string; fg: string }> = {
  teal: { bg: theme.colors.cyan, fg: "#ffffff" },
  orange: { bg: theme.colors.orange, fg: INK },
  violet: { bg: theme.colors.violet, fg: "#ffffff" },
  red: { bg: theme.colors.red, fg: "#ffffff" },
  green: { bg: theme.colors.green, fg: "#ffffff" },
  yellow: { bg: theme.colors.yellow, fg: INK },
};
const col = (c?: string) => COLORS[(c as ColorName) ?? "teal"] ?? COLORS.teal;
const cueAt = (cues: number[] | undefined, i: number, gap = 750) => cues?.[i] ?? 250 + i * gap;

export type DiagramNode = {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  color?: string;
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
};

// Tata letak koordinat otomatis dalam kanvas 920 x 620 untuk 2..5 node.
function computePositions(count: number): { x: number; y: number; w: number; h: number }[] {
  if (count === 2) {
    return [
      { x: 460, y: 155, w: 660, h: 150 },
      { x: 460, y: 465, w: 660, h: 150 },
    ];
  }
  if (count === 3) {
    return [
      { x: 460, y: 110, w: 640, h: 130 },
      { x: 460, y: 315, w: 640, h: 130 },
      { x: 460, y: 520, w: 640, h: 130 },
    ];
  }
  if (count === 4) {
    return [
      { x: 235, y: 165, w: 400, h: 150 },
      { x: 685, y: 165, w: 400, h: 150 },
      { x: 235, y: 465, w: 400, h: 150 },
      { x: 685, y: 465, w: 400, h: 150 },
    ];
  }
  // 5 node: 2 atas, 1 tengah, 2 bawah
  return [
    { x: 235, y: 115, w: 390, h: 126 },
    { x: 685, y: 115, w: 390, h: 126 },
    { x: 460, y: 315, w: 440, h: 126 },
    { x: 235, y: 515, w: 390, h: 126 },
    { x: 685, y: 515, w: 390, h: 126 },
  ];
}

function edgeEndpoints(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absY >= absX) {
    const sy = dy >= 0 ? a.y + a.h / 2 : a.y - a.h / 2;
    const ey = dy >= 0 ? b.y - b.h / 2 - 8 : b.y + b.h / 2 + 8;
    return { x1: a.x, y1: sy, x2: b.x, y2: ey };
  }
  const sx = dx >= 0 ? a.x + a.w / 2 : a.x - a.w / 2;
  const ex = dx >= 0 ? b.x - b.w / 2 - 8 : b.x + b.w / 2 + 8;
  return { x1: sx, y1: a.y, x2: ex, y2: b.y };
}

export const DiagramScene: React.FC<{
  heading?: string;
  nodes: DiagramNode[];
  edges?: DiagramEdge[];
  cuesMs?: number[];
}> = ({ heading, nodes, edges = [], cuesMs }) => {
  const pop = usePop();
  const safeNodes = nodes.slice(0, 5);
  const boxes = computePositions(safeNodes.length);
  const indexById = new Map<string, number>();
  safeNodes.forEach((n, idx) => indexById.set(n.id, idx));

  const headingP = pop(cueAt(cuesMs, 0, 250));
  const nodeOffset = heading ? 1 : 0;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 320,
          left: theme.safe.side,
          right: theme.safe.side,
          height: 780,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        {heading ? (
          <div
            style={{
              opacity: fade(headingP),
              transform: `translateY(${interpolate(headingP, [0, 1], [24, 0])}px)`,
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 54,
              color: INK,
              textAlign: "center",
              lineHeight: 1.15,
            }}
          >
            {heading}
          </div>
        ) : null}

        <div style={{ position: "relative", width: 920, height: 630 }}>
          {/* Lapisan panah SVG */}
          <svg
            width={920}
            height={630}
            viewBox="0 0 920 630"
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
          >
            <defs>
              <marker
                id="diag-arrow"
                markerWidth="12"
                markerHeight="12"
                refX="9"
                refY="6"
                orient="auto"
              >
                <path d="M 1 1 L 11 6 L 1 11 z" fill={INK} />
              </marker>
            </defs>

            {edges.map((edge, idx) => {
              const fromIdx = indexById.get(edge.from);
              const toIdx = indexById.get(edge.to);
              if (fromIdx === undefined || toIdx === undefined || fromIdx === toIdx) return null;

              const triggerIdx = Math.max(fromIdx, toIdx) + nodeOffset;
              const p = pop(cueAt(cuesMs, triggerIdx, 700) + 180);
              const pts = edgeEndpoints(boxes[fromIdx], boxes[toIdx]);
              const midX = (pts.x1 + pts.x2) / 2;
              const midY = (pts.y1 + pts.y2) / 2;

              return (
                <g key={`${edge.from}-${edge.to}-${idx}`} style={{ opacity: fade(p) }}>
                  <line
                    x1={pts.x1}
                    y1={pts.y1}
                    x2={interpolate(p, [0, 1], [pts.x1, pts.x2])}
                    y2={interpolate(p, [0, 1], [pts.y1, pts.y2])}
                    stroke={INK}
                    strokeWidth={7}
                    strokeLinecap="round"
                    markerEnd={p > 0.75 ? "url(#diag-arrow)" : undefined}
                  />
                  {edge.label ? (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x={-96}
                        y={-22}
                        width={192}
                        height={44}
                        rx={14}
                        fill={theme.colors.card}
                        stroke={INK}
                        strokeWidth={4}
                      />
                      <text
                        x={0}
                        y={8}
                        textAnchor="middle"
                        fontFamily={FONT}
                        fontWeight={700}
                        fontSize={24}
                        fill={INK}
                      >
                        {edge.label}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </svg>

          {/* Lapisan kotak node */}
          {safeNodes.map((node, i) => {
            const box = boxes[i];
            const p = pop(cueAt(cuesMs, i + nodeOffset, 700));
            const c = col(node.color ?? (["teal", "orange", "violet", "green", "yellow"] as const)[i % 5]);
            return (
              <div
                key={node.id}
                style={{
                  position: "absolute",
                  left: box.x - box.w / 2,
                  top: box.y - box.h / 2,
                  width: box.w,
                  height: box.h,
                  opacity: fade(p),
                  transform: `scale(${interpolate(p, [0, 1], [0.68, 1])})`,
                  background: c.bg,
                  color: c.fg,
                  border: `7px solid ${INK}`,
                  borderRadius: 30,
                  boxShadow: `0 8px 0 ${INK}`,
                  padding: "12px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 18,
                  boxSizing: "border-box",
                }}
              >
                {node.icon ? (
                  <FunIcon
                    name={node.icon}
                    size={safeNodes.length >= 4 ? 64 : 76}
                    color={node.color === "yellow" ? "violet" : "yellow"}
                    motion={i % 2 === 0 ? "float" : "wiggle"}
                    phase={i * 0.6}
                  />
                ) : null}
                <div style={{ display: "flex", flexDirection: "column", alignItems: node.icon ? "flex-start" : "center" }}>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontWeight: 700,
                      fontSize: safeNodes.length >= 4 ? 36 : 44,
                      lineHeight: 1.1,
                      textAlign: node.icon ? "left" : "center",
                    }}
                  >
                    {node.label}
                  </div>
                  {node.sublabel ? (
                    <div
                      style={{
                        marginTop: 4,
                        fontFamily: FONT,
                        fontWeight: 600,
                        fontSize: safeNodes.length >= 4 ? 24 : 28,
                        opacity: 0.92,
                        lineHeight: 1.15,
                        textAlign: node.icon ? "left" : "center",
                      }}
                    >
                      {node.sublabel}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};