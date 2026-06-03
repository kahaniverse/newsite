'use client';
import Link from 'next/link';
import Image from 'next/image';
import type { Session } from 'next-auth';
import { usePathname, useRouter } from 'next/navigation';
import { usePanelStore, type DetailMeta } from '@/store';

interface Props { session: Session | null }

// One root path = top header shows the logo, bottom nav shows the
// default Home / Create / People. Anything else is "stacked" and gets
// a back button in the header plus a context-specific central action.
const ROOT_PATHS = new Set(['/', '/discover', '/authors', '/profile']);

export function NarrowNav({ session }: Props) {
  const pathname = usePathname() ?? '/';
  const router   = useRouter();
  const { selectionKind, selectedUniverseId, detailMeta } = usePanelStore();

  const isRoot = ROOT_PATHS.has(pathname);

  return (
    <>
      <TopHeader isRoot={isRoot} session={session} onBack={() => router.back()} />
      <BottomNav
        isRoot={isRoot}
        pathname={pathname}
        detailMeta={detailMeta}
        selectionKind={selectionKind}
        selectedUniverseId={selectedUniverseId}
        userId={session?.user?.id ?? null}
      />
    </>
  );
}

// ── Header ─────────────────────────────────────────────────────────────
function TopHeader({ isRoot, session, onBack }: {
  isRoot:  boolean;
  session: Session | null;
  onBack:  () => void;
}) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-primary z-50 shrink-0">
      {isRoot ? (
        <Link href="/" className="flex items-center gap-2" aria-label="Kahaniverse home">
          <Image src="/images/logo.png" alt="" width={28} height={28} className="rounded" />
          <span className="font-serif font-semibold text-text-primary text-sm">Kahaniverse</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex items-center gap-1 text-text-primary hover:text-accent transition-colors"
        >
          <span className="text-xl leading-none" aria-hidden>←</span>
          <span className="text-sm font-medium">Back</span>
        </button>
      )}

      <div className="flex items-center gap-4">
        <Link href="/discover" className="text-lg text-text-muted hover:text-accent transition-colors" aria-label="Discover">🔍</Link>
        {session
          ? <Link href="/profile" className="text-lg text-text-muted hover:text-accent transition-colors" aria-label="Profile">🧑</Link>
          : <Link href="/login"   className="text-xs text-accent font-medium border border-accent px-3 py-1.5 rounded-btn hover:bg-accent hover:text-white transition-colors">Sign in</Link>
        }
      </div>
    </header>
  );
}

// ── Bottom nav ─────────────────────────────────────────────────────────
interface BottomNavProps {
  isRoot:              boolean;
  pathname:            string;
  detailMeta:          DetailMeta | null;
  selectionKind:       'universe' | 'author' | null;
  selectedUniverseId:  string | null;
  userId:              string | null;
}

function BottomNav({ isRoot, pathname, detailMeta, selectionKind, selectedUniverseId, userId }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around py-3 bg-bg-card border-t border-border z-50"
      aria-label="Bottom navigation"
    >
      <Link href="/" className="flex flex-col items-center gap-1 text-text-muted hover:text-accent transition-colors" aria-label="Home">
        <span className="text-xl" aria-hidden>🏠</span>
        <span className="text-[10px]">Home</span>
      </Link>

      <CenterAction
        isRoot={isRoot}
        pathname={pathname}
        detailMeta={detailMeta}
        selectionKind={selectionKind}
        selectedUniverseId={selectedUniverseId}
        userId={userId}
      />

      <Link href="/authors" className="flex flex-col items-center gap-1 text-text-muted hover:text-accent transition-colors" aria-label="People">
        <span className="text-xl" aria-hidden>👥</span>
        <span className="text-[10px]">People</span>
      </Link>
    </nav>
  );
}

// ── Context-aware central action ───────────────────────────────────────
function CenterAction(props: Omit<BottomNavProps, 'isRoot'> & { isRoot: boolean }) {
  const { isRoot, pathname, detailMeta, selectionKind, selectedUniverseId, userId } = props;

  // Root paths — single "Create" button. Routes to story-form if a universe
  // is selected in the panel store, else universe-form.
  if (isRoot) {
    const href =
      selectionKind === 'universe' && selectedUniverseId
        ? `/stories/new?universeId=${selectedUniverseId}`
        : '/universes/new';
    return <CenterButton href={href} label="Create" plusGlyph />;
  }

  // Page detail — two (or three) branching buttons.
  if (detailMeta?.kind === 'page' && detailMeta.pageId && detailMeta.storyId) {
    const canEdit = userId && detailMeta.authorId && userId === detailMeta.authorId;
    const nextHref = `/pages/new?storyId=${detailMeta.storyId}&parentId=${detailMeta.pageId}&intent=next`;
    const altParent = detailMeta.parentId ?? detailMeta.storyId;
    const altHref  = `/pages/new?storyId=${detailMeta.storyId}&parentId=${altParent}&intent=alter`;
    return (
      <div className="flex items-center gap-2 -mt-5">
        <CenterButton href={nextHref} label="Add Next" small />
        <CenterButton href={altHref}  label="Alter this" small />
        {canEdit && (
          <CenterButton href={`/pages/${detailMeta.pageId}/edit`} label="Edit" small variant="secondary" />
        )}
      </div>
    );
  }

  // Story detail — Extend Story.
  if (detailMeta?.kind === 'story' && detailMeta.storyId) {
    return (
      <CenterButton
        href={`/pages/new?storyId=${detailMeta.storyId}&parentId=${detailMeta.storyId}&intent=next`}
        label="Extend Story"
      />
    );
  }

  // Universe detail or any other stacked path — fall back to the same
  // contextual create logic the root uses, so the user can keep creating.
  const fallback =
    selectionKind === 'universe' && selectedUniverseId
      ? `/stories/new?universeId=${selectedUniverseId}`
      : '/universes/new';
  return <CenterButton href={fallback} label="Create" plusGlyph />;
}

// Central pill: small Kahaniverse logo + a contextual label. When at root,
// renders the + glyph instead per the original design. `small`/`variant`
// shrink the pill when several actions sit side by side.
function CenterButton({
  href,
  label,
  plusGlyph = false,
  small = false,
  variant = 'primary',
}: {
  href:       string;
  label:      string;
  plusGlyph?: boolean;
  small?:     boolean;
  variant?:   'primary' | 'secondary';
}) {
  const bubbleSize = small ? 'w-10 h-10 text-lg' : 'w-12 h-12 text-2xl';
  const offset     = small ? '' : '-mt-5';
  const bubbleBg   = variant === 'secondary'
    ? 'bg-bg-elevated text-accent border border-accent'
    : 'bg-accent text-white shadow-lg';

  const logoPx = small ? 40 : 48;

  return (
    <Link href={href} className="flex flex-col items-center gap-1" aria-label={label}>
      <span
        className={`${bubbleSize} ${offset} rounded-full ${plusGlyph ? bubbleBg : 'shadow-lg'} flex items-center justify-center overflow-hidden`}
        aria-hidden
      >
        {plusGlyph
          ? '+'
          : <Image src="/images/logo.png" alt="" width={logoPx} height={logoPx} className="w-full h-full object-cover" />}
      </span>
      <span className="text-[10px] text-accent font-semibold whitespace-nowrap">{label}</span>
    </Link>
  );
}
