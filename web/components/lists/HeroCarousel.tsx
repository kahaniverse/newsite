'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Universe } from '@/lib/types';
import { GENRE_LABELS } from '@/lib/types';

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

  return (
    <div
      className="book-wrapper"
      role="region"
      aria-label="Story carousel"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
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
          onClick={() => goTo(current - 1)}
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
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <button
          className="carousel-btn"
          id="nextBtn"
          onClick={() => goTo(current + 1)}
          aria-label="Next story"
        >
          &#8594;
        </button>
      </div>
    </div>
  );
}
