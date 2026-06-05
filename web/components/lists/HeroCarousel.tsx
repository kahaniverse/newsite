'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Universe } from '@/lib/types';
import { GENRE_LABELS } from '@/lib/types';
import { usePanelStore } from '@/store';
import { sampleCover } from '@/lib/sample-images';

interface Props {
  initialUniverses?: Universe[];
  /** Seed the detail panel with the visible universe. True on the home screen
   *  (nothing else selects one); false on deep-linked routes where
   *  <HydrateSelection> is the source of truth and must not be overridden. */
  autoSeed?: boolean;
}

export function HeroCarousel({ initialUniverses, autoSeed = true }: Props) {
  // No hardcoded fallback: with zero universes the carousel shows only the
  // trailing "create your own universe" slide.
  const [universes, setUniverses] = useState<Universe[]>(initialUniverses ?? []);
  const [current, setCurrent]     = useState(0);
  const [paused, setPaused]       = useState(false);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);
  const router                    = useRouter();
  const { selectionKind, selectedUniverseSlug, selectUniverse, setFocus } = usePanelStore();

  // One extra "create" slide trails the real universes, like the old app's
  // "Infinity / create your own universe" card at the end of the carousel.
  const total    = universes.length + 1;
  const isCreate = current === universes.length;
  const u        = universes[current];

  useEffect(() => {
    if (initialUniverses?.length) return;
    fetch('/api/universes?featured=true&limit=5')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data?.length) setUniverses(d.data); })
      .catch(() => null);
  }, []); // eslint-disable-line

  const goTo = useCallback((idx: number) => {
    setCurrent((idx + total) % total);
  }, [total]);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => goTo(current + 1), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [current, paused, goTo]);

  // Keep the detail panel pointed at the universe currently on show, so panel 2
  // always lists the highlighted universe's stories (skip the create slide).
  // Only runs in browse mode — once focused, the carousel is unmounted.
  useEffect(() => {
    if (!autoSeed) return;
    if (!u) return;
    selectUniverse(u.slug, u.id);
  }, [u?.slug, selectUniverse, autoSeed]); // eslint-disable-line

  const pick = useCallback((idx: number) => {
    const n = (idx + total) % total;
    setCurrent(n);
    const target = universes[n];
    if (target) selectUniverse(target.slug, target.id);
  }, [total, universes, selectUniverse]);

  const open = useCallback(() => {
    if (isCreate) { router.push('/universes/new'); return; }
    if (!u) return;
    selectUniverse(u.slug, u.id);
    // Narrow: stack the universe screen. Wide: take over panel 1 with its hero.
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) {
      router.push(`/universes/${u.slug}`);
    } else {
      setFocus('universe');
    }
  }, [isCreate, u, selectUniverse, setFocus, router]);

  const isActive = !isCreate && selectionKind === 'universe' && selectedUniverseSlug === u?.slug;

  // Touch-swipe between slides.
  const swipe = useRef<{ x: number; moved: boolean }>({ x: 0, moved: false });
  const onTouchStart = (e: React.TouchEvent) => { swipe.current = { x: e.touches[0].clientX, moved: false }; };
  const onTouchMove  = (e: React.TouchEvent) => { if (Math.abs(e.touches[0].clientX - swipe.current.x) > 10) swipe.current.moved = true; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - swipe.current.x;
    if (Math.abs(dx) > 40) pick(current + (dx < 0 ? 1 : -1));
  };

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-live="polite">
      <div
        role="link"
        data-testid="universe-hero"
        aria-label={isCreate ? 'Create a new universe' : `Open ${u?.name ?? 'universe'}`}
        tabIndex={0}
        onClick={() => { if (!swipe.current.moved) open(); }}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && open()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`relative w-full overflow-hidden rounded-card cursor-pointer aspect-[3/4] bg-bg-elevated transition-shadow ${
          isActive ? 'ring-2 ring-brand shadow-[0_4px_18px_rgba(0,0,0,0.55)]' : 'hover:shadow-[0_4px_18px_rgba(0,0,0,0.55)]'
        }`}
      >
        {isCreate ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 border-2 border-dashed border-brand/50 rounded-card">
            <span className="text-5xl" aria-hidden>✨</span>
            <h2 className="font-serif text-2xl font-bold text-text-primary">Infinity</h2>
            <p className="text-sm text-text-muted">Press here to create your own universe based on a unique concept.</p>
            <span className="btn-pill btn-pill-primary !h-10 !px-5 !text-sm mt-1">+ New Universe</span>
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/* LCP element — eager + high fetch priority so the hero cover paints
                first. Stays a plain <img> (covers may be Blob/picsum URLs not
                whitelisted for next/image). */}
            <img src={u.coverImage || sampleCover(u.id)} alt={u.name} className="absolute inset-0 w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
            <div className="absolute inset-0 hero-scrim" />
            {u.genres.length > 0 && (
              <span className="absolute top-3 left-3 text-[11px] font-semibold uppercase tracking-wider text-white bg-brand/90 px-2.5 py-1 rounded-full">
                {u.genres.map(g => GENRE_LABELS[g]).join(' · ')}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 p-4 space-y-1.5">
              <h2 className="hero-title font-serif text-2xl font-bold text-white leading-tight line-clamp-2">{u.name}</h2>
              <p className="text-xs text-white/80">by {u.creator.displayName}</p>
              <p className="text-sm text-white/85 leading-snug line-clamp-3">{u.concept}</p>
            </div>
          </>
        )}
      </div>

      {/* Pagination — mauve active / red inactive */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <button type="button" onClick={() => pick(current - 1)} aria-label="Previous"
          className="text-text-muted hover:text-accent text-lg leading-none w-7 h-7 flex items-center justify-center">&#8592;</button>
        <div className="flex items-center gap-2" role="tablist" aria-label="Universe slides">
          {Array.from({ length: total }).map((_, i) => (
            <button key={i} type="button" role="tab" aria-label={i === universes.length ? 'Create' : `Universe ${i + 1}`}
              aria-selected={i === current} onClick={() => pick(i)}
              className={`h-2 rounded-full transition-all ${i === current ? 'w-5 bg-accent' : 'w-2 bg-brand/40 hover:bg-brand/70'}`} />
          ))}
        </div>
        <button type="button" onClick={() => pick(current + 1)} aria-label="Next"
          className="text-text-muted hover:text-accent text-lg leading-none w-7 h-7 flex items-center justify-center">&#8594;</button>
      </div>
    </div>
  );
}
