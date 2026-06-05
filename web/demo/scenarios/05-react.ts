/**
 * 05 — React to a page (authenticated, mobile layout).
 *
 * On a page reader, tap Love then Follow — the optimistic ReactionsStrip ticks
 * the count instantly. Short and lively. Writes to the demo DB (idempotent).
 */
import { defineScenario } from "@mydemo/core";
import { demoLogin, SEED_UNIVERSE_SLUG } from "./_helpers.ts";

export default defineScenario({
  id: "05-react",
  title: "React to a page",
  shows: "Optimistic love/follow reactions ticking up on a page.",
  async setup(h) {
    await demoLogin(h);
    // Off-camera: drill to a page reader so the recording opens on the reactions.
    await h.goto(`/universes/${SEED_UNIVERSE_SLUG}`);
    await h.waitFor("story-card");
    await h.click("story-card");
    await h.waitFor("page-card");
    await h.click("page-card");
    await h.waitFor("reaction-love");
  },
  async run(h) {
    h.mark("React as you read");
    await h.pause(1600);

    await h.click("reaction-love"); // optimistic +1
    await h.pause(1600);

    await h.click("reaction-follow");
    await h.pause(2600); // rest on the updated counts
    h.log("react captured");
  },
});
