# PRD.md — Kahaniverse Web App
**Version:** 1.0 · **Status:** Approved for Development  
**Last updated:** May 2026

---

## 1. Overview

Kahaniverse is a collaborative story platform where writers and readers co-create fictional universes. Authors build **Universes** (shared worlds), write **Stories** within those universes, and compose branching **Pages** — creating narratives that other authors can extend. Readers discover, react to, and follow content they love.

**Tagline:** *"Read. Write. Collaborate. Get Discovered."*

This PRD defines the MVP web application: a fully responsive Next.js app replacing the current static landing page, with a live database backend, complete authentication, and the three-panel browsing experience defined by the UX specification.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Replace static landing with dynamic experience | Carousel pulls live data from DB |
| Full auth flow including social logins | Google + X + Instagram login all functional |
| Authors can create universes and stories | Universe and story creation forms working |
| Readers can browse and react | Love/follow reactions persisted in DB |
| Responsive across all screen sizes | Passes Lighthouse mobile score ≥ 85 |
| Performance within Vercel Hobby limits | All API routes respond < 800 ms p95 |

---

## 3. User Roles

| Role | Description |
|---|---|
| **Visitor** | Unauthenticated user; can browse all public content |
| **Author** | Authenticated user; can create universes, write stories, add pages |
| **Creator** | Author who originated a universe or story (elevated permissions) |
| **Co-Author** | Invited author with write access to a specific story |
| **Fan Contributor** | Author whose pages are community contributions (not canonical) |

---

## 4. Feature Requirements

### 4.1 Landing Page (Home)

**Description:** The homepage is the entry point for both visitors and returning authors. It preserves the skeuomorphic open-book design of the existing static page while making the carousel dynamic.

**Requirements:**
- The open-book carousel displays featured Universes pulled from the database
- Carousel slides show: genre tag, universe name, cover image, title, synopsis (concept excerpt)
- Navigation arrows and dot indicators work as on the static page
- Carousel auto-advances every 5 seconds; pauses on hover
- The universe count badge reflects the real count from the DB
- Auth card is visible on the right/below (Sign In + Join Free tabs)
- "Free Beta Access" and "∞ Stories" badges remain
- If the DB has no universes, falls back to the static Exodus 2120 seed data

**Out of scope for MVP:** Personalised homepage based on reading history

---

### 4.2 Authentication

#### 4.2.1 Sign In
- Email + password login with CAPTCHA (Cloudflare Turnstile)
- Google OAuth 2.0 single-click login
- X (Twitter) OAuth 2.0 single-click login  
- Instagram OAuth single-click login
- "Forgot Password" link → password reset flow
- On success: redirect to the page the user was trying to access (or `/` default)
- Error states: wrong password, unverified email, rate-limited (too many attempts)

#### 4.2.2 Register (Join Free)
- Fields: Pen Name (displayName), Email, Password (min 8 chars)
- Validate: pen name unique, email unique, passwords match on confirm
- Social registration: same OAuth providers; on first social login, prompt user to choose a Pen Name if not provided by provider
- On success: create `authors` record, create session, redirect to `/`
- Email verification: optional for MVP (flag accounts as unverified but allow access)

#### 4.2.3 Forgot Password
- Enter email → receive reset link (via Resend)
- Reset link contains a signed token stored in Redis (TTL: 15 minutes)
- New password form: password + confirm password
- On success: invalidate all existing sessions for that user, redirect to login

#### 4.2.4 Auth Card (Landing Page)
- Embedded in the landing page (not a separate page on first load)
- Tabs: "Sign In" and "Join Free"
- Social buttons: Google, X, Instagram (in that order)
- Terms & Privacy Policy links on the Join Free panel
- After successful auth, the card is replaced with a user greeting + CTA to browse

---

### 4.3 Browse (Panel 1 — BrowsePanel)

**Three sections, always visible:**

**Section 1 — Universe Carousel (HeroCarousel)**
- Horizontal snap-scroll carousel of Universe hero cards
- Each card: full-bleed cover image, universe name overlaid, genre tags, brief concept
- Selecting a universe populates Panel 2 (EntityDetailPanel)
- On wide screens: cards at ~90% panel width with peek of next card
- Pagination dots below; prev/next arrow buttons

**Section 2 — Author Carousel (AuthorCarousel)**  
- Horizontal free-scroll row of square author cards (SquareCard)
- Shows author avatar + pen name
- Tapping an author navigates to their AuthorScreen
- Shows top authors by follow count (up to 20)

**Section 3 — Story Feed (StoryList)**
- Vertical infinite-scroll list of StoryCards
- Each StoryCard: cover image (alternating left/right), author byline, title, synopsis, genre tags, love/follow counts, ReactionsStrip
- Tapping a story navigates to its detail in Panel 2 or pushes full screen on mobile
- Fetches `GET /api/stories?status=published&page=N`; loads next page at 80% scroll

---

### 4.4 Universe Detail (Panel 2 — EntityDetailPanel)

Shown when a universe is selected from Panel 1.

**Contents:**
- HeroCard: full-bleed cover image, universe name, concept (synopsis), creator byline, ReactionsStrip
- If current user is the creator: inline edit affordance (tap title/synopsis to edit; Save/Revert buttons appear)
- StoryList: all stories within this universe
- RoundCarousel: characters associated with this universe (name + circular avatar)
- CreateMidLevelFAB (floating, authenticated only): navigates to new story form pre-filled with this universeId

**Empty state (Panel 2 not selected — web wide only):**  
FeaturedCarousel — auto-advancing full-bleed carousel of featured universes with CTA button

---

### 4.5 Story & Page (Panel 3 — LeafPanel)

Shown when a story is selected from Panel 2.

**Contents:**
- PageCard: the currently selected page's full content (no line limit), optional inline illustration, ReactionsStrip
- PageList: alternate/sibling pages ("Alternate Pages") in summary mode (8-line truncation)
- CreateLeafFAB (floating, authenticated only): add a new page as child of current page

**Empty state (Panel 3 not selected — web wide only):**  
SuggestedList — vertical list of suggested authors to follow

---

### 4.6 Author Profile (AuthorScreen)

**Public author view:**
- Hero section: avatar (round-mask), pen name, bio, engagement counters
- HeroCarousel: universes created by this author
- StoryList: stories authored or co-authored
- FollowButton (floating); hidden when viewing own profile

**Own profile (ProfileScreen):**
- Same layout but all fields are editable inline
- Image picker for avatar
- LogoutButton accessible from top-bar overflow menu
- Settings accessible from overflow menu

---

### 4.7 Create Universe (TopLevelEntityFormScreen)

**Route:** `/universes/new` (Protected)

**Form fields:**
- Name (text, required, max 64 chars, globally unique)
- Concept / pitch (textarea, required, max 2000 chars)
- Cover Image (image picker → Blob upload)
- Era (text, optional, max 64 chars) — e.g. "Far Future", "Victorian"
- World (text, optional, max 64 chars) — setting name
- Genres (multi-select chips from: Fantasy, Sci-Fi, Romance, Thriller, Horror, Mystery, Adventure, Historical, Literary, Other)

**Behaviour:**
- Slug auto-generated from name (slugify)
- Inline validation on blur; full validation on submit
- On success: navigate to the new universe's detail page
- SaveButton (accent purple) + ClearFormButton

---

### 4.8 Create Story (MidLevelEntityFormScreen)

**Route:** `/stories/new?universeId=<slug>` (Protected)

**Form fields:**
- Title (text, required, max 128 chars)
- Synopsis (textarea, required, max 500 chars)
- Cover Image (optional, image picker)
- Genre Tags (multi-select, inherits universe genres by default)

**Behaviour:**
- Universe pre-filled from `universeId` param (immutable)
- Creator is automatically set as story creator with `ContributorRole.creator`
- On success: navigate to new story's detail

---

### 4.9 Add Page (LeafEntityFormScreen)

**Route:** `/pages/new?storyId=<id>&parentId=<pageId>` (Protected)

**Form fields:**
- Content (large textarea, required, max 10,000 chars; character counter shown)
- Illustration (optional image upload)

**Behaviour:**
- Parent story and parentId pre-filled from params
- If `parentId` is the story's root, this becomes a "next" page
- If sibling pages exist for this parent, a notice is shown: "You're adding an alternate path"
- On success: navigate to the new page's view

---

### 4.10 Reactions (Optimistic)

**Reaction types:**
- **Love** — toggleable; increments/decrements `love_count`
- **Follow** — toggleable; increments/decrements `follow_count`  
- **View** — fire-and-forget; auto-recorded on page open (not toggleable in UI)

**UX behaviour:**
- ReactionsStrip shows love count + follow count + share button
- Love and follow buttons update locally (optimistic) before API response
- On API error: revert count and show brief error toast
- Share button: copies URL to clipboard; shows "Copied!" confirmation

---

### 4.11 Discover

**Route:** `/discover`

Same as Browse but with a search bar at the top. Search queries `GET /api/universes?q=<term>` and `GET /api/stories?q=<term>`. Results displayed in the same three-panel layout. No separate search results page — results update the BrowsePanel inline.

---

### 4.12 Authors Directory

**Route:** `/authors`

SlimList of all authors. Each row: avatar, pen name, follow button. Clicking navigates to author's profile. Sorted by follow count descending. Paginated (20 per page).

---

## 5. Navigation Structure

### Desktop (Wide — ≥ 1024px)
Three-panel layout persists on one screen. Navigation bar across the top:
- Logo + tagline (left)
- Nav links: App · Universes · Authors · Discover
- Social icons (X, Facebook, Instagram, YouTube)
- Auth state: "Sign In" button (unauthenticated) or avatar dropdown (authenticated)
- Hamburger hidden

### Mobile (< 768px)
Bottom navigation bar with 5 tabs:
1. **Home** (house icon) → BrowsePanel
2. **Discover** (search icon) → Discover panel
3. **Create** (plus-circle icon, accent colour) → Universe creation form
4. **People** (people icon) → Authors directory
5. **Profile** (person icon) → Profile (or Sign In if unauthenticated)

### Routing Behaviour
- Wide + Medium: panel selection updates URL params (`?universe=slug&story=id&page=id`) without full navigation
- Narrow/mobile: each panel is a distinct route; browser back pops the stack
- Protected routes redirect to `/login?callbackUrl=<current>` then restore after auth

---

## 6. Design System

### Colours
| Token | Value | Usage |
|---|---|---|
| `--accent` | `#6A0DAD` | CTAs, FABs, active states, badges |
| `--accent-light` | `#8B2FC9` | Hover states |
| `--bg-primary` | `#0f0f0f` | Page background |
| `--bg-card` | `#1a1a1a` | Card backgrounds |
| `--bg-elevated` | `#242424` | Elevated panels |
| `--text-primary` | `#f0f0f0` | Body text |
| `--text-muted` | `#888888` | Secondary text, placeholders |
| `--border` | `#2e2e2e` | Subtle borders |
| `--error` | `#CC0000` | Error states, destructive actions |

### Typography
- Headings: system serif stack (`Georgia, 'Times New Roman', serif`) — maintains the literary feel of the static site
- Body: system sans-serif (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- Monospace: `'Courier New', monospace` — used sparingly in page content

### Skeuomorphic Book Component
The open-book carousel from the static site is the centrepiece. Its CSS (skeuomorp.css) produces a 3D book-spine effect with page curl shadows. This must be preserved exactly. The React `HeroCarousel` component wraps the same DOM structure and hydrates it with dynamic data.

### Spacing & Radius
- Base unit: 8px
- Card border-radius: 12px
- Button border-radius: 8px
- Input border-radius: 6px
- FAB border-radius: 50% (circular)

### Motion
- Panel transitions: 250ms slide-in from right (mobile) / 150ms cross-fade (desktop panels)
- Carousel slide: 300ms ease-in-out
- Reaction toggle: 150ms scale pulse (1 → 1.2 → 1)
- No `prefers-reduced-motion` override needed for MVP; respect system setting

---

## 7. Responsive Breakpoints

| Name | Range | Layout |
|---|---|---|
| Narrow | `< 768px` | Single column, stacked panels, bottom nav |
| Medium | `768px – 1023px` | 56px icon rail + 2 stacked panels |
| Wide | `≥ 1024px` | 3-column: 280px / flex / 320px |

---

## 8. Performance Requirements

| Metric | Target |
|---|---|
| LCP (Largest Contentful Paint) | < 2.5 s on 4G |
| FID / INP | < 200 ms |
| CLS | < 0.1 |
| API p95 response time | < 800 ms |
| Carousel initial load | < 1 s (uses ISR with 5-min revalidation) |

**Strategies:**
- Universe carousel page uses ISR (`revalidate: 300`)
- Cover images served via Vercel Blob CDN with `next/image` optimisation
- React Query caches server responses in memory for 2 minutes on client
- Redis cache-aside for all list endpoints
- No layout shift: skeleton loaders for all async sections (same dimensions as loaded content)

---

## 9. Error States

| Scenario | UX |
|---|---|
| DB unavailable | Static fallback data shown; banner: "We're having trouble loading stories" |
| API 401 on reaction | Toast: "Sign in to react" + link to login |
| API 429 rate limit | Toast: "Slow down! Try again in a moment" |
| Image upload fails | Toast with retry option; form not submitted |
| OAuth provider error | Redirect to login with `?error=OAuthCallback` param; user-friendly message shown |
| Story not found (404) | Custom 404 page with browse CTA |

---

## 10. Security Requirements

- All passwords hashed with bcrypt (cost factor 12)
- CSRF protection: NextAuth handles this for OAuth; `sameSite: strict` cookie for sessions
- SQL injection: all queries use parameterised statements via Neon tagged template literals
- Rate limiting: 20 write requests/minute per IP via Upstash Ratelimit
- Content moderation: not in MVP scope; note field for future moderation flags
- GDPR / privacy: `dob` field is never returned by any public API endpoint; used only for age-gating logic server-side
- Image upload validation: server-side MIME type check (allow only `image/jpeg`, `image/png`, `image/webp`); max 5 MB

---

## 11. SEO

- `robots.txt`: allow all public routes, disallow `/api/*` and `/profile/*`
- `sitemap.xml`: auto-generated at `/sitemap.xml` from universe and story slugs/ids; revalidates every hour
- Metadata: each universe and story page generates `<title>`, `<meta name="description">`, Open Graph (`og:title`, `og:description`, `og:image`), and Twitter Card tags using `generateMetadata()` in Next.js App Router
- Canonical URLs: `<link rel="canonical">` on all pages
- Structured data: `WebSite` + `SearchAction` JSON-LD on homepage (mirror of static page); `CreativeWork` on universe and story detail pages

---

## 12. Analytics & Tracking

Preserve the existing tracking from `index.html`:
- Google Analytics (G-3LK8JS27EZ) — initialise via `next/script` in root layout
- Facebook Pixel (3361892873893079) — initialise via `next/script`
- Both fire `pageview` on route change (use `usePathname` + `useEffect` pattern)

---

## 13. Out of Scope for MVP

The following are noted for future iterations and should not be built in MVP:

- Real-time collaborative editing (WebSockets / presence indicators)
- In-app notifications (when someone adds to your story)
- Story invitation system (inviting co-authors)
- Content moderation / reporting tools
- Monetisation / paid tiers
- Native mobile apps (iOS/Android)
- Dark/light theme toggle (dark is the only theme for MVP)
- Search with full-text indexing (basic ILIKE filtering only for MVP)
- Character creation form (characters are seeded; full CRUD in next iteration)
- Fan contribution workflow (fanContributor role exists in schema but no UI)

---

## 14. Deployment

| Environment | URL | Branch | Notes |
|---|---|---|---|
| Production | `kahaniverse.com` | `main` | Auto-deploy via Vercel |
| Preview | `*.vercel.app` | PRs | Vercel preview deployments |
| Local | `localhost:3000` | any | `.env.local` with dev credentials |

**Deployment checklist:**
1. Run `npm run db:migrate` against Neon production DB (use `DATABASE_URL_UNPOOLED`)
2. Run `npm run db:seed` if first deploy (checks for existing seed data before inserting)
3. Verify all env vars are set in Vercel project settings
4. Verify OAuth callback URLs are registered with each provider:
   - Google: `https://kahaniverse.com/api/auth/callback/google`
   - X: `https://kahaniverse.com/api/auth/callback/twitter`
   - Instagram: `https://kahaniverse.com/api/auth/callback/instagram`
5. Test auth flow end-to-end in preview before merging to main

---

## 15. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Instagram OAuth — Basic Display API is deprecated. Should we use Meta Login instead? | Tech lead | Open |
| 2 | Cover image dimensions — standardise on 16:9 or 4:3 aspect ratio? | Design | Open |
| 3 | Story status workflow — who can publish a story (creator only, or any contributor)? | Product | Open |
| 4 | View counting — should anonymous views be counted? | Product | Open |
| 5 | Neon free tier limits (0.5 GB storage) — is seed + early content within limits? | Tech lead | Likely OK |
