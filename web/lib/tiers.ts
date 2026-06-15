import type { AuthorTier } from '@/lib/types';

// Ascending order — mirrors the `author_tier` Postgres enum declaration so
// rank comparisons here match the DB's enum ordering.
export const TIER_ORDER: AuthorTier[] = ['reader', 'writer', 'author', 'creator'];

/** Numeric rank for comparisons (higher = more senior). */
export function tierRank(tier: AuthorTier): number {
  return TIER_ORDER.indexOf(tier);
}

export interface TierMeta {
  label:       string;  // singular, e.g. "Creator"
  plural:      string;  // People-tab section heading, e.g. "Creators"
  glyph:       string;  // emoji badge icon
  description: string;  // how it's earned (badge tooltip)
  /** Tailwind classes for the badge pill — chosen to read on the light
   *  "paper-card" surface as well as dark portrait/hero overlays. */
  badgeClass:  string;
}

export const TIER_META: Record<AuthorTier, TierMeta> = {
  creator: { label: 'Creator', plural: 'Creators', glyph: '🌌', description: 'Created a universe', badgeClass: 'bg-rose-100 text-rose-700 border-rose-200' },
  author:  { label: 'Author',  plural: 'Authors',  glyph: '📖', description: 'Started a story',    badgeClass: 'bg-violet-100 text-violet-700 border-violet-200' },
  writer:  { label: 'Writer',  plural: 'Writers',  glyph: '📝', description: 'Wrote a page',        badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  reader:  { label: 'Reader',  plural: 'Readers',  glyph: '📕', description: 'Exploring stories',   badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
};

/** People-tab section order: highest tier first. */
export const TIER_SECTIONS: AuthorTier[] = ['creator', 'author', 'writer', 'reader'];
