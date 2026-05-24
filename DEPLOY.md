# Kahaniverse — Vercel Production Deploy

Checklist for promoting the app from a working local stack to a Vercel Hobby
production deployment.

> All paths below are absolute Vercel actions unless prefixed with a code path.

---

## 1. Provider accounts to create

| Service                       | Tier               | What you get                          |
|-------------------------------|--------------------|---------------------------------------|
| **Vercel**                    | Hobby              | App hosting + Blob + serverless funcs |
| **Neon**                      | Free (0.5 GB)      | Postgres with HTTP driver             |
| **Upstash Redis**             | Free               | Session/cache/rate-limit              |
| **Resend**                    | Free (3k emails/mo)| Transactional email                   |
| **Cloudflare**                | Free               | Turnstile CAPTCHA                     |
| **Google Cloud Console**      | Free               | OAuth 2.0 client                      |
| **X Developer Portal**        | Free               | OAuth 2.0 client (Twitter)            |
| **Meta Developers**           | Free               | Instagram OAuth (see §7)              |

---

## 2. Provision the database

1. Neon dashboard → Create Project → region close to your Vercel region.
2. Copy **Pooled** connection string → `DATABASE_URL`.
3. Copy **Unpooled / Direct** connection string → `DATABASE_URL_UNPOOLED`.
4. Locally, run migrations against prod **before** the first deploy:
   ```powershell
   cd web
   $env:DATABASE_URL_UNPOOLED = "postgres://…neon.tech/…"
   npm run db:migrate
   npm run db:seed   # optional: starter universes
   ```
   The `configureNeonForLocalDev()` helper only kicks in for `localhost` /
   `127.0.0.1` hostnames — production runs unmodified.

> The seed inserts a system author with id `00000000-0000-0000-0000-000000000001`.
> Skip the seed if you don't want starter content.

---

## 3. Provision Upstash Redis

1. Upstash dashboard → Create Database → Global → free tier.
2. Connection page → copy **REST URL** → `UPSTASH_REDIS_REST_URL`.
3. Same page → copy **REST Token** (read-write) → `UPSTASH_REDIS_REST_TOKEN`.
4. The NextAuth Upstash adapter uses `session:` prefixed keys
   ([lib/auth/config.ts](web/lib/auth/config.ts#L40)). No separate setup needed.

---

## 4. Cloudflare Turnstile

1. Cloudflare dashboard → Turnstile → Add Site.
2. Hostnames: add the production domain **and** any Vercel preview wildcard
   (e.g. `kahaniverse.com`, `*.vercel.app` if you preview from PR URLs).
3. Widget mode: **Managed**.
4. Copy site key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (this **must** be exposed,
   hence the `NEXT_PUBLIC_` prefix).
5. Copy secret → `TURNSTILE_SECRET_KEY`.

If either of these is unset in production, the verify helper returns `false`
([lib/auth/turnstile.ts](web/lib/auth/turnstile.ts#L4)) and all
credentials-based sign-ins / registrations will be rejected. Both keys are
mandatory for prod.

---

## 5. Vercel Blob

1. Vercel project → Storage → Create Blob store → name `kahaniverse-prod`.
2. Connect to the project — Vercel auto-injects `BLOB_READ_WRITE_TOKEN`.
3. Note the Blob hostname pattern (e.g. `*.public.blob.vercel-storage.com`) —
   already allowed in [next.config.js](web/next.config.js#L4).
4. Client uploads use `@vercel/blob/client`'s `upload()`, which calls our
   `/api/upload` route to mint a one-shot upload token
   ([app/api/upload/route.ts](web/app/api/upload/route.ts)).

`NEXT_PUBLIC_BLOB_BASE_URL` is not used in the upload path itself (the SDK
returns absolute URLs); set it only if you want a stable display hostname for
documentation or SSR fallbacks.

---

## 6. Resend

1. Resend dashboard → Create API key → copy → `RESEND_API_KEY`.
2. Add and verify the sender domain (matches the `from:` in
   [app/api/auth/forgot-password/route.ts](web/app/api/auth/forgot-password/route.ts)
   — currently `noreply@kahaniverse.com`; update if your domain differs).
3. SPF + DKIM records on the apex domain.
4. In production with no key set, `sendEmail()` returns `{ ok: false }` and
   logs an error — no crash, but reset emails won't go out. Don't ship without it.

---

## 7. OAuth providers

### Google
1. Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client.
2. Authorised redirect URI: `https://<yourdomain>/api/auth/callback/google`.
3. → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### Twitter / X
1. developer.twitter.com → Project → OAuth 2.0.
2. Callback URL: `https://<yourdomain>/api/auth/callback/twitter`.
3. → `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`.

### Instagram (⚠️ deprecated path)
Meta deprecated Instagram Basic Display API in late 2024. The current code
([lib/auth/config.ts:11](web/lib/auth/config.ts#L11)) still points at the
legacy endpoint. Before launch:

- Either remove Instagram from the providers list, OR
- Switch to **Facebook Login for Business → Instagram Login** (Graph API).
  This means a new custom provider with different `authorization`, `token`,
  and `userinfo` URLs.

Track decision in [CLAUDE.md "Open Questions" #1](CLAUDE.md).

---

## 8. NextAuth

1. Generate the secret:
   ```powershell
   openssl rand -base64 32   # use git-bash or WSL on Windows
   ```
2. Set:
   - `NEXTAUTH_URL=https://<yourdomain>`
   - `NEXTAUTH_SECRET=<the value>`
3. Confirm the Upstash adapter prefix `session:` matches your Redis cleanup
   policy if you share the Redis with anything else.

---

## 9. Vercel project setup

1. `vercel link` (or import via dashboard) — point at the `web/` directory
   as the project root (`Settings → General → Root Directory = web`).
2. **Settings → Environment Variables**: add every key from
   [web/.env.local.example](web/.env.local.example) **except** the Neon proxy
   variable (`NEON_LOCAL_PROXY_URL` — local-only, omit in prod).

   Mirror across the three environments: Production, Preview, Development.
3. **Settings → Functions** → confirm Node.js runtime (default). The middleware
   uses the Edge runtime automatically.
4. **Settings → Build & Development → Install Command**: `npm install`
   **Build Command**: `npm run build`
5. First deploy: `git push` (or click Deploy in the dashboard).

---

## 10. Post-deploy verification

```bash
# Hit the health-ish endpoint
curl -i https://<yourdomain>/api/universes?count=true
# → 200 { "total": N }

# Confirm session adapter is talking to Redis
curl -i https://<yourdomain>/api/auth/session
# → 200 with a JSON body (null user is OK)
```

Manual smoke (5 min):
1. Register a new account.
2. Receive password reset email at that address.
3. Create a universe with an uploaded cover image (Blob).
4. React to a card — count persists across page refresh.
5. Sign out → sign back in via Google.

---

## 11. Things that are deliberately NOT in prod

- The disk-backed upload stub at `public/uploads/` — disabled when
  `BLOB_READ_WRITE_TOKEN` is set
  ([app/api/upload/route.ts:15](web/app/api/upload/route.ts#L15)).
- The Resend console-log fallback — only fires when `NODE_ENV !== 'production'`.
- The Turnstile dev bypass — only fires when `NODE_ENV !== 'production'`.
- The Neon local proxy redirect — only fires for `localhost` hostnames in
  `DATABASE_URL`.

If any of these activate in production, that means an env var is missing.

---

## 12. Hobby-tier limits to keep in mind

| Limit                          | Where it bites                       |
|--------------------------------|--------------------------------------|
| 10s serverless function timeout | Long DB queries on `getStories` with high page numbers |
| No cron / background jobs      | Counter drift if reactions ever fail mid-write — rely on triggers, not async cleanup |
| Neon free tier: 0.5 GB         | Page content is `TEXT ≤ 10k`; 10k authors × 100 pages × 10 KB ≈ 10 GB — plan upgrade path |
| Upstash free: 10k commands/day | Every page load hits cache:get; consider longer TTLs if budget tightens |
| Vercel Blob free: 1 GB stored, 10 GB bandwidth | Cover images at 200 KB → ~5000 covers before hitting the cap |
