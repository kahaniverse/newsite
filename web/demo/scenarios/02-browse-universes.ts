/**
 * 02 — Browse universes (authenticated, mobile layout).
 *
 * Lands on the signed-in home, lets the universe carousel breathe, then opens a
 * universe to reveal its stories. Shows the core browse experience.
 */
import { defineScenario } from "@mydemo/core";
import { demoLogin } from "./_helpers.ts";

export default defineScenario({
  id: "02-browse-universes",
  title: "Browse universes",
  shows: "The signed-in home carousel, then opening a universe to its stories.",
  async setup(h) {
    await demoLogin(h); // off-camera
  },
  async run(h) {
    await h.goto("/");
    await h.waitFor("universe-hero");
    h.mark("Browse shared universes");
    await h.pause(3200); // let the carousel rotate

    await h.click("universe-hero"); // → /universes/<slug>
    await h.waitFor("story-card");
    h.mark("Every universe holds many stories");
    await h.pause(3000);
    h.log("browse captured");
  },
});
