import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  interpolate,
  useCurrentFrame,
} from "remotion";

type Props = {};

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {};
};

export const MyComposition = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComponent}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={calculateMetadata}
    />
  );
};

export const MyComponent: React.FC<Props> = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, 30], [60, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #1f3a5f, #0b1220)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          color: "white",
          fontSize: 96,
          fontFamily: "Arial, sans-serif",
          fontWeight: 700,
          textAlign: "center",
          padding: 80,
        }}
      >
        Tes Render
        <br />
        {frame} / 300
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 300,
          width: 200,
          height: 200,
          borderRadius: 40,
          background: "#4da3ff",
          transform: `rotate(${frame * 2}deg)`,
        }}
      />
    </AbsoluteFill>
  );
};