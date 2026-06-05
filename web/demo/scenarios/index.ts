// Ordered scenario registry. Order here is the order of the `--all` montage set.
import type { Scenario } from "@mydemo/core";
import landingCarousel from "./01-landing-carousel.ts";
import browseUniverses from "./02-browse-universes.ts";
import readStory from "./03-read-story.ts";
import branchPage from "./04-branch-page.ts";
import react from "./05-react.ts";

export const SCENARIOS: Scenario[] = [
  landingCarousel, // public landing (no auth)
  browseUniverses, // authed — needs NEXT_PUBLIC_DEMO_MODE=1
  readStory,
  branchPage,
  react,
];

export default SCENARIOS;
