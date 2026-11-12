import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { storyboard } from "./storyboard";
import { Background, CodeScene, SummaryCards, TitleReveal, msToFrames } from "./components";

// Registri komponen: storyboard hanya boleh memakai komponen yang terdaftar di sini.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry: Record<string, React.FC<any>> = { TitleReveal, CodeScene, SummaryCards };

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

const SubtitleTrack: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {storyboard.subtitles.map((s) => {
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

const VideoRoot: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Background />
      <Audio src={staticFile(storyboard.audio.src)} />
      {storyboard.scenes.map((scene) => {
        const Comp = registry[scene.component];
        if (!Comp) {
          throw new Error(`Komponen belum terdaftar: ${scene.component}`);
        }
        const from = msToFrames(scene.startMs, fps);
        const dur = msToFrames(scene.startMs + scene.durationMs, fps) - from;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={dur}>
            <Comp {...scene.props} />
          </Sequence>
        );
      })}
      <SubtitleTrack />
    </AbsoluteFill>
  );
};

export const MyComposition: React.FC = () => {
  const { video } = storyboard;
  return (
    <Composition
      id="HtmlCssJs"
      component={VideoRoot}
      durationInFrames={Math.round((video.durationMs * video.fps) / 1000)}
      fps={video.fps}
      width={video.width}
      height={video.height}
    />
  );
};