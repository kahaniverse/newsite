'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HeroBlock } from '@/components/screens/HeroBlock';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePanelStore } from '@/store';
import { useUniverse, useAuthor, useStory } from '@/hooks/useSelection';
import { GENRE_LABELS } from '@/lib/types';

// Panel 1 in focused-takeover mode: the hero of whatever was selected in the
// browse panel (universe / story / author), with a control to drop back to the
// browse list. The matching detail panel renders the same entity's body without
// repeating this hero. Horizontal layout only.
export function SelectionHero() {
  const { focusKind, selectedUniverseSlug, selectedAuthorId, selectedStoryId, clearFocus } = usePanelStore();
  const router   = useRouter();
  const pathname = usePathname() ?? '/';

  // Drop the focused takeover (panel 1 → browse list). When we got here via a
  // real entity route (/universes/[slug], /stories/[id], /authors/[id]) rather
  // than an in-place drill on home, also move the URL back to the browse root so
  // the address bar matches the view (and a refresh doesn't re-focus the hero).
  function backToBrowse() {
    clearFocus();
    if (pathname !== '/') router.push('/');
  }

  return (
    <div className="flex flex-col gap-4 panel-enter">
      <button
        type="button"
        onClick={backToBrowse}
        className="self-start inline-flex items-center gap-1 text-sm text-accent hover:brightness-110 transition"
        aria-label="Back to browse"
      >
        <span className="text-xl leading-none" aria-hidden>‹</span>
        <span className="font-medium">Browse</span>
      </button>

      {focusKind === 'author'
        ? <AuthorHero authorId={selectedAuthorId} />
        : focusKind === 'story'
          ? <StoryHero storyId={selectedStoryId} />
          : <UniverseHero slug={selectedUniverseSlug} />}
    </div>
  );
}

function UniverseHero({ slug }: { slug: string | null }) {
  const { data: u, isLoading } = useUniverse(slug);
  if (isLoading) return <HeroSkeleton />;
  if (!u) return null;
  return (
    <HeroBlock
      image={u.coverImage}
      imageSeed={u.id}
      aspect="3/4"
      genres={u.genres.map(g => GENRE_LABELS[g])}
      title={u.name}
      byline={
        <Link href={`/authors/${u.creator.id}`} className="text-xs text-white/80 hover:underline block">
          by {u.creator.displayName}
        </Link>
      }
      synopsis={u.concept}
      meta={
        <div className="flex flex-wrap gap-3 text-xs text-white/75 pt-0.5">
          {u.era   && <span>📅 {u.era}</span>}
          {u.world && <span>🌍 {u.world}</span>}
          <span>📖 {u.storyCount} stories</span>
        </div>
      }
      reactions={{
        targetId:    u.id,
        targetType:  'universe',
        loveCount:   u.loveCount,
        followCount: u.followCount,
        viewCount:   u.viewCount,
        shareUrl:    `${process.env.NEXT_PUBLIC_APP_URL}/universes/${u.slug}`,
      }}
    />
  );
}

function StoryHero({ storyId }: { storyId: string | null }) {
  const { data: s, isLoading } = useStory(storyId);
  if (isLoading) return <HeroSkeleton />;
  if (!s) return null;
  const author = s.contributors[0]?.author;
  return (
    <HeroBlock
      image={s.coverImage}
      imageSeed={s.id}
      aspect="3/4"
      genres={s.genreTags.map(g => GENRE_LABELS[g])}
      title={s.title}
      byline={
        author && (
          <Link href={`/authors/${author.id}`} className="text-xs text-white/80 hover:underline block">
            by {author.displayName}
          </Link>
        )
      }
      synopsis={s.synopsis}
      meta={
        <div className="flex flex-wrap gap-3 text-xs text-white/75 pt-0.5">
          <span>📖 {s.pageCount} pages</span>
        </div>
      }
      reactions={{
        targetId:    s.id,
        targetType:  'story',
        loveCount:   s.loveCount,
        followCount: s.followCount,
        viewCount:   s.viewCount,
      }}
    />
  );
}

function AuthorHero({ authorId }: { authorId: string | null }) {
  const { data: a, isLoading } = useAuthor(authorId);
  if (isLoading) return <HeroSkeleton />;
  if (!a) return null;
  return (
    <HeroBlock
      image={a.avatarImage}
      imageSeed={a.id}
      aspect="1/1"
      title={a.displayName}
      synopsis={a.bio}
      meta={
        <div className="flex gap-5 text-sm text-white/85 pt-0.5">
          <span><strong className="text-white">{a.followCount.toLocaleString()}</strong> followers</span>
          <span><strong className="text-white">{a.loveCount.toLocaleString()}</strong> loves</span>
        </div>
      }
      reactions={{
        targetId:    a.id,
        targetType:  'author',
        loveCount:   a.loveCount,
        followCount: a.followCount,
      }}
    />
  );
}

function HeroSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="w-full aspect-[3/4] rounded-card" />
      <Skeleton className="w-2/3 h-5" />
    </div>
  );
}
