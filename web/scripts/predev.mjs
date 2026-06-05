// Runs automatically before `npm run dev` (npm "predev" hook).
//
// Two dev servers writing to the same .next/ directory corrupt each other's
// static output — the symptom is 404s on /_next/static/* (CSS + chunks), i.e.
// a completely unstyled app or a ChunkLoadError. This guarantees a single,
// clean dev server by (1) killing anything already on the dev port and
// (2) deleting the stale .next cache before the new server starts.
//
// Everything here is best-effort and wrapped so a failure never blocks `dev`.
import { rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

const PORT = process.env.PORT || '3000';

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      // Find PIDs listening on the port, then taskkill each (and its tree).
      const out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8' });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        // e.g.  TCP    0.0.0.0:3000   0.0.0.0:0   LISTENING   60588
        const m = line.match(/:(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
        if (m && m[1] === String(port)) pids.add(m[2]);
      }
      for (const pid of pids) {
        try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }); } catch {}
        console.log(`[predev] freed port ${port} (killed PID ${pid})`);
      }
    } else {
      // macOS/Linux: lsof gives the listening PIDs.
      const out = execSync(`lsof -ti tcp:${port} -s tcp:LISTEN`, { encoding: 'utf8' }).trim();
      for (const pid of out.split(/\s+/).filter(Boolean)) {
        try { execSync(`kill -9 ${pid}`); } catch {}
        console.log(`[predev] freed port ${port} (killed PID ${pid})`);
      }
    }
  } catch {
    // No process on the port (or the lookup tool is unavailable) — fine.
  }
}

killPort(PORT);
rmSync('.next', { recursive: true, force: true });
console.log('[predev] cleared .next cache');
