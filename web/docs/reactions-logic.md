# Reactions Logic — Current State, Why It's Still Broken, and Decisions Needed

> Working document. Read it, correct anything wrong, write your decisions in the
> **DECISION** boxes in §7, then hand it back and I'll implement to match.

---

## 0. What you're observing

- A like/connect you made shows on one view of an item but not another (card vs. detail).
- The reaction glyph is **red (active) but the count is 0** (or otherwise wrong).
- Views don't behave as expected on click-through.

The first round of fixes (load the viewer's own state from the DB; make views
unique-per-user) addressed *part* of this, but a second class of bug remains:
**the displayed count and the active glyph are produced by a tangle of sources
that override each other in the wrong order.** This document explains that
tangle precisely.

---

## 1. There are THREE sources for what a ReactionsStrip shows

For any single entity (e.g. one story), the count + active state shown can come from:

| # | Source | Where it comes from | Freshness |
|---|--------|---------------------|-----------|
| **A** | **SSR / list prop** `loveCount` etc. | The denormalized `love_count`/`follow_count`/`view_count` columns, read by the DB query and passed as a React prop into `ReactionsStrip`. | Varies wildly — see §4. Can be stale or drifted. |
| **B** | **Authoritative hydration** | `GET /api/reactions?targetIds=…` → `getReactionState()` counts the actual `reactions` rows + the viewer's own rows. | Always live (route is `force-dynamic`). |
| **C** | **Optimistic local toggle** | User clicks → `applyToggle` adjusts the store by ±1. | Instant, local, until the POST confirms. |

All three write into the **same Zustand store** keyed by `targetId`
(`store/index.ts`). The bug is **the order and conditions** under which A, B, C
write — they currently clobber each other.

---

## 2. Current mount → render control flow

Every `ReactionsStrip` (in `components/ui/ReactionsStrip.tsx`) runs this effect on
mount and whenever its count props change:

```ts
useEffect(() => {
  initCounts(targetId, { love: loveCount, follow: followCount, view: viewCount }); // writes source A
  hydrateReactions(targetId);                                                       // triggers source B
}, [targetId, loveCount, followCount, viewCount]);
```

### `initCounts` (source A) — store/index.ts
```ts
initCounts(targetId, counts, active) {
  counts: { ...state.counts, [targetId]: counts },          // ⚠️ OVERWRITES count unconditionally
  active: { ...ZERO_ACTIVE, ...existingActive, ...active },  // merges (preserves) active
}
```
- **Count is overwritten every time** the effect runs (every remount, every prop
  change), with whatever prop value arrived — even if that prop is stale.
- Active is *preserved* (merged), so it does not get reset to false.

### `hydrateReactions` (source B) — lib/reactions/hydrate.ts
```ts
const fetched = new Set<string>();          // module-level, lives for whole SPA session
function hydrateReactions(targetId) {
  if (fetched.has(targetId)) return;        // ⚠️ FETCHES AT MOST ONCE PER SESSION PER TARGET
  fetched.add(targetId);
  ...batch GET... → store.hydrateState(...)
}
```

### `hydrateState` (applies source B) — store/index.ts
```ts
hydrateState(entries) {
  for (e of entries) {
    if (touched.has(e.targetId)) continue;   // ⚠️ SKIPS any target the user has toggled
    counts[e.targetId] = { love, follow, view };       // authoritative count
    active[e.targetId] = { love: myLove, follow: myFollow };
  }
}
```

### `applyToggle` (source C) — store/index.ts
```ts
applyToggle(targetId, type, nextActive) {
  touched.add(targetId);                     // marks target as "user touched" forever
  counts[targetId][type] += (nextActive ? 1 : -1);
  active[targetId][type] = nextActive;
}
```

---

## 3. The three guards and how they collide

There are two module-level `Set`s that live for the **entire SPA session** and are
never cleared:

- **`fetched`** (hydrate.ts): "have we ever hydrated this target?" → blocks re-hydration.
- **`touched`** (store): "has the user ever toggled this target?" → blocks hydration from writing.

**The fatal interaction:**

1. After a target is hydrated **once**, `fetched` blocks **all future** hydration
   for it — even after navigating to a different view where the prop count is stale.
2. Meanwhile `initCounts` (source A) **keeps overwriting the count** on every
   remount with the stale prop.
3. So on the second view, the count = stale prop (A), and hydration (B) is **not
   allowed to correct it**. Active state survives (it was merged/preserved), so you
   get **red glyph + stale/zero count**.

`touched` adds a second trap: once you like something, `hydrateState` will *never*
write that target again, so even if hydration did run, the authoritative count
wouldn't be reapplied — and `initCounts` is free to stomp the optimistic count
with a stale prop on the next remount.

---

## 4. Why the prop (source A) is so often stale — caching per call-site

The `loveCount` prop handed to `ReactionsStrip` has wildly different freshness
depending on where the strip is rendered:

| Call-site | Variant | Count source | Caching that makes it stale |
|-----------|---------|--------------|------------------------------|
| `StoryCard` (in `StoryList`) | block | `useInfiniteStories` → `/api/stories` | React Query, **no staleTime** (gcTime 5min keeps old pages in memory) |
| `MoreUniverses` tile | block | `useInfiniteUniverses` → `/api/universes` | React Query **staleTime 5min** + home page **ISR `revalidate=300`** + Redis **`cache:universes:featured` 5min** |
| `HeroCard` | inline | universe prop | same universe caching |
| `HeroBlock` on **story detail route** `/stories/[id]` | inline | `getStoryById` (server) | **no ISR → fresh** ✅ |
| `HeroBlock` on **universe detail route** `/universes/[slug]` | inline | `getUniverseBySlug` (server) | **no ISR → fresh** ✅ |
| `HeroBlock` in **horizontal `SelectionHero` panel** | inline | `useStory`/`useUniverse` → `/api/...` | React Query **staleTime 5min** (stale) |
| `PageCard` / page detail | block/inline | `getPageById` / `getPagesByStory` | no ISR → fresh; lists via React Query |
| Author profile | inline | `/api/authors/[id]` | Redis **author cache 10min** |

**Consequence:** the *same* story can be shown with a **fresh** count on its
detail *route* and a **5-minutes-stale** count on a list card or the horizontal
detail *panel* — at the same moment. Because hydration is blocked after the first
run (§3), nothing reconciles them.

---

## 5. Concrete failure walk-throughs

### Scenario X — "red icon, count 0" (or stale)
1. Featured universe shows `love=0` everywhere (cached at 0 in Redis/RQ/ISR).
2. User clicks ❤ on the card → `applyToggle`: count `0→1`, active=true,
   `touched.add(id)`. POST succeeds → DB row added, `love_count=1`.
3. User opens the universe (or a panel re-mounts the strip). The prop count is
   still the cached **0** (sources in §4 are stale for 5 min).
4. `initCounts` overwrites store count → **0**. Active was preserved → **true**.
5. `hydrateReactions` sees `id` in `fetched` → **does nothing**.
   (Even if it ran, `hydrateState` skips `touched` ids.)
6. **Result: red ❤ + count 0.** ❌

### Scenario Y — like shows on card but not detail
1. User likes on a card (session A of the store entry). Count/active updated locally.
2. Navigates to the detail **route** (fresh SSR). `initCounts` sets fresh count.
   Active preserved. This view is usually fine.
3. But the horizontal **panel** view (React Query, stale) or *another* list
   showing the same item re-mounts with a stale prop → `initCounts` stomps the
   count back; hydration blocked. Inconsistent across the two simultaneous views. ❌

### Scenario Z — views
1. `ViewTracker` POSTs a unique view on detail mount → DB `view_count += 1` (once
   per viewer). Fine server-side.
2. But the displayed view number comes from source A (the prop), which was
   rendered *before* the POST and is cached for minutes. Hydration that would
   correct it is blocked after first run. So the increment isn't visible until a
   cache expiry / hard reload. ⚠️ (Possibly acceptable — see DECISION 4.)

---

## 6. Root cause, in one sentence

> We have three writers (stale prop, authoritative hydration, optimistic toggle)
> into one store, and the guards (`initCounts` overwrites unconditionally,
> `fetched` blocks re-hydration after once, `touched` blocks hydration forever)
> are arranged so that **the stale prop wins on re-mounts and the authoritative
> value is locked out.**

---

## 7. Design options & DECISIONS NEEDED

The fix is to establish a **single, well-ordered source of truth**. Below are the
decisions that determine the implementation. Edit the **DECISION** lines.

### Q1 — What is the authoritative source for the *count*?
- **(a)** The `reactions` table via hydration (`getReactionState`, what we built).
  Always live; immune to denormalized drift; costs one batched GET per view.
- **(b)** The denormalized `*_count` columns, but fix all caching so they're never
  stale (drop staleTimes, drop Redis featured cache, drop ISR, or `revalidateTag`
  on every reaction). Cheaper reads, but reactions then bust caches a lot and any
  historical drift still shows.
- **(c)** Hybrid: denormalized column for first paint, hydration result always
  overrides it when it arrives.

> **DECISION 1:** **(c) hybrid** — denormalized column seeds first paint; the reactions table (via hydration) is authoritative and corrects it on first encounter. Love/follow come from hydration; **view** is kept from the SSR seed + optimistic bump (views can't drift since `recordViewOnce` bumps the column and inserts the row together).

### Q2 — Should `initCounts` (the SSR/list prop) ever overwrite a count already in the store?
- **(a)** No — `initCounts` becomes "seed only if absent." Once the store has a
  value (from a prior seed, hydration, or a toggle), a later stale prop can't stomp it.
- **(b)** Yes, but only if the incoming prop is newer (we'd need a timestamp/version — heavier).

> **DECISION 2:** **(a) seed-if-absent** — once the store has a value for a target
> (from a prior seed, hydration, or a toggle), a later stale prop must NOT overwrite
> it. This is what makes a reaction made on one screen survive a back-navigation to
> another screen (req 4): the in-session store is the single source of truth.

### Q3 — How often should hydration run / be allowed to write?
- **(a)** Re-hydrate on every strip mount (still batched), and let hydration
  **always** write the authoritative count+active — including for `touched`
  targets, *unless* that target has an in-flight (unconfirmed) POST. After a POST
  confirms, the server value equals the optimistic value, so re-hydration is safe
  and self-correcting. (Replace the permanent `fetched`/`touched` locks with a
  short-lived "in-flight" guard.)
- **(b)** Keep once-per-session hydration but ALSO update the store on every
  React-Query refetch and after every successful toggle POST (more wiring).
- **(c)** Time-box hydration (e.g. re-hydrate if last hydrate > N seconds ago).

> **DECISION 3:** **once per target per session is sufficient** (keep the `fetched`
> guard). Because the store is now authoritative and never clobbered by props
> (DECISION 2), one hydration on first encounter is enough to load the viewer's own
> state + correct any stale seed. The `touched` guard stays only to protect an
> in-flight optimistic toggle from a hydration response that's still arriving.
> Cross-user live updates (someone else's like mid-session) are NOT required and
> resolve on next full load. Love/follow are hydration-authoritative; **view is left
> to the SSR seed + optimistic bump** so hydration can't stomp the viewer's own view.

### Q4 — View count display on click-through
- **(a)** Fine for the incremented view to appear on next load (server-authoritative;
  hydration shows it once Q3 lets hydration re-run). Simplest.
- **(b)** Optimistically bump the viewer's own view count by 1 in the store the
  first time `ViewTracker` records it, so they see it tick immediately.

> **DECISION 4:** **(b) optimistic bump** — req 1 wants the view to increment on
> drill-through and req 4 wants it visible. On a successful unique-view record,
> bump the viewer's view count by 1 in the store (order-independent via a pending-
> view set, so it works whether ViewTracker or ReactionsStrip mounts first).
> Unique-per-user is kept (low storage cost at this scale — one row per viewer per
> item, same as a like). If that ever becomes costly, drop the uniqueness and just
> increment (per req 1's fallback).

### Q5 — Should counts shown to *anonymous* users be live too?
You said anonymous users don't reach these pages. If that's strictly true we can
ignore them. If not, hydration already returns correct counts for anon (no "mine"
flags), so it's covered.

> **DECISION 5:** anonymous users **do not** reach item pages → keep the reactions
> API auth-gated; hydration still returns correct counts for completeness.

### Q6 — Session-scoped guards (`fetched`, `touched`) are module-level and never
reset across login/logout within one SPA session. Should they reset on auth change?
- **(a)** Yes — clear reaction store + guards when the session user changes (so a
  new user doesn't inherit the previous user's "mine" flags).
- **(b)** Don't care (single-user devices / full reload on login).

> **DECISION 6:** **(a) reset on auth change** — clear the reaction store + the
> `fetched`/`touched`/pending-view guards when the signed-in user id changes, so a
> new user doesn't inherit the previous user's "mine" flags. Low cost, avoids a
> subtle wrong-state bug.

---

## 7b. FINALIZED PLAN (data fix — phase 1)

**Sequencing:** Data-consistency fix now; the req-2 gestures (double-tap = love,
swipe = follow/unfollow) are **deferred to phase 2** because they collide with the
card's existing tap-to-open and with horizontal carousel scrolling, and deserve
their own design.

**Colors (req 5):** love active = red + filled; **follow active keeps its accent
color** (filled). "Filled/colored = the current user reacted" holds for both; only
the hue differs.

**Model:** the in-session Zustand store is the single source of truth.
1. `initCounts` = seed-if-absent (never clobber an existing entry).
2. First encounter triggers one hydration → authoritative love/follow + the
   viewer's own state; corrects a stale seed.
3. `applyToggle` mutates the store + POSTs; `touched` protects the in-flight toggle
   from a late hydration response.
4. Stale props on later mounts / back-navigation are ignored → reaction stays
   visible everywhere (reqs 3, 4).
5. Red-fill ⇔ `myLove` true ⇔ count includes the viewer's +1; re-click toggles off,
   decrements, un-colors (req 5).
6. View: unique-per-user record on detail drill-through + optimistic bump for
   immediate visibility (req 1); view is not subject to hydration overwrite.
7. Reset store + guards when the auth user changes (DECISION 6).

---

## 8. Invariants the fix must guarantee (proposed — edit if you disagree)

1. **If a glyph is red for the viewer, the count for that reaction is ≥ 1.**
   (No "red + 0".)
2. **The same entity shows the same count + active state in every place it's
   visible at the same time** (card, list, detail route, detail panel), within the
   latency of one hydration round-trip.
3. **Merely appearing in a list never changes an entity's counts.** Only an explicit
   click (love/follow) or a click-through detail view (unique view) changes data.
4. **A stale cached prop can never override a value the store already learned**
   (whether from hydration or the user's own action).
5. **A view is counted at most once per signed-in viewer per item**, on detail
   click-through only.

---

## 9. Likely code touch-points once decisions are set
(Indicative — exact set depends on §7 answers.)

- `store/index.ts` — `initCounts` → seed-if-absent; rework `touched`/guards;
  possibly add per-target "in-flight" tracking; optional auth-change reset.
- `lib/reactions/hydrate.ts` — remove/loosen the permanent `fetched` lock; allow
  re-hydration; keep batching.
- `components/ui/ReactionsStrip.tsx` — effect ordering (seed then hydrate).
- `hooks/useReactions.ts` — on successful toggle POST, clear the in-flight guard so
  re-hydration can resume; reconcile.
- `components/ui/ViewTracker.tsx` — optional optimistic view bump (Q4b).
- Possibly the list/detail caching (`staleTime`, Redis featured cache, ISR) if
  DECISION 1 = (b).
- Tests: extend `tests/integration/queries-reactions.test.ts`; add a store-level
  unit test for the seed/hydrate/toggle ordering.
```
