// Composition registry. Every composition is declared at the master canvas
// (PORTRAIT 1080×1920 @ 30fps = config.video.canvas) so a "remotion" EDL segment
// joins the portrait screencast clips without rescaling.
import { Composition } from "remotion";
import { BrandIntro } from "./BrandIntro.tsx";
import { FeatureCard } from "./FeatureCard.tsx";
import { Outro } from "./Outro.tsx";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BrandIntro"
        component={BrandIntro}
        durationInFrames={120} // 4s
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: "Kahaniverse",
          tagline: "Read. Write. Collaborate. Get Discovered.",
        }}
      />
      <Composition
        id="FeatureCard"
        component={FeatureCard}
        durationInFrames={90} // 3s
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          kicker: "Feature",
          heading: "Branching pages",
          body: "Every page can fork. Readers choose the path; authors extend it.",
          accent: "mauve" as const,
        }}
      />
      <Composition
        id="Outro"
        component={Outro}
        durationInFrames={105} // 3.5s
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ cta: "Start your universe", url: "kahaniverse.app" }}
      />
    </>
  );
};
