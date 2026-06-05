# Kahaniverse demo / marketing rig

Drives the **@mydemo/core** browser driver to screen-record Kahaniverse and weave
the clips together with synthetic **Remotion** brand segments into one marketing
video.

**Format:** a **portrait, vertical reel (1080×1920)**. The browser records at a
phone-width viewport (540×960) so the app renders its mobile-first **NarrowShell**
— real route navigation, the FAB, full-screen panels — which is both authentic to
the product and far more deterministic to drive than the desktop panel cascade. The
Remotion brand segments are portrait too, so the whole reel is coherent end-to-end
and ready for app stores / social. (For a landscape reel, see the viewport/canvas
note in `config.ts`.)

```
demo/
├── config.ts                 browser-driver config (the one app-specific file)
├── record.ts                 recorder entry  (npm run demo:single / :all / :gifs)
├── scenarios/
│   ├── index.ts              ordered registry
│   └── 01-landing-carousel.ts
├── edit/
│   ├── marketing.edl.ts      the montage edit list
│   └── render.ts             render entry   (npm run demo:video / :intro)
├── remotion/                 consumer-owned brand compositions (synthetic video)
│   ├── index.ts · Root.tsx · BrandIntro.tsx · FeatureCard.tsx · Outro.tsx · theme.ts
└── assets/music/             drop a royalty-free bed here
```

## Scripts

| command | what it does | needs |
| --- | --- | --- |
| `npm run demo:intro` | render just the **brand intro** MP4 | Remotion only (no app, no recording) |
| `npm run demo:single -- 01-landing-carousel` | record one scenario | app running + browser driver + ffmpeg/gifski |
| `npm run demo:all` | record every scenario | same |
| `npm run demo:video` | compose the full montage from the EDL | recorded clips + ffmpeg/ffprobe |
| `npm run demo:typecheck` | type-check the rig (separate from the app) | deps installed |

## Setup (run once)

```bash
npm install                  # links @mydemo/core (file:../../myDemo) + remotion + webdriverio
# external tools on PATH for RECORDING (not needed for demo:intro):
#   - msedgedriver  (matched to your Edge; vendored under demo/.bin/ or on PATH)
#   - ffmpeg, gifski, ffprobe
```

The fastest sanity check needs none of the recording tools:

```bash
npm run demo:intro           # → demo/output/video/BrandIntro.mp4
```

## Serving the app for recording

The browser driver records a real `http://localhost:3000`. Either:

- start it yourself (`npm run dev`, or `npm run build && npm run start` for a clean
  frame with no dev overlay) and run the recorder; **or**
- uncomment `browser.webServer` in `config.ts` to let the rig start/stop it.

## The web demo-mode contract (implemented)

Authenticated pages (`/`, `/universes/*`, …) sit behind NextAuth —
`middleware.ts` redirects signed-out visitors to `/login`. The app cooperates with
the rig via a **strictly-gated demo mode** so authenticated flows record
unattended:

- `lib/auth/demo.ts` — `DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1"`.
  Off by default; **never enable in production**.
- When on, a passwordless `demo` NextAuth provider impersonates a seeded author
  (`seed:meera-rao`), and `/demo-login` (a route that 404s when off) establishes
  the session. Scenarios call `demoLogin(h)` in `setup()` (off-camera).

To record the authenticated scenarios (02–05):

```bash
npm run db:seed                      # seeds seed:meera-rao + universes/stories/pages
NEXT_PUBLIC_DEMO_MODE=1 npm run start # serve with demo mode on (or set it in browser.webServer.env)
npm run demo:single -- 03-read-story
```

The landing scenario (01) needs none of this — it records the public page.

## Adding a scenario

1. Find `data-testid`s in the target components (Kahaniverse has none yet — add
   them; never invent selectors). 
2. Write `scenarios/NN-name.ts` with `defineScenario`, register it in
   `scenarios/index.ts`.
3. `npm run demo:single -- NN-name`, open `demo/output/NN-name.gif`, adjust pacing.
4. Add a `clip` segment for it in `edit/marketing.edl.ts`.
