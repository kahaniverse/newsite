/**
 * 01 — Landing carousel (public, no auth).
 *
 * "/" serves the static landing page (public/index.html) to unauthenticated
 * visitors via middleware. It auto-rotates through seed universes (Exodus 2120 …)
 * in the animated book carousel. This scenario lands on it, lets the hero breathe,
 * and steps through a couple of stories — the opening shot of the marketing reel.
 */
import { defineScenario } from "@mydemo/core";

export default defineScenario({
  id: "01-landing-carousel",
  title: "Landing carousel",
  shows: "The animated book carousel cycling through shared story universes.",
  async run(h) {
    await h.goto("/"); // unauthenticated → public landing
    await h.waitFor("landing-carousel");
    h.mark("Welcome to Kahaniverse");
    await h.pause(3200); // let the hero settle / auto-rotate

    // Step forward through a couple of universes.
    await h.click("landing-next");
    await h.pause(2600);
    await h.click("landing-next");
    await h.pause(3000); // rest on the final frame

    h.log("landing carousel captured");
  },
});
