// Closing CTA card — wordmark + a pill call-to-action over the dark chrome.
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "./theme.ts";

export const Outro: React.FC<{ cta?: string; url?: string }> = ({
  cta = "Start your universe",
  url = "kahaniverse.app",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const scale = interpolate(enter, [0, 1], [0.92, 1]);
  const opacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateRight: "clamp",
  });
  const pill = spring({ frame: frame - 18, fps, config: { damping: 200 } });
  const pillScale = interpolate(pill, [0, 1], [0.8, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1100px 700px at 50% 50%, #242424 0%, ${theme.bg} 62%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.font,
        opacity,
      }}
    >
      <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
        <h1
          style={{
            color: theme.text,
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: -2,
            margin: 0,
          }}
        >
          Kahaniverse
        </h1>
        <div
          style={{
            display: "inline-block",
            marginTop: 44,
            transform: `scale(${pillScale})`,
            background: `linear-gradient(90deg, ${theme.brand}, ${theme.brandLight})`,
            color: "#fff",
            fontSize: 40,
            fontWeight: 700,
            padding: "22px 52px",
            borderRadius: 9999,
          }}
        >
          {cta} →
        </div>
        <p style={{ color: theme.muted, fontSize: 34, marginTop: 36 }}>{url}</p>
      </div>
    </AbsoluteFill>
  );
};
