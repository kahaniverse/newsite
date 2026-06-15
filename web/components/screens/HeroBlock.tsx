import { ReactionsStrip } from '@/components/ui/ReactionsStrip';
import { sampleCover } from '@/lib/sample-images';
import type { ReactNode } from 'react';
import type { TargetType } from '@/lib/types';

interface ReactionsCfg {
  targetId:    string;
  targetType:  TargetType;
  loveCount:   number;
  followCount: number;
  viewCount?:  number;
  shareUrl?:   string;
}

interface Props {
  image?:     string;
  imageSeed?: string;
  /** CSS aspect ratio, e.g. "16/9", "4/3", "1/1". */
  aspect?:    string;
  genres?:    string[];   // already-labelled
  title:      string;
  byline?:    ReactNode;
  synopsis?:  string;
  meta?:      ReactNode;
  reactions?: ReactionsCfg;
}

// The single hero used at the top of every entity screen — cover/photo image
// with an overlaid genre tag, title, byline, synopsis, then a reactions row.
// Mirrors the old app's section-0 HeroCard.
export function HeroBlock({
  image, imageSeed, aspect = '16/9', genres, title, byline, synopsis, meta, reactions,
}: Props) {
  const src = image || sampleCover(imageSeed || title, 800, 600);
  return (
    <section className="overflow-hidden rounded-card bg-bg-elevated" aria-label={title}>
      <div className="relative w-full" style={{ aspectRatio: aspect.replace('/', ' / ') }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 hero-scrim" />

        {genres && genres.length > 0 && (
          <span className="absolute top-3 left-3 text-[11px] font-semibold uppercase tracking-wider text-white bg-brand/90 px-2.5 py-1 rounded-full">
            {genres.join(' · ')}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4 space-y-1.5">
          <h1 className="hero-title font-serif text-2xl font-bold text-white leading-tight line-clamp-2">
            {title}
          </h1>
          {byline}
          {synopsis && <p className="text-sm text-white/85 leading-snug line-clamp-3">{synopsis}</p>}
          {meta}
        </div>
      </div>

      {reactions && (
        <div className="px-3 py-2 bg-bg-card border-t border-border">
          {/* The focused-entity hero owns the freshest count for this target. */}
          <ReactionsStrip {...reactions} tone="light" authoritative />
        </div>
      )}
    </section>
  );
}
