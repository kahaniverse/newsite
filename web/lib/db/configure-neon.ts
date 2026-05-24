import { neonConfig } from '@neondatabase/serverless';

let configured = false;

// Detect whether a Postgres URL points at the local dev proxy. We bend the
// Neon driver toward that proxy in that case so DB queries don't try to reach
// the Neon cloud.
export function configureNeonForLocalDev(url: string | undefined): void {
  if (configured) return;
  if (!url) return;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return;
  }
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== 'db.localtest.me') {
    return;
  }
  const endpoint = process.env.NEON_LOCAL_PROXY_URL ?? 'http://localhost:4444/sql';
  neonConfig.fetchEndpoint = endpoint;
  // Disable TLS expectations when targeting the local proxy.
  // useSecureWebSocket is for the websocket driver; harmless to set here.
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch  = true;
  configured = true;
}
