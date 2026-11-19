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

export type DiagramLayout = "column" | "row" | "grid";

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

type Box = { x: number; y: number; w: number; h: number };

// Kanvas 920 x 840 dipusatkan secara vertikal di zona aman layar 1080x1920.
function computePositions(count: number, layout?: DiagramLayout): Box[] {
  const mode: DiagramLayout = layout ?? (count <= 3 ? "column" : "grid");

  if (mode === "row") {
    const gap = 28;
    const totalW = 920;
    const w = Math.floor((totalW - gap * (count - 1)) / count);
    const h = count <= 3 ? 260 : 230;
    return Array.from({ length: count }, (_, i) => ({
      x: w / 2 + i * (w + gap),
      y: 420,
      w,
      h,
    }));
  }

  if (mode === "column") {
    if (count === 2) {
      return [
        { x: 460, y: 210, w: 680, h: 170 },
        { x: 460, y: 630, w: 680, h: 170 },
      ];
    }
    if (count === 3) {
      return [
        { x: 460, y: 120, w: 680, h: 150 },
        { x: 460, y: 420, w: 680, h: 150 },
        { x: 460, y: 720, w: 680, h: 150 },
      ];
    }
    if (count === 4) {
      return [
        { x: 460, y: 95, w: 680, h: 132 },
        { x: 460, y: 312, w: 680, h: 132 },
        { x: 460, y: 528, w: 680, h: 132 },
        { x: 460, y: 745, w: 680, h: 132 },
      ];
    }
    return [
      { x: 460, y: 75, w: 680, h: 112 },
      { x: 460, y: 248, w: 680, h: 112 },
      { x: 460, y: 420, w: 680, h: 112 },
      { x: 460, y: 592, w: 680, h: 112 },
      { x: 460, y: 765, w: 680, h: 112 },
    ];
  }

  // Mode "grid" (2 kolom rapi dengan jarak cukup untuk panah & label)
  if (count === 2) {
    return [
      { x: 235, y: 420, w: 410, h: 200 },
      { x: 685, y: 420, w: 410, h: 200 },
    ];
  }
  if (count === 3) {
    return [
      { x: 235, y: 210, w: 410, h: 175 },
      { x: 685, y: 210, w: 410, h: 175 },
      { x: 460, y: 630, w: 460, h: 175 },
    ];
  }
  if (count === 4) {
    return [
      { x: 235, y: 210, w: 410, h: 175 },
      { x: 685, y: 210, w: 410, h: 175 },
      { x: 235, y: 630, w: 410, h: 175 },
      { x: 685, y: 630, w: 410, h: 175 },
    ];
  }
  return [
    { x: 235, y: 120, w: 410, h: 150 },
    { x: 685, y: 120, w: 410, h: 150 },
    { x: 460, y: 420, w: 460, h: 150 },
    { x: 235, y: 720, w: 410, h: 150 },
    { x: 685, y: 720, w: 410, h: 150 },
  ];
}

function edgeEndpoints(a: Box, b: Box) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absY >= absX) {
    const sy = dy >= 0 ? a.y + a.h / 2 + 4 : a.y - a.h / 2 - 4;
    const ey = dy >= 0 ? b.y - b.h / 2 - 14 : b.y + b.h / 2 + 14;
    return { x1: a.x, y1: sy, x2: b.x, y2: ey, vertical: true };
  }
  const sx = dx >= 0 ? a.x + a.w / 2 + 4 : a.x - a.w / 2 - 4;
  const ex = dx >= 0 ? b.x - b.w / 2 - 14 : b.x + b.w / 2 + 14;
  return { x1: sx, y1: a.y, x2: ex, y2: b.y, vertical: false };
}

export const DiagramScene: React.FC<{
  heading?: string;
  layout?: DiagramLayout;
  nodes: DiagramNode[];
  edges?: DiagramEdge[];
  cuesMs?: number[];
}> = ({ heading, layout, nodes, edges = [], cuesMs }) => {
  const pop = usePop();
  const safeNodes = nodes.slice(0, 5);
  const boxes = computePositions(safeNodes.length, layout);
  const indexById = new Map<string, number>();
  safeNodes.forEach((n, idx) => indexById.set(n.id, idx));

  const headingP = pop(cueAt(cuesMs, 0, 250));
  const nodeOffset = heading ? 1 : 0;
  const isCompact = safeNodes.length >= 4 || layout === "row";

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 250,
          bottom: 340,
          left: theme.safe.side,
          right: theme.safe.side,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
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

        <div style={{ position: "relative", width: 920, height: 840 }}>
          {/* Lapisan panah SVG */}
          <svg
            width={920}
            height={840}
            viewBox="0 0 920 840"
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
          >
            <defs>
              <marker
                id="diag-arrow"
                markerWidth="14"
                markerHeight="14"
                refX="10"
                refY="7"
                orient="auto"
              >
                <path d="M 1 1 L 13 7 L 1 13 z" fill={INK} />
              </marker>
            </defs>

            {edges.map((edge, idx) => {
              const fromIdx = indexById.get(edge.from);
              const toIdx = indexById.get(edge.to);
              if (fromIdx === undefined || toIdx === undefined || fromIdx === toIdx) return null;

              const triggerIdx = Math.max(fromIdx, toIdx) + nodeOffset;
              const p = pop(cueAt(cuesMs, triggerIdx, 700) + 180);
              const pts = edgeEndpoints(boxes[fromIdx], boxes[toIdx]);
              // Letakkan titik tengah agak ke pangkal (42%) dan geser ke samping agar kepala panah tidak tertutup label.
              const anchorX = pts.x1 + (pts.x2 - pts.x1) * 0.42;
              const anchorY = pts.y1 + (pts.y2 - pts.y1) * 0.42;
              const labelW = edge.label ? Math.max(150, edge.label.length * 14 + 36) : 0;
              const labelX = pts.vertical ? Math.min(920 - labelW / 2, anchorX + labelW / 2 + 22) : anchorX;
              const labelY = pts.vertical ? anchorY : anchorY - 40;

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
                    markerEnd={p > 0.7 ? "url(#diag-arrow)" : undefined}
                  />
                  {edge.label ? (
                    <g transform={`translate(${labelX}, ${labelY})`}>
                      <rect
                        x={-labelW / 2}
                        y={-22}
                        width={labelW}
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
            const isRow = layout === "row";

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
                  padding: "12px 20px",
                  display: "flex",
                  flexDirection: isRow ? "column" : "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: isRow ? 8 : 16,
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                {node.icon ? (
                  <div style={{ flex: "0 0 auto" }}>
                    <FunIcon
                      name={node.icon}
                      size={isCompact ? 56 : 74}
                      color={node.color === "yellow" ? "violet" : "yellow"}
                      motion={i % 2 === 0 ? "float" : "wiggle"}
                      phase={i * 0.6}
                    />
                  </div>
                ) : null}
                <div
                  style={{
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: node.icon && !isRow ? "flex-start" : "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT,
                      fontWeight: 700,
                      fontSize: isCompact ? 32 : 42,
                      lineHeight: 1.12,
                      textAlign: node.icon && !isRow ? "left" : "center",
                      wordBreak: "break-word",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
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
                        fontSize: isCompact ? 22 : 27,
                        opacity: 0.92,
                        lineHeight: 1.15,
                        textAlign: node.icon && !isRow ? "left" : "center",
                        wordBreak: "break-word",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
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