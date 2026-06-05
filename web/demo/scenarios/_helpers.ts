import type { Helpers } from "@mydemo/core";

/**
 * Off-camera demo sign-in. Hits the gated /demo-login route, clicks the
 * passwordless button (the `demo` NextAuth provider), and waits to land on the
 * authenticated home. Call this from a scenario's `setup(h)` so recording starts
 * already signed in. Requires the app served with NEXT_PUBLIC_DEMO_MODE=1.
 */
export async function demoLogin(h: Helpers): Promise<void> {
  await h.goto("/demo-login");
  await h.click("demo-login");
  await h.waitFor("universe-hero"); // authed home (BrowsePanel → HeroCarousel)
}

/** A known seeded universe (after `npm run db:seed`) with stories to drill into. */
export const SEED_UNIVERSE_SLUG = "exodus-2120";
