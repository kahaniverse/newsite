// Regenerates public/universes.json — the data the static landing page
// (public/index.html + public/js/main.js) reads for its book carousel. The
// landing is what guests see at "/" (middleware rewrites unauthenticated
// visitors to /index.html), so this is how seeded universes reach the home
// screen.
//
//   npm run generate:carousel        (from web/)
//
// Picks DISPLAY_COUNT universes at random from the FULL set in the DB (any
// universe that has at least one story), so the book shows a different trio
// each day. The pick is seeded by today's date (UTC), so it is stable if the
// script runs several times in a day and rotates when the date changes —
// ideal for a once-a-day job. Override the seed with CAROUSEL_SEED=<string>
// (handy for tests or to force a reshuffle).
//
// main.js fetches /universes.json and expects a FLAT ARRAY of book-shaped
// objects: { title, genre, genreTag, image, imageAlt, leftText, rightText,
// quote }. We build that shape from the live DB.
//
// _load-env must be imported first so DATABASE_URL / Redis env are set before
// the db client module (pulled in transitively by getUniverses) evaluates.

import './_load-env';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { getUniverses } from '@/lib/db/queries/universes';
import { GENRE_LABELS } from '@/lib/types';
import type { Universe } from '@/lib/types';

const DISPLAY_COUNT = 3;

// Trim a long concept to the first sentence(s) that fit comfortably on the
// book's left page, breaking on a sentence end or word boundary.
function blurb(concept: string, max = 280): string {
  const text = concept.trim();
  if (text.length <= max) return text;
  const window = text.slice(0, max);
  const lastStop = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
  if (lastStop > max * 0.5) return window.slice(0, lastStop + 1);
  const lastSpace = window.lastIndexOf(' ');
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window).trimEnd() + '…';
}

// Small string hash → 32-bit seed.
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: tiny deterministic PRNG so the daily pick is reproducible.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministically pick n items using a seeded Fisher-Yates shuffle.
function pickDaily<T>(items: T[], n: number, seedStr: string): T[] {
  if (items.length <= n) return items;
  const rng = mulberry32(hashSeed(seedStr));
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

function toBook(u: Universe) {
  const tags = u.genres.map(g => GENRE_LABELS[g]).filter(Boolean);
  const stories = `${u.storyCount} ${u.storyCount === 1 ? 'story' : 'stories'}`;
  return {
    title:     u.name,
    genre:     tags[0] ?? 'Other',
    genreTag:  tags.join(' · ') || 'Other',
    image:     u.coverImage,
    imageAlt:  `${u.name} — universe cover`,
    leftText:  blurb(u.concept),
    rightText: `By ${u.creator.displayName} · ${stories} so far. Add your chapter to this living universe.`,
    quote:     'Every universe needs its storyteller.',
  };
}

async function main() {
  // The full set in the DB (high limit), then keep universes that actually have
  // stories so the carousel never lands on an empty one.
  const { data } = await getUniverses({ page: 1, limit: 100 });
  const pool = data.filter(u => u.storyCount > 0);

  const seed = process.env.CAROUSEL_SEED ?? new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const chosen = pickDaily(pool, DISPLAY_COUNT, seed);

  const carousel = chosen.map(toBook);
  writeFileSync(join(process.cwd(), 'public', 'universes.json'), JSON.stringify(carousel, null, 2));
  console.log(`Written ${carousel.length} of ${pool.length} universes to public/universes.json (seed ${seed}): ${chosen.map(u => u.name).join(', ')}.`);
}

main().catch(err => { console.error(err); process.exit(1); });
