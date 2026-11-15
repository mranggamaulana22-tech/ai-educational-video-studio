import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Storyboard, Subtitle } from "./storyboard";
import { Background, CodeScene, KeyPoints, SummaryCards, TitleReveal, msToFrames } from "./components";
import { Backdrop } from "./Backdrop";
import { IconShowcase } from "./Icons";
import { KineticTrack } from "./Kinetic";
import { CloudSync, CommitTimeline, FileChaos, IconSummary } from "./GitScenes";
import { SceneTransition, TRANSITION_OVERLAP } from "./Transition";

// Registri komponen: storyboard hanya boleh memakai komponen yang terdaftar di sini.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry: Record<string, React.FC<any>> = { TitleReveal, CodeScene, SummaryCards, KeyPoints, IconShowcase, FileChaos, CommitTimeline, CloudSync, IconSummary };

const SubtitleLine: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 380,
        paddingLeft: 70,
        paddingRight: 70,
      }}
    >
      <div
        style={{
          opacity,
          textAlign: "center",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontWeight: 800,
          fontSize: 56,
          lineHeight: 1.35,
          color: "white",
        }}
      >
        <span
          style={{
            background: "rgba(0,0,0,0.6)",
            padding: "6px 22px",
            borderRadius: 18,
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
          }}
        >
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
};

const SubtitleTrack: React.FC<{ subtitles: Subtitle[] }> = ({ subtitles }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {subtitles.map((s) => {
        const from = msToFrames(s.startMs, fps);
        const dur = Math.max(1, msToFrames(s.endMs, fps) - from);
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur}>
            <SubtitleLine text={s.text} />
          </Sequence>
        );
      })}
    </>
  );
};

// Props video = isi file storyboard JSON (langsung, tanpa dibungkus).
export const VideoRoot: React.FC<Storyboard> = ({ video, audio, scenes, subtitles }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {video.theme === "v2" ? <Backdrop /> : <Background />}
      <Audio src={staticFile(audio.src)} />
      {scenes.map((scene, idx) => {
        const Comp = registry[scene.component];
        if (!Comp) {
          throw new Error(`Komponen belum terdaftar: ${scene.component}`);
        }
        const from = msToFrames(scene.startMs, fps);
        const dur = msToFrames(scene.startMs + scene.durationMs, fps) - from;
        const t = scene.transition ?? "none";

        if (t === "none") {
          return (
            <Sequence key={scene.id} from={from} durationInFrames={dur}>
              <Comp {...scene.props} />
            </Sequence>
          );
        }

        const isLast = idx === scenes.length - 1;
        const total = isLast ? dur : dur + TRANSITION_OVERLAP;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={total}>
            <SceneTransition type={t} total={total} hasOut={!isLast}>
              <Comp {...scene.props} />
            </SceneTransition>
          </Sequence>
        );
      })}
      {video.theme === "v2" ? <KineticTrack subtitles={subtitles} /> : <SubtitleTrack subtitles={subtitles} />}
    </AbsoluteFill>
  );
};