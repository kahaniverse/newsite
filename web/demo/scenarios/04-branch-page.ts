/**
 * 04 — Branch a page (authenticated, mobile layout).
 *
 * The core "collaborate" hook: open a story, tap the FAB to add a page, write
 * content, attest originality, and land on the new page. Writes to the demo DB.
 */
import { defineScenario } from "@mydemo/core";
import { demoLogin, SEED_UNIVERSE_SLUG } from "./_helpers.ts";

const BRANCH_TEXT =
  "The airlock cycled one last time. Sena pressed her palm to the cold glass and " +
  "watched the only home she'd never known shrink to a pale blue spark — then nothing.";

export default defineScenario({
  id: "04-branch-page",
  title: "Branch a page",
  shows: "Adding a new page to a story — write, attest, publish.",
  async setup(h) {
    await demoLogin(h);
    // Pre-navigate to a story off-camera so the recording opens on the story view.
    await h.goto(`/universes/${SEED_UNIVERSE_SLUG}`);
    await h.waitFor("story-card");
    await h.click("story-card");
    await h.waitFor("story-add-page");
  },
  async run(h) {
    h.mark("Anyone can extend a story");
    await h.pause(1500);

    await h.click("story-add-page"); // → /pages/new?...
    await h.waitFor("page-content-input");
    await h.pause(900);

    await h.type("page-content-input", BRANCH_TEXT);
    h.mark("Write your page");
    await h.pause(1800);

    await h.click("form-submit");
    await h.waitFor("attest-confirm");
    await h.pause(1200);

    await h.click("attest-confirm"); // POST /api/pages → /pages/<newId>
    await h.waitFor("page-content");
    h.mark("Published");
    await h.pause(3000);
    h.log("branch-page captured");
  },
});
