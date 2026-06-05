---
name: seed-content
description: Interactively author high-quality, coherent seed data for Kahaniverse — universes, stories, branching pages, characters, and authors — instead of random filler. Suggests stories from a universe concept and pages from a concept + synopsis, sources cover/illustration images from a local folder or the web, then loads everything into the database idempotently. Use when the user wants to seed, populate, or build an attractive starting dataset for the app.
---

# Seed Content for Kahaniverse

You are running an **interactive content-authoring session**, not a one-shot script. The goal is a hand-crafted, internally consistent dataset that makes the app look alive — universes whose stories belong to them, stories whose pages read like real prose, and images that fit. Never fabricate random/lorem content.

Content hierarchy (see `CLAUDE.md` and `web/lib/db/migrations/001_initial.sql`):
**Author** → creates **Universe** (+ optional **Characters**) → contains **Stories** → each story has a tree of branching **Pages** (one root, children are sequels/alternatives).

## How it works

You gather content through conversation, accumulate it into `web/scripts/seed-data.json`, then run the bundled loader (`web/scripts/seed-from-json.ts`) which inserts it idempotently. The shape of that JSON and every field/default is documented in `assets/seed-data.example.json` next to this skill — read it once before writing JSON. The existing `web/scripts/seed.ts` is left untouched; this is additive.

## Field reference (ground every value in this)

- **Author**: `authId` (unique key you invent, e.g. `seed:lila-fontaine`), `displayName` (≤64), `bio` (≤500), `avatarImage?`, `followCount?`, `loveCount?`.
- **Universe**: `slug` (lowercase, hyphenated, matches `^[a-z0-9]+(-[a-z0-9]+)*$`), `name` (≤64, unique), `concept` (≤2000, the worldbuilding pitch), `coverImage` (**required**), `era?`, `world?`, `genres` (enum array), `creatorAuthId`.
- **Character** (optional, per universe): `name` (≤128), `image` (**required**), `description?` (≤500).
- **Story**: `title` (≤128, unique within its universe), `synopsis` (≤500), `coverImage?`, `genreTags` (enum array), `status` (`draft`|`published`|`completed`|`abandoned`, default `published`), `authorAuthId`.
- **Page**: `content` (real prose, ≤10000), `illustration?`, `authorAuthId?`, optional `disallowNext`/`disallowAlternate`, and `children` (array of pages for branches).
- **Genres enum** (use these exact strings): `fantasy`, `scienceFiction`, `romance`, `thriller`, `horror`, `mystery`, `adventure`, `historical`, `literary`, `other`.

## Procedure

### 1. Preflight
- `cd web`. Confirm a database is reachable: the project uses Neon (or local Docker via `npm run stack:up`). If unsure, tell the user to ensure `DATABASE_URL` is set and the schema is migrated (`npm run db:migrate`). Don't proceed to load until this is settled.
- Note: the loader is idempotent — universes are keyed by `slug`, stories by `(title, universe)`. Re-running won't duplicate, but it also **won't add pages to a story that already exists**, so author full page trees before the first load.

### 2. Scope the session
Use `AskUserQuestion` to decide: how many universes to build this session, and whether to (a) author entirely from the user's ideas, (b) let you propose ideas they curate, or (c) extend the existing seed universes (Exodus 2120, The Ember Courts, Deva Protocol). Keep batches small enough to stay high-quality.

### 3. Build each universe
Gather, conversationally: the **concept** (worldbuilding — push for era/world/tone if thin), **name** (derive a slug), and **genres** (offer the enum via `AskUserQuestion`, multiSelect). Establish a **creator author** — either reuse one, or create a new author (ask for a display name + a one-line bio voice; you can draft the bio and counts). Optionally propose 1–3 **characters** that anchor the world.

### 4. Suggest stories from the concept
Given the universe concept, **propose 3–5 distinct story ideas** — each a title + a one-sentence synopsis, spanning different angles/tones within the world. Present them and let the user pick, edit, merge, or replace. Assign each chosen story an author (the universe creator or another). Set a sensible `status` and `genreTags` (inherit/refine from the universe). Aim for stories that obviously belong to *this* universe, not generic ones.

### 5. Suggest pages from concept + synopsis
For each chosen story, **propose a short branching outline** (a root opening, then 1–3 children — sequels and/or alternative paths) derived from the universe concept and the story synopsis. After the user approves the outline, **write the actual page prose** yourself: a few vivid paragraphs per page, in a voice consistent with the universe and author, each page ending at a natural branch point. Branches are real choices (`children`), not filler. Keep each page well under 10000 chars.

### 6. Images
Ask (via `AskUserQuestion`) how to source cover/illustration images:
- **Local folder** — ask for an absolute path. List its images (`Glob` on `<path>/**/*.{jpg,jpeg,png,webp}`). Match files to universes/stories/characters by filename and the content context. Copy chosen files into `web/public/images/` with slug-based names (e.g. `exodus-2120.jpeg`, `exodus-2120-last-sunrise.jpeg`) and set `coverImage`/`illustration`/`image` to `/images/<name>`.
- **From the web** — `WebSearch` for fitting, openly-licensed images using the universe/story context (prefer Unsplash, Pexels, Wikimedia Commons). Download the chosen image into `web/public/images/` (PowerShell `Invoke-WebRequest -Uri <url> -OutFile <path>`), named by slug, and reference it as `/images/<name>`. Tell the user the source/license. Don't hotlink arbitrary copyrighted images.
- **Placeholder/skip** — reuse an existing `/images/*.jpeg`, or for avatars use `https://i.pravatar.cc/240?u=<authId>` (the loader defaults to this when `avatarImage` is omitted).
Every universe needs a non-null `coverImage`. Confirm each image actually exists before referencing it.

### 7. Write and load
- Write the accumulated content to `web/scripts/seed-data.json` (match `assets/seed-data.example.json`; validate genres/status against the enums above).
- Ensure the loader exists at `web/scripts/seed-from-json.ts`. If absent, copy it from this skill's `assets/seed-from-json.ts`.
- Run it: `npx tsx scripts/seed-from-json.ts` (from `web/`). Surface its summary line and any error verbatim. On enum/constraint errors, fix the JSON and re-run.

### 8. Report
Summarize what was seeded (counts of universes/stories/pages/characters/authors) and suggest the user refresh the running app (or restart `npm run dev`) to see it. Mention that editing `seed-data.json` and re-running adds new content but won't add pages to already-seeded stories.

## Quality bar
- Coherence over volume. Every story should feel native to its universe; every page should advance or branch the story with real prose.
- No `any`, no lorem, no contradictions with the universe concept.
- Respect length limits and the genre/status enums — the loader validates them and will throw on a bad value.
- Keep it idempotent-friendly: author complete page trees before the first load.
