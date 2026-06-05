// Brand intro (portrait 1080×1920): the "Kahaniverse" wordmark fades + rises in
// over the dark chrome, a red→mauve underline wipes across, and the tagline
// settles below. 4s @ 30fps.
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "./theme.ts";

export const BrandIntro: React.FC<{ title?: string; tagline?: string }> = ({
  title = "Kahaniverse",
  tagline = "Read. Write. Collaborate. Get Discovered.",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(enter, [0, 1], [50, 0]);
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Underline wipes in after the wordmark lands.
  const underline = interpolate(frame, [22, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline rises a beat later.
  const tagEnter = spring({ frame: frame - 30, fps, config: { damping: 200 } });
  const tagY = interpolate(tagEnter, [0, 1], [24, 0]);
  const tagOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Gentle fade-out on the tail so it crossfades cleanly into the next segment.
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 14, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 700px at 50% 38%, #242424 0%, ${theme.bg} 60%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.font,
        opacity: fadeOut,
      }}
    >
      <div style={{ textAlign: "center", padding: "0 80px", transform: `translateY(${y}px)` }}>
        <h1
          style={{
            color: theme.text,
            fontSize: 104,
            fontWeight: 700,
            letterSpacing: -2,
            margin: 0,
            opacity: titleOpacity,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            height: 6,
            margin: "28px auto 0",
            width: `${underline * 300}px`,
            borderRadius: 9999,
            background: `linear-gradient(90deg, ${theme.brand}, ${theme.accent})`,
          }}
        />
        <p
          style={{
            color: theme.muted,
            fontSize: 40,
            fontWeight: 400,
            marginTop: 40,
            lineHeight: 1.3,
            opacity: tagOpacity,
            transform: `translateY(${tagY}px)`,
          }}
        >
          {tagline}
        </p>
      </div>
    </AbsoluteFill>
  );
};
