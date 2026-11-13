import React from "react";
import { Composition } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { VideoRoot } from "./Composition";
import type { Storyboard } from "./storyboard";
import defaultStoryboard from "./storyboards/html-css-js.json";

// Durasi, fps, dan ukuran dihitung dari JSON yang dipakai saat itu.
const calculateMetadata: CalculateMetadataFunction<Storyboard> = ({ props }) => {
  const { video } = props;
  return {
    durationInFrames: Math.round((video.durationMs * video.fps) / 1000),
    fps: video.fps,
    width: video.width,
    height: video.height,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HtmlCssJs"
      component={VideoRoot}
      defaultProps={defaultStoryboard as Storyboard}
      calculateMetadata={calculateMetadata}
      durationInFrames={1}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};