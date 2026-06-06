/**
 * Kahaniverse demo-capture config — the single app-specific injection point for
 * @mydemo/core. Kahaniverse is a Next.js 14 web app, so we use the BROWSER driver
 * (a real headed Edge/Chrome window over http://localhost:3000), not the Tauri one.
 *
 * Everything app-specific lives here; the engine knows no route, test-id, or
 * fixture. See ./README.md for how to run the rig and the demo-mode contract.
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "@mydemo/core";

const demoDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(demoDir, ".."); // the web/ app root

export const config = defineConfig({
  rootDir,
  demoDir,
  driver: "browser",
  // 4444 (the default) is taken by WSL/Docker relays on this machine; use a free port.
  driverPort: 9544,

  // The selector awaited after launch to prove the UI booted. It lives on the
  // public landing page (public/index.html), which is what "/" serves to
  // unauthenticated visitors — see middleware.ts.
  navAnchor: "landing-carousel",

  browser: {
    name: "edge", // this rig vendors msedgedriver; switch to "chrome" if preferred
    url: "http://localhost:3000",
    routing: "path", // Next.js App Router — h.goto("/discover") → http://localhost:3000/discover
    // PORTRAIT / mobile capture. Width < 768 makes Kahaniverse render its
    // NarrowShell — the mobile-first layout with real route navigation, the FAB,
    // and full-screen panels (the desktop layout is a store-driven 3-panel cascade
    // that's far harder to drive unattended). 540×960 scales 2× to the 1080×1920
    // portrait montage canvas below. This yields a coherent vertical/social reel
    // that suits a mobile-first app. (For a landscape reel, switch to a ≥1024 wide
    // viewport + canvas 1920×1080 and re-author scenarios for the panel cascade.)
    viewport: { width: 540, height: 960 },
    appMode: true, // chrome-free frame (no tabs / address bar)

    // Optional managed server lifecycle. Commented out by default so it doesn't
    // collide with a dev server you already have running on :3000. To let the rig
    // own the server, uncomment and prefer a PRODUCTION build (`next start`) for
    // final renders — `next dev` paints a dev-tools overlay in the corner.
    //
    // webServer: {
    //   command: "npm run start",          // run `npm run build` once beforehand
    //   readyUrl: "http://localhost:3000",
    //   startupTimeoutMs: 180_000,
    //   env: { NEXT_PUBLIC_DEMO_MODE: "1" } // the web demo-mode contract (see README)
    // },
  },

  // Browser state lives in the web server / DB, not a local app-data dir.
  resetFiles: [],

  // Master video canvas (PORTRAIT 1080×1920 — vertical reel) + brand caption font
  // (Kahaniverse uses a Helvetica/system sans; Segoe UI Bold is the closest
  // always-present Windows face for burned-in captions and title cards).
  video: {
    canvas: { w: 1080, h: 1920 },
    fps: 30,
  },
  capture: {
    // GIF artifacts (if you emit them) also portrait.
    gifCanvas: { w: 540, h: 960 },
  },
});

export default config;
