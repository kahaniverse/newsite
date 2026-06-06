import type { Helpers } from "@mydemo/core";

/**
 * Demo sign-in. Hits the gated /demo-login route, clicks the passwordless button
 * (the `demo` NextAuth provider), and waits to land on the authenticated home.
 *
 * Call this at the START of `run(h)` (not `setup`): the rig re-navigates to "/"
 * and re-waits the navAnchor after `setup()`, which an auth-changing setup would
 * break (signed-in "/" is the dashboard, not the landing). The brief login
 * lead-in is trimmed by the EDL clip in-points. Requires NEXT_PUBLIC_DEMO_MODE=1.
 */
export async function demoLogin(h: Helpers): Promise<void> {
  await h.goto("/demo-login");
  await h.click("demo-login");
  await h.waitFor("story-card"); // authed home: "Latest Stories" feed
}

/** A seeded universe with rich content (5 stories × 3 pages) to drill into. */
export const SEED_UNIVERSE_SLUG = "being-super";
