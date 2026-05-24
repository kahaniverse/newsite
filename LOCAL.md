# Kahaniverse — Local Development

End-to-end local stack: Postgres + Redis behind Upstash-compatible HTTP proxies,
disk-backed Vercel Blob stub, console-logged Resend emails. No cloud accounts
required for the dev path.

---

## 0. Prerequisites

| Tool           | Minimum version | Notes                                       |
|----------------|-----------------|---------------------------------------------|
| Docker Desktop | 20.10           | Compose v2 syntax                           |
| Node.js        | 20 LTS          | `tsx` and Vitest both work on 18+, 20 LTS preferred |
| npm            | 10              | comes with Node 20                          |

> Windows users: use PowerShell. All commands below are cross-platform; `cd` once
> at the start and you don't need to chain `cd` per command.

---

## 1. First-time setup

```powershell
# from the repo root (c:\workspace\kahaniverse)

# 1. Bring up Postgres + Neon proxy + Redis + SRH
docker compose up -d

# 2. Wait ~10s, then check everything is healthy
docker compose ps

# 3. Install deps
cd web
npm install

# 4. Copy the env template
copy .env.local.example .env.local
# (no edits needed — the defaults match the docker-compose ports)

# 5. Apply the schema and seed
npm run db:migrate
npm run db:seed

# 6. (optional, only needed for E2E tests)
npm run test:e2e:install
```

---

## 2. Daily workflow

```powershell
# Bring up the stack (skips work if already running)
npm run stack:up

# Start the Next dev server
npm run dev    # http://localhost:3000

# Reset the dev DB whenever migrations drift
npm run db:reset && npm run db:seed
```

Stop / clean up:

```powershell
npm run stack:down    # stop containers, keep volumes
npm run stack:nuke    # nuclear: also drop the pg + redis volumes
```

---

## 3. What runs where

| Service       | URL                            | Purpose                              |
|---------------|--------------------------------|--------------------------------------|
| Next dev      | http://localhost:3000          | The app                              |
| Postgres      | postgres://localhost:55432     | DB (databases: `kahaniverse_dev`, `kahaniverse_test`) |
| Neon proxy    | http://localhost:4455/sql      | Upstash-Neon HTTP wire → Postgres    |
| Redis         | redis://localhost:56379        | Raw Redis (sessions, locks, rate limit) |
| SRH           | http://localhost:18079         | Upstash REST → Redis (used by `@upstash/redis`) |
| Upload stub   | http://localhost:3000/uploads/*| Disk-backed Vercel Blob replacement  |

Ports are 5x/8x-shifted to avoid clashing with other dev stacks. Override
any of them by exporting `KAHANI_PG_PORT`, `KAHANI_NEON_PORT`,
`KAHANI_REDIS_PORT`, or `KAHANI_SRH_PORT` before `docker compose up`.

The `@neondatabase/serverless` driver auto-detects `localhost` in `DATABASE_URL`
and reroutes via `NEON_LOCAL_PROXY_URL` (see [lib/db/configure-neon.ts](web/lib/db/configure-neon.ts)).

Resend: when `RESEND_API_KEY` is unset and `NODE_ENV !== 'production'`, the
email body (including the password-reset link) is printed to the dev server
stdout — see [lib/email/client.ts](web/lib/email/client.ts).

Cloudflare Turnstile: when `TURNSTILE_SECRET_KEY` is unset and
`NODE_ENV !== 'production'`, the verifier short-circuits to `true`. No widget
is rendered if `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset.

---

## 4. Testing

```powershell
# Pure-function unit tests (no docker required)
npm run test:unit

# Integration tests against the docker DB
docker compose up -d
npm run test:integration

# End-to-end (auto-starts `npm run dev`; docker stack must be up)
npm run test:e2e
```

What's covered:

- **Unit** (`tests/unit/`) — the SQL splitter, the rate-limit identity helper,
  Turnstile verifier, reaction-store state machine, email shim.
- **Integration** (`tests/integration/`) — every query module against a real
  local Postgres (test DB is auto-migrated, truncated between tests), plus
  the register and reactions route handlers with mocked auth/rate-limit.
- **E2E** (`tests/e2e/`) — Playwright Chromium: register → home, bad-password
  rejection, sign-out then sign-in, forgot-password (no enumeration),
  authenticated universe creation, reaction toggle.

### Manual smoke checklist

If you'd rather click through it once, the golden path:

1. `npm run dev` (stack up; .env.local in place)
2. Visit http://localhost:3000 — landing/carousel renders, no console errors.
3. http://localhost:3000/register — fill the form. After submit you land
   on `/` with an avatar in the top right.
4. Click `+ Universe` → fill name/concept/cover URL → submit.
5. From the universe page, create a story (`stories/new`) attached to it.
6. From the story page, create a root page (`pages/new`).
7. Tap ♥ on the universe card — count increments; tap again — decrements.
8. Sign out via the avatar menu → return to landing.
9. Forgot password → enter your email → check the dev server log for the
   reset link → click it → set a new password → log in.

---

## 5. Debugging tips

- **`getaddrinfo ENOTFOUND` from the app**: docker isn't up, or `NEON_LOCAL_PROXY_URL`
  is missing from `.env.local`.
- **`relation "authors" does not exist`**: you haven't run `npm run db:migrate`,
  or you nuked the volume. Re-migrate then re-seed.
- **`already exists` warnings on migrate**: harmless on re-runs; the migrate
  script skips them.
- **Upload stub returns 503**: only happens in production mode without
  `BLOB_READ_WRITE_TOKEN`. In `NODE_ENV=development` it writes to
  `public/uploads/<userId>/…`.
- **Playwright complains about browsers**: run `npm run test:e2e:install`.
