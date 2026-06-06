/**
 * 03 — Open & read a story (authenticated, mobile layout).
 *
 * Sign in → a universe → first story → first page reader. Shows the reading
 * experience. (Login lead-in trimmed by the EDL.)
 */
import { defineScenario } from "@mydemo/core";
import { demoLogin, SEED_UNIVERSE_SLUG } from "./_helpers.ts";

export default defineScenario({
  id: "03-read-story",
  title: "Read a story",
  shows: "Drilling from a universe into a story and reading a page.",
  async run(h) {
    await demoLogin(h);
    await h.goto(`/universes/${SEED_UNIVERSE_SLUG}`);
    await h.waitFor("story-card");
    h.mark("Pick a story");
    await h.pause(2000);

    await h.click("story-card"); // → /stories/<id>
    await h.waitFor("page-card");
    h.mark("Stories are made of pages");
    await h.pause(2000);

    await h.click("page-card"); // → /pages/<id>
    await h.waitFor("page-content");
    h.mark("Read the page");
    await h.pause(3200); // rest on the reader
    h.log("read-story captured");
  },
});
