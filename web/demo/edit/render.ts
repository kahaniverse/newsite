/**
 * Thin render entry. Composes the marketing montage from the EDL, or — with
 * `--intro-only` — renders just the synthetic brand intro (handy to preview the
 * brand look with no recordings and no running app).
 *
 *   npm run demo:video        # full montage (needs recorded clips, ffmpeg, gifski)
 *   npm run demo:intro        # just the BrandIntro mp4 (needs only Remotion)
 */
import { compose, renderRemotion } from "@mydemo/core";
import { config } from "../config.ts";
import { edl, REMOTION_ENTRY } from "./marketing.edl.ts";

async function main() {
  const introOnly = process.argv.slice(2).includes("--intro-only");

  if (introOnly) {
    const out = await renderRemotion(config, {
      entry: REMOTION_ENTRY,
      compositionId: "BrandIntro",
      props: {
        title: "Kahaniverse",
        tagline: "Read. Write. Collaborate. Get Discovered.",
      },
    });
    console.log(`\n✔ brand intro: ${out}`);
    return;
  }

  const out = await compose(config, edl);
  console.log(`\n✔ marketing video: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
