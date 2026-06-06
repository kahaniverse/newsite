/**
 * 04 — Branch a page (authenticated, mobile layout).
 *
 * The core "collaborate" hook: sign in → open a story → tap the FAB to add a
 * page → write content → attest originality → land on the new page. Writes to
 * the demo DB. (Login lead-in trimmed by the EDL.)
 */
import { defineScenario } from "@mydemo/core";
import { demoLogin, SEED_UNIVERSE_SLUG } from "./_helpers.ts";

const BRANCH_TEXT =
  "She pressed her palm to the cold glass and watched the only home she'd never " +
  "known shrink to a pale spark — then nothing but the long dark, and the hum of the engines.";

export default defineScenario({
  id: "04-branch-page",
  title: "Branch a page",
  shows: "Adding a new page to a story — write, attest, publish.",
  async run(h) {
    await demoLogin(h);
    await h.goto(`/universes/${SEED_UNIVERSE_SLUG}`);
    await h.waitFor("story-card");
    await h.click("story-card"); // → story view
    await h.waitFor("story-add-page");
    h.mark("Anyone can extend a story");
    await h.pause(1500);

    await h.click("story-add-page"); // → /pages/new?...
    await h.waitFor("page-content-input");
    await h.pause(800);

    await h.type("page-content-input", BRANCH_TEXT);
    h.mark("Write your page");
    await h.pause(1600);

    await h.click("form-submit");
    await h.waitFor("attest-confirm");
    await h.pause(1100);

    await h.click("attest-confirm"); // POST /api/pages → /pages/<newId>
    await h.waitFor("page-content");
    h.mark("Published");
    await h.pause(2800);
    h.log("branch-page captured");
  },
});
