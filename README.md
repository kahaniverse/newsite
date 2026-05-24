# Kahaniverse

> **Read. Write. Collaborate. Get Discovered.**
> A collaborative short-story platform where authors build shared fictional universes.

---

## Project Overview

Authors create **Universes** (shared worlds), write **Stories** within them, and compose branching **Pages** that other authors can extend. Readers discover content, react, and follow authors they love.

---

## Tech Stack

| Layer           | Choice                                                        |
| --------------- | ------------------------------------------------------------- |
| Framework       | Next.js 14+ (App Router), TypeScript strict                   |
| Hosting         | Vercel Hobby                                                  |
| Database        | Neon PostgreSQL serverless (`@neondatabase/serverless`)     |
| Session / Cache | Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`)    |
| Auth            | NextAuth.js v5 — Google, X (Twitter), Instagram, Credentials |
| Styling         | Tailwind CSS + CSS variables                                  |
| Images          | Vercel Blob                                                   |
| Forms           | React Hook Form + Zod                                         |
| State           | Zustand (client) + React Query (server)                       |
| Email           | Resend                                                        |

---

## Repository Structure

```
kahaniverse/
├── app/
│   ├── (auth)/login · register · forgot-password
│   ├── (app)/
│   │   ├── layout.tsx                  # shell selector (Wide/Medium/Narrow)
│   │   ├── page.tsx                    # home — BrowsePanel
│   │   ├── universes/[slug] · new
│   │   ├── stories/[id] · new
│   │   ├── pages/[id] · new
│   │   ├── authors/index · [id]
│   │   └── profile/index · edit
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── universes/route.ts · [slug]/route.ts · [slug]/stories/route.ts
│       ├── stories/route.ts · [id]/route.ts · [id]/pages/route.ts
│       ├── pages/route.ts · [id]/route.ts
│       ├── authors/route.ts · [id]/route.ts
│       ├── reactions/route.ts
│       └── upload/route.ts
├── components/
│   ├── cards/      HeroCard · StoryCard · PageCard · SlimCard · RoundCard · SquareCard
│   ├── lists/      HeroCarousel · AuthorCarousel · StoryList · PageList · SlimList · RoundCarousel
│   ├── panels/     BrowsePanel · EntityDetailPanel · LeafPanel · FeaturedCarousel · SuggestedList
│   ├── shell/      WideShell · MediumShell · NarrowShell
│   ├── forms/      all form components
│   ├── auth/       LoginForm · RegisterForm · SocialAuthButtons
│   └── ui/         ReactionsStrip · AuthorByline · CoverImage · AvatarImage
├── lib/
│   ├── db/client.ts · queries/ · migrations/001_initial.sql
│   ├── redis/client.ts · session.ts · cache.ts
│   ├── auth/config.ts
│   └── types/index.ts
├── hooks/          useReactions · useInfiniteStories · useAuth
├── store/          Zustand stores
├── public/
│   ├── css/        skeuomorp.css · styles.css   ← preserved from static site
│   └── js/         main.js                      ← preserved from static site
├── styles/globals.css
└── middleware.ts
```

---

## Environment Variables

```bash
# .env.local — never commit

# Neon
DATABASE_URL=              # pooled connection string
DATABASE_URL_UNPOOLED=     # direct connection (migrations only)

# NextAuth
NEXTAUTH_URL=https://kahaniverse.com
NEXTAUTH_SECRET=           # openssl rand -base64 32

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=

# Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://kahaniverse.com
NEXT_PUBLIC_BLOB_BASE_URL=   # CDN prefix for stored images
```

---

## Database Schema

```sql
-- ENUMS
CREATE TYPE reaction_type    AS ENUM ('love','follow','view');
CREATE TYPE genre            AS ENUM ('fantasy','scienceFiction','romance','thriller',
                                      'horror','mystery','adventure','historical','literary','other');
CREATE TYPE story_status     AS ENUM ('draft','published','completed','abandoned');
CREATE TYPE contributor_role AS ENUM ('creator','coAuthor','fanContributor');

-- AUTHORS
CREATE TABLE authors (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id      TEXT UNIQUE NOT NULL,       -- NextAuth user.id
    display_name VARCHAR(64) NOT NULL,
    bio          VARCHAR(500),
    avatar_image TEXT,
    dob          DATE,                       -- confidential; never in API response
    follow_count BIGINT NOT NULL DEFAULT 0,
    love_count   BIGINT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_authors_auth_id ON authors(auth_id);

-- UNIVERSES
CREATE TABLE universes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(64) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name            VARCHAR(64) UNIQUE NOT NULL,
    concept         VARCHAR(2000) NOT NULL,
    cover_image     TEXT NOT NULL,
    era             VARCHAR(64),
    world           VARCHAR(64),
    genres          genre[] DEFAULT '{}',
    creator_id      UUID NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
    love_count      BIGINT NOT NULL DEFAULT 0,
    follow_count    BIGINT NOT NULL DEFAULT 0,
    view_count      BIGINT NOT NULL DEFAULT 0,
    story_count     INT NOT NULL DEFAULT 0,
    character_count INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_universes_creator ON universes(creator_id);
CREATE INDEX idx_universes_genres  ON universes USING GIN(genres);

-- CHARACTERS
CREATE TABLE characters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(128) NOT NULL,
    image       TEXT NOT NULL,
    description VARCHAR(500),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    creator_id  UUID NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_characters_universe ON characters(universe_id);
CREATE INDEX idx_characters_creator  ON characters(creator_id);

-- STORIES
CREATE TABLE stories (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(128) NOT NULL,
    synopsis     VARCHAR(500) NOT NULL,
    cover_image  TEXT,
    genre_tags   genre[] DEFAULT '{}',
    status       story_status NOT NULL DEFAULT 'draft',
    universe_id  UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    love_count   BIGINT NOT NULL DEFAULT 0,
    follow_count BIGINT NOT NULL DEFAULT 0,
    view_count   BIGINT NOT NULL DEFAULT 0,
    page_count   INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(title, universe_id)
);
CREATE INDEX idx_stories_universe   ON stories(universe_id);
CREATE INDEX idx_stories_status     ON stories(status);
CREATE INDEX idx_stories_genre_tags ON stories USING GIN(genre_tags);

-- STORY CONTRIBUTORS (many-many)
CREATE TABLE story_contributors (
    story_id    UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    role        contributor_role NOT NULL DEFAULT 'coAuthor',
    accepted_at TIMESTAMPTZ,               -- null = pending
    PRIMARY KEY (story_id, author_id)
);
CREATE INDEX idx_contrib_author ON story_contributors(author_id);

-- STORY CHARACTERS (many-many)
CREATE TABLE story_characters (
    story_id     UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, character_id)
);

-- PAGES (branching tree)
CREATE TABLE pages (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id           UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    parent_id          UUID NOT NULL,      -- equals story_id for root page
    content            TEXT NOT NULL CHECK (char_length(content) <= 10000),
    illustration       TEXT,
    disallow_next      BOOLEAN NOT NULL DEFAULT false,
    disallow_alternate BOOLEAN NOT NULL DEFAULT false,
    author_id          UUID NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
    love_count         BIGINT NOT NULL DEFAULT 0,
    view_count         BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pages_story  ON pages(story_id);
CREATE INDEX idx_pages_parent ON pages(parent_id);

-- REACTIONS (polymorphic; exactly one target FK non-null)
CREATE TABLE reactions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reactor_id    UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    reaction_type reaction_type NOT NULL,
    universe_id   UUID REFERENCES universes(id) ON DELETE CASCADE,
    story_id      UUID REFERENCES stories(id)   ON DELETE CASCADE,
    page_id       UUID REFERENCES pages(id)     ON DELETE CASCADE,
    author_id     UUID REFERENCES authors(id)   ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(reactor_id, reaction_type, universe_id),
    UNIQUE(reactor_id, reaction_type, story_id),
    UNIQUE(reactor_id, reaction_type, page_id),
    UNIQUE(reactor_id, reaction_type, author_id)
);
CREATE INDEX idx_reactions_reactor  ON reactions(reactor_id);
CREATE INDEX idx_reactions_story    ON reactions(story_id);
CREATE INDEX idx_reactions_universe ON reactions(universe_id);

-- UPDATED_AT trigger (apply to all mutable tables)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_authors_updated    BEFORE UPDATE ON authors    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_universes_updated  BEFORE UPDATE ON universes  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_stories_updated    BEFORE UPDATE ON stories    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pages_updated      BEFORE UPDATE ON pages      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_characters_updated BEFORE UPDATE ON characters FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## TypeScript Types

```typescript
// lib/types/index.ts
export type ReactionType     = 'love' | 'follow' | 'view';
export type Genre            = 'fantasy'|'scienceFiction'|'romance'|'thriller'|
                               'horror'|'mystery'|'adventure'|'historical'|'literary'|'other';
export type StoryStatus      = 'draft'|'published'|'completed'|'abandoned';
export type ContributorRole  = 'creator'|'coAuthor'|'fanContributor';

export interface Author {
  id: string; displayName: string; bio?: string; avatarImage?: string;
  followCount: number; loveCount: number; createdAt: string;
}
export interface Universe {
  id: string; slug: string; name: string; concept: string; coverImage: string;
  era?: string; world?: string; genres: Genre[];
  creator: Pick<Author,'id'|'displayName'|'avatarImage'>;
  loveCount: number; followCount: number; viewCount: number; storyCount: number; createdAt: string;
}
export interface Story {
  id: string; title: string; synopsis: string; coverImage?: string;
  genreTags: Genre[]; status: StoryStatus;
  universe: Pick<Universe,'id'|'slug'|'name'>;
  contributors: Array<{ author: Pick<Author,'id'|'displayName'|'avatarImage'>; role: ContributorRole }>;
  loveCount: number; followCount: number; viewCount: number; pageCount: number; createdAt: string;
}
export interface Page {
  id: string; storyId: string; parentId: string; content: string; illustration?: string;
  disallowNext: boolean; disallowAlternate: boolean;
  author: Pick<Author,'id'|'displayName'|'avatarImage'>;
  loveCount: number; viewCount: number; children: Page[]; createdAt: string;
}
```

---

## Authentication Detail

| Provider       | Package                             | Notes                                                                                                                                 |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Google         | `next-auth/providers/google`      | Standard                                                                                                                              |
| X (Twitter)    | `next-auth/providers/twitter`     | OAuth 2.0; keys from developer.twitter.com                                                                                            |
| Instagram      | Custom OAuth2 provider              | Endpoint:`https://api.instagram.com/oauth/authorize`; scope: `user_profile,user_media`; no localhost support — use ngrok locally |
| Email/Password | `next-auth/providers/credentials` | bcrypt cost 12; Cloudflare Turnstile CAPTCHA on login                                                                                 |

OAuth callback URLs to register with each provider:

```
https://kahaniverse.com/api/auth/callback/google
https://kahaniverse.com/api/auth/callback/twitter
https://kahaniverse.com/api/auth/callback/instagram
```

---

## Redis Cache Reference

| Purpose              | Key Pattern                          | TTL             |
| -------------------- | ------------------------------------ | --------------- |
| Session              | `session:<sessionId>`              | 30 days rolling |
| Featured universes   | `cache:universes:featured`         | 5 min           |
| Story list page      | `cache:stories:page:<n>`           | 2 min           |
| Author profile       | `cache:author:<id>`                | 10 min          |
| Reaction dedup lock  | `lock:reaction:<uid>:<type>:<tid>` | 1 s             |
| Password reset token | `pwreset:<hashedToken>`            | 15 min          |

---

## Responsive Shell Breakpoints

| Breakpoint  | Shell           | Layout                                              |
| ----------- | --------------- | --------------------------------------------------- |
| ≥ 1024px   | `WideShell`   | 3-column: 280px fixed · flex centre · 320px fixed |
| 768–1023px | `MediumShell` | 56px icon rail + 2 panels stacked vertically        |
| < 768px     | `NarrowShell` | Single column; each panel is a router push          |

---

## Design Tokens

```css
--accent:        #6A0DAD;   /* CTAs, FABs, active */
--accent-light:  #8B2FC9;   /* hover */
--bg-primary:    #0f0f0f;
--bg-card:       #1a1a1a;
--bg-elevated:   #242424;
--text-primary:  #f0f0f0;
--text-muted:    #888888;
--border:        #2e2e2e;
--error:         #CC0000;
```

Headings: `Georgia, 'Times New Roman', serif` · Body: system sans-serif · Card radius: 12px · Button radius: 8px

---

## NPM Scripts

```bash
 npm run dev          # local dev server
npm run build        # production build
npm run db:migrate   # apply migrations (uses DATABASE_URL_UNPOOLED)
npm run db:seed      # insert seed data (idempotent)
```

---

## Seed Data

`npm run db:seed` inserts (idempotent — checks before inserting):

- System author: `id = 00000000-0000-0000-0000-000000000001`, `display_name = 'Kahaniverse'`
- 3 Universes: **Exodus 2120** (scienceFiction), **The Ember Courts** (fantasy), **Deva Protocol** (scienceFiction)
- 2 Stories per universe, 1 root Page per story
- These match the static `index.html` carousel content for seamless conversion

---

## Vercel Hobby Limits

- Serverless function timeout: 10s max
- No background jobs or cron — use ISR `revalidateTag` instead
- `edge` runtime: middleware only; API routes use `nodejs` runtime
- Neon serverless driver manages connection pooling — do not use `pg` directly
- Image optimisation: use `next/image` with Vercel Blob CDN domain in `next.config.js` `images.domains`

---

## Open Questions

| # | Question                                                                                                                  |
| - | ------------------------------------------------------------------------------------------------------------------------- |
| 1 | Instagram Basic Display API deprecated by Meta late 2024 — confirm Meta Login (Graph API) as replacement before building |
| 2 | Cover image aspect ratio — standardise 16:9 or 4:3?                                                                      |
| 3 | Who can publish a story — creator only, or any contributor?                                                              |
| 4 | Count anonymous views, or authenticated only?                                                                             |
| 5 | Neon free tier is 0.5 GB — confirm seed + early content fits                                                             |
