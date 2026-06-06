// Preflight: report which external recording tools are present for the configured
// driver. Run `npm run demo:doctor` before recording.
import { doctor } from "@mydemo/core";
import { config } from "./config.ts";

doctor(config).then((r) => process.exit(r.ok ? 0 : 1));
