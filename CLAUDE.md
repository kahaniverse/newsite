# Kahaniverse — CLAUDE.md

Collaborative story platform. Authors create **Universes** → **Stories** → branching **Pages**. Full schema SQL, TypeScript types, and env vars in README.md. Feature specs in PRD.md.

## Stack
Next.js 14 App Router · TypeScript strict · Neon (`@neondatabase/serverless`) · Upstash Redis (`@upstash/redis`) · NextAuth v5 · Tailwind CSS · Vercel Blob · React Hook Form + Zod · Zustand + React Query · Resend

## Hard Rules
- No ORM — raw SQL via `sql` tagged template (`lib/db/client.ts`)
- No `any` — use `unknown` + Zod narrowing
- Server Components by default; `"use client"` only when interactivity required
- No Redux, no heavy animation libs — CSS transitions only
- Vercel Hobby: no cron/background jobs; all functions < 10s; `edge` runtime for middleware only
- Never expose `dob` or `auth_id` in any API response
- Rate-limit all mutation routes: 20 req/min/IP via `@upstash/ratelimit` sliding window

## Key Paths
```
app/(auth)/login · register · forgot-password
app/(app)/page.tsx(home) · universes/[slug] · stories/[id] · pages/[id] · authors/[id] · profile/
app/api/auth/[...nextauth] · universes · stories · pages · authors · reactions · upload
components/cards/ · lists/ · panels/ · shell/ · forms/ · auth/ · ui/
lib/db/client.ts · queries/ · migrations/
lib/redis/client.ts · session.ts · cache.ts
lib/auth/config.ts · lib/types/index.ts · middleware.ts
```

## Auth
Providers: `GoogleProvider`, `TwitterProvider` (X OAuth 2.0), custom Instagram OAuth2 (`https://api.instagram.com/oauth/authorize` scope `user_profile,user_media`). Credentials: bcrypt cost 12 + Cloudflare Turnstile on login. Sessions in Upstash Redis via `@auth/upstash-redis-adapter`, TTL 30d rolling. Password reset: signed JWT hash in Redis `pwreset:<hash>` TTL 15min via Resend.

Protected routes (redirect `/login?callbackUrl=`): `/profile/*`, `*/new`, all API POST/PATCH/DELETE.

## DB + Redis Clients
```ts
// lib/db/client.ts
import { neon } from '@neondatabase/serverless';
export const sql = neon(process.env.DATABASE_URL!);

// lib/redis/client.ts
import { Redis } from '@upstash/redis';
export const redis = Redis.fromEnv();
```

## Redis Keys & TTLs
`session:<id>` 30d · `cache:universes:featured` 5min · `cache:stories:page:<n>` 2min · `cache:author:<id>` 10min · `lock:reaction:<uid>:<type>:<tid>` 1s · `pwreset:<hash>` 15min

Cache-aside on all GETs. Invalidate matching keys on mutation.

## API Surface
```
GET/POST   /api/universes                    ?page&limit&genre&featured&q
GET/PATCH/DELETE /api/universes/[slug]       PATCH/DELETE: creator only
GET        /api/universes/[slug]/stories

GET/POST   /api/stories                      ?universeId&page&status&q
GET/PATCH  /api/stories/[id]                 PATCH: contributor only
GET        /api/stories/[id]/pages

GET/POST   /api/pages                        POST body: {storyId,parentId,content,illustration?}
GET/PATCH  /api/pages/[id]                   PATCH: author only

GET        /api/authors                      ?page
GET/PATCH  /api/authors/[id]                 PATCH: self only

POST/DELETE /api/reactions                   {type,targetType,targetId} idempotent DELETE
POST        /api/upload                      {filename,contentType} → Blob URL
```
All errors: `{ error: string, code: string }`

## Component Map
```
cards/    HeroCard · StoryCard · PageCard · SlimCard · RoundCard · SquareCard
lists/    HeroCarousel · AuthorCarousel · StoryList · PageList · SlimList · RoundCarousel
panels/   BrowsePanel · EntityDetailPanel · LeafPanel · FeaturedCarousel · SuggestedList
shell/    WideShell · MediumShell · NarrowShell
ui/       ReactionsStrip · AuthorByline · CoverImage · AvatarImage
```
Breakpoints: ≥1024 → WideShell (280px|flex|320px) · 768–1023 → MediumShell (56px rail) · <768 → NarrowShell (router-push per panel)

## Carousel Conversion
Static `index.html` book CSS/JS → `public/css/` and `public/js/` unchanged. `HeroCarousel` fetches `/api/universes?featured=true`, maps data to existing DOM ids: `#bookAuthor #chapterTitle #chapterText #storyImage #genreTag`. `useEffect` re-initialises `main.js` post-mount. Falls back to Exodus 2120 seed data if DB empty.

## Reactions (Optimistic)
`ReactionsStrip` → Zustand optimistic ±1 → `POST /api/reactions` → on error: revert + toast.

## Conventions
- `PascalCase` components · `camelCase` utils/hooks
- `<Image>` for known domains · `<img loading="lazy">` for Blob URLs
- `aria-label` on every interactive element · `aria-live="polite"` on carousels
- `<ErrorBoundary>` wrapping each panel
- ISR `revalidate:300` + `revalidateTag` on mutation for universe/story lists
- Migrations: `lib/db/migrations/001_initial.sql` via `npm run db:migrate` (uses `DATABASE_URL_UNPOOLED`)
- Seed: `npm run db:seed` → 3 universes (Exodus 2120 · The Ember Courts · Deva Protocol), 2 stories + 1 root page each, system author `id=00000000-0000-0000-0000-000000000001`
