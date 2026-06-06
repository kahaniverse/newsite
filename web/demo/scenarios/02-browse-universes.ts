/**
 * 02 — Browse universes (authenticated, mobile layout).
 *
 * Signs in, lets the universe carousel breathe, then opens a universe to reveal
 * its stories. (The login lead-in at the head of the clip is trimmed by the EDL.)
 */
import { defineScenario } from "@mydemo/core";
import { demoLogin } from "./_helpers.ts";

export default defineScenario({
  id: "02-browse-universes",
  title: "Browse universes",
  shows: "The signed-in home carousel, then opening a universe to its stories.",
  async run(h) {
    await demoLogin(h); // → authed home
    h.mark("Browse shared universes");
    await h.pause(3000); // let the carousel rotate

    await h.click("universe-hero"); // → /universes/<slug>
    await h.waitFor("story-card");
    h.mark("Every universe holds many stories");
    await h.pause(3000);
    h.log("browse captured");
  },
});
