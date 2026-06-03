'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Universe } from '@/lib/types';
import { GENRE_LABELS } from '@/lib/types';
import { usePanelStore } from '@/store';

const FALLBACK: Universe[] = [
  {
    id: 'seed-1', slug: 'exodus-2120', name: 'Exodus 2120',
    concept: 'The world is ending. Some of humanity escapes on generational starships bound for new planetary systems. These are the stories of those who did — and those left behind.',
    coverImage: '/images/exodus.jpeg', era: 'Far Future', world: 'Sol System',
    genres: ['scienceFiction'],
    creator: { id: 'system', displayName: 'Kahaniverse' },
    loveCount: 0, followCount: 0, viewCount: 0, storyCount: 0, createdAt: '',
  },
];

interface Props { initialUniverses?: Universe[] }

export function HeroCarousel({ initialUniverses }: Props) {
  const [universes, setUniverses] = useState<Universe[]>(initialUniverses?.length ? initialUniverses : FALLBACK);
  const [current, setCurrent]     = useState(0);
  const [paused, setPaused]       = useState(false);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);
  const router                    = useRouter();
  const { selectionKind, selectedUniverseSlug, selectUniverse } = usePanelStore();

  // Fetch from API if no SSR data provided
  useEffect(() => {
    if (initialUniverses?.length) return;
    fetch('/api/universes?featured=true&limit=5')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data?.length) setUniverses(d.data); })
      .catch(() => null);
  }, []); // eslint-disable-line

  const goTo = useCallback((idx: number) => {
    setCurrent((idx + universes.length) % universes.length);
  }, [universes.length]);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => goTo(current + 1), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [current, paused, goTo]);

  const u = universes[current];

  // On first mount (and whenever the data set first loads), seed the
  // detail panel with the currently-visible universe so the middle column
  // has something to show without forcing the user to click.
  useEffect(() => {
    if (!u) return;
    if (selectionKind === null) selectUniverse(u.slug, u.id);
  }, [u?.slug, selectionKind, selectUniverse]); // eslint-disable-line

  // User-initiated slide change → update the detail panel.
  const pick = useCallback((idx: number) => {
    goTo(idx);
    const target = universes[(idx + universes.length) % universes.length];
    if (target) selectUniverse(target.slug, target.id);
  }, [goTo, universes, selectUniverse]);

  // Clicking the book: select in the detail-panel store on wide/medium
  // (where the middle column actually shows it), or route to the dedicated
  // universe page on narrow layouts where there is no detail panel.
  const openUniverse = useCallback(() => {
    if (!u) return;
    selectUniverse(u.slug, u.id);
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) {
      router.push(`/universes/${u.slug}`);
    }
  }, [u, selectUniverse, router]);

  const isActive = selectionKind === 'universe' && selectedUniverseSlug === u?.slug;

  return (
    <div
      className={`book-wrapper cursor-pointer${isActive ? ' is-selected' : ''}`}
      role="link"
      aria-label={`Open ${u?.name ?? 'universe'}`}
      aria-live="polite"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={openUniverse}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openUniverse()}
    >
      {/* Skeuomorphic book — DOM structure matches index.html exactly so CSS applies */}
      <div id="skwrapper">
        <div id="skcontainer">
          <section className="open-book" id="openBook">
            <header>
              <span className="page-genre-tag" id="genreTag">
                {u.genres.map(g => GENRE_LABELS[g]).join(' · ')}
              </span>
              <h1 id="bookAuthor">Author: {u.creator.displayName}</h1>
            </header>
            <article>
              <div className="frame">
                <img
                  id="storyImage"
                  className="illustration"
                  src={u.coverImage}
                  alt={u.name}
                  width={600}
                  height={300}
                  loading="eager"
                />
              </div>
              <h2 className="chapter-title" id="chapterTitle">{u.name}</h2>
              <p id="chapterText">{u.concept.slice(0, 220)}</p>
              {u.concept.length > 220 && (
                <p id="chapterTextRight" style={{ marginTop: '0.75em' }}>
                  {u.concept.slice(220, 420)}
                </p>
              )}
            </article>
          </section>
        </div>
      </div>

      {/* Controls */}
      <div className="carousel-controls">
        <button
          className="carousel-btn"
          id="prevBtn"
          onClick={(e) => { e.stopPropagation(); pick(current - 1); }}
          aria-label="Previous story"
        >
          &#8592;
        </button>

        <div className="carousel-dots" role="tablist" aria-label="Story slides">
          {universes.map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === current ? 'active' : ''}`}
              data-index={i}
              role="tab"
              aria-label={`Story ${i + 1}`}
              aria-selected={i === current}
              onClick={(e) => { e.stopPropagation(); pick(i); }}
            />
          ))}
        </div>

        <button
          className="carousel-btn"
          id="nextBtn"
          onClick={(e) => { e.stopPropagation(); pick(current + 1); }}
          aria-label="Next story"
        >
          &#8594;
        </button>
      </div>
    </div>
  );
}
