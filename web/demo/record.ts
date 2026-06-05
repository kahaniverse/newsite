/**
 * Thin recorder entry. The orchestrator re-spawns THIS file once per scenario
 * (with --worker) so each records in a fresh WebDriver session.
 *
 *   npm run demo:single -- 01-landing-carousel   # one scenario
 *   npm run demo:all                              # every scenario → montage set
 *   npm run demo:gifs                             # also emit normalized GIFs
 *
 * Requires a desktop session, the configured browser + its driver, ffmpeg and
 * gifski on PATH, and the app reachable at browser.url (start `npm run dev` /
 * `npm run start`, or wire up browser.webServer in config.ts).
 */
import { fileURLToPath } from "node:url";
import { runRecorderCli } from "@mydemo/core";
import { config } from "./config.ts";
import { SCENARIOS } from "./scenarios/index.ts";

runRecorderCli({
  cfg: config,
  scenarios: SCENARIOS,
  entryScript: fileURLToPath(import.meta.url), // re-spawned per scenario
  argv: process.argv.slice(2),
});
