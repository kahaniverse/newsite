// Reusable animated feature callout (portrait 1080×1920) — a light "paper" card
// slides up over the dark chrome with a kicker, heading, and body. Used between
// screencast clips in the montage to name each feature.
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "./theme.ts";

export const FeatureCard: React.FC<{
  kicker?: string;
  heading: string;
  body?: string;
  accent?: "brand" | "mauve";
}> = ({ kicker, heading, body, accent = "mauve" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const accentColor = accent === "brand" ? theme.brand : theme.accent;

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(enter, [0, 1], [60, 0]);
  const opacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.font,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px)`,
          opacity,
          background: theme.paper,
          color: theme.paperInk,
          borderRadius: 16,
          padding: "56px 56px",
          maxWidth: 880,
          margin: "0 60px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          borderTop: `8px solid ${accentColor}`,
        }}
      >
        {kicker ? (
          <div
            style={{
              color: accentColor,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <h2 style={{ fontSize: 62, fontWeight: 700, margin: 0, letterSpacing: -1 }}>
          {heading}
        </h2>
        {body ? (
          <p
            style={{
              fontSize: 34,
              lineHeight: 1.4,
              marginTop: 24,
              marginBottom: 0,
              color: "#3a2f1c",
            }}
          >
            {body}
          </p>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
