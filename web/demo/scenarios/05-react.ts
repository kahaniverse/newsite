/**
 * 05 — React to a page (authenticated, mobile layout).
 *
 * Sign in → drill to a page reader → tap Love then Follow; the optimistic
 * ReactionsStrip ticks the count instantly. Writes to the demo DB (idempotent).
 * (Login lead-in trimmed by the EDL.)
 */
import { defineScenario } from "@mydemo/core";
import { demoLogin, SEED_UNIVERSE_SLUG } from "./_helpers.ts";

export default defineScenario({
  id: "05-react",
  title: "React to a page",
  shows: "Optimistic love/follow reactions ticking up on a page.",
  async run(h) {
    await demoLogin(h);
    await h.goto(`/universes/${SEED_UNIVERSE_SLUG}`);
    await h.waitFor("story-card");
    await h.click("story-card");
    await h.waitFor("page-card");
    await h.click("page-card"); // → page reader
    await h.waitFor("reaction-love");
    h.mark("React as you read");
    await h.pause(1600);

    await h.click("reaction-love"); // optimistic +1
    await h.pause(1600);

    await h.click("reaction-follow");
    await h.pause(2600); // rest on the updated counts
    h.log("react captured");
  },
});
