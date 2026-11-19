import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import type { Storyboard } from "./storyboard";
import { msToFrames } from "./components";
import { Backdrop } from "./Backdrop";
import { resolveSceneComponent } from "./registry";
import { SceneTransition, TRANSITION_OVERLAP } from "./Transition";
import { FunSubtitleTrack } from "./FunSubtitle";
import { TopBadge } from "./TopBadge";

// Props video = isi file storyboard JSON (langsung, tanpa dibungkus).
export const VideoRoot: React.FC<Storyboard> = ({ video, audio, scenes, subtitles }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Backdrop />
      <Audio src={staticFile(audio.src)} />
      {scenes.map((scene, idx) => {
        const { componentId, Component } = resolveSceneComponent(scene);
        if (!Component) {
          throw new Error(`Komponen belum terdaftar: ${componentId}`);
        }
        const from = msToFrames(scene.startMs, fps);
        const dur = msToFrames(scene.startMs + scene.durationMs, fps) - from;
        const t = scene.transition ?? "none";

        if (t === "none") {
          return (
            <Sequence key={scene.id} from={from} durationInFrames={dur}>
              <Component {...scene.props} />
            </Sequence>
          );
        }

        const isLast = idx === scenes.length - 1;
        const total = isLast ? dur : dur + TRANSITION_OVERLAP;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={total}>
            <SceneTransition type={t} total={total} hasOut={!isLast}>
              <Component {...scene.props} />
            </SceneTransition>
          </Sequence>
        );
      })}
      {video.badge ? <TopBadge day={video.badge.day} course={video.badge.course} /> : null}
      <FunSubtitleTrack subtitles={subtitles} />
    </AbsoluteFill>
  );
};