/**
 * Marketing montage edit list. Weaves synthetic Remotion segments (brand intro,
 * feature cards, outro) together with recorded screencast clips into one finished
 * 1920×1080 reel. compose() renders each segment, normalizes to the master canvas,
 * crossfades them, and lays a music bed under it.
 *
 * NOTE: `clip` segments reference per-scenario MP4s under demo/output/ that only
 * exist after `npm run demo:single -- <id>` (or `demo:all`). Until those are
 * recorded, render the brand intro alone with `npm run demo:intro`, or comment the
 * clip segments out to preview the synthetic cuts.
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { VideoEdl } from "@mydemo/core";
import { config } from "../config.ts";

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the Remotion entry (registers BrandIntro / FeatureCard / Outro). */
export const REMOTION_ENTRY = resolve(here, "..", "remotion", "index.ts");

/** Path to a recorded scenario's MP4. */
const clip = (id: string) => join(config.dirs.output, `${id}.mp4`);

export const edl: VideoEdl = {
  id: "kahaniverse-marketing",
  transition: 0.5,

  // Drop a royalty-free track at demo/assets/music/ and point `file` here.
  // music: { file: join(config.demoDir, "assets", "music", "bed.mp3"), volume: 0.55 },

  // NOTE: clip in/out offsets are first-pass estimates from each scenario's
  // pacing. Tighten them once recorded (open demo/output/<id>.mp4 to read the
  // real beat timings) so the cuts land cleanly.
  segments: [
    // 1 — Brand intro (synthetic; renders today, no recording needed)
    {
      kind: "remotion",
      entry: REMOTION_ENTRY,
      compositionId: "BrandIntro",
      props: {
        title: "Kahaniverse",
        tagline: "Read. Write. Collaborate. Get Discovered.",
      },
    },

    // 2 — The living landing carousel (scenarios/01-landing-carousel.ts)
    {
      kind: "clip",
      source: clip("01-landing-carousel"),
      in: 0,
      out: 8,
      caption: "A living library of shared universes",
    },

    // 3 — Feature card: the model
    {
      kind: "remotion",
      entry: REMOTION_ENTRY,
      compositionId: "FeatureCard",
      props: {
        kicker: "How it works",
        heading: "Universes → Stories → Pages",
        body: "Authors build shared worlds, write stories inside them, and branch every page.",
        accent: "mauve",
      },
    },

    // 4 — Browse universes (02) — skip the off-camera login; start on the carousel
    {
      kind: "clip",
      source: clip("02-browse-universes"),
      in: 0,
      out: 7,
      caption: "Browse shared universes",
    },

    // 5 — Read a story (03)
    {
      kind: "clip",
      source: clip("03-read-story"),
      in: 0,
      out: 9,
      caption: "Open a story, read a page",
    },

    // 6 — Feature card: collaborate
    {
      kind: "remotion",
      entry: REMOTION_ENTRY,
      compositionId: "FeatureCard",
      props: {
        kicker: "Collaborate",
        heading: "Anyone can extend a story",
        body: "Add your own page and branch the narrative — every reader is a potential author.",
        accent: "brand",
      },
    },

    // 7 — Branch a page (04)
    {
      kind: "clip",
      source: clip("04-branch-page"),
      in: 0,
      out: 12,
      rate: 1.25, // gently speed the typing/publish beat
      caption: "Write your page, publish it",
    },

    // 8 — React (05)
    {
      kind: "clip",
      source: clip("05-react"),
      in: 0,
      out: 6,
      caption: "Love & follow what you read",
    },

    // 9 — Closing CTA (synthetic)
    {
      kind: "remotion",
      entry: REMOTION_ENTRY,
      compositionId: "Outro",
      props: { cta: "Start your universe", url: "kahaniverse.app" },
    },
  ],
};

export default edl;
