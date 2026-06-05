'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { usePanelStore } from '@/store';
import { FabIcon } from '@/components/shell/Fab';
import { AvatarImage } from '@/components/ui/AvatarImage';

interface Props { session: Session | null }

// The far-left navigation strip for the horizontal (tablet + desktop) layout.
// Holds primary nav, context-aware create actions, context FAB actions, and a
// profile link — everything the old app put in its tab bar + FAB + drawer.
// Unlike the narrow shell, every create action lives inline in the strip; there
// is no bottom-sheet trigger here.
export function NavRail({ session }: Props) {
  const pathname = usePathname() ?? '/';
  const router   = useRouter();
  const { selectedUniverseId, selectedStoryId, detailMeta } = usePanelStore();

  // Context-aware create options keyed to the current selection (like the old
  // app's bottom sheet, now surfaced directly as strip buttons).
  const onStoryOrPage = pathname.startsWith('/stories/') || pathname.startsWith('/pages/')
                        || !!selectedStoryId;
  const createActions = buildCreateActions(selectedUniverseId, onStoryOrPage ? selectedStoryId : null);

  // Context FAB actions surfaced as extra icons in the strip — driven by what
  // the leaf panel is currently showing (a page → Add Next / Alternate).
  const fabActions = buildFabActions(detailMeta);

  return (
    <nav
      className="relative w-16 shrink-0 h-screen flex flex-col items-center py-3 gap-1 border-r border-border nav-translucent z-50"
      aria-label="Main navigation"
    >
      <Link href="/" aria-label="Kahaniverse home" className="mb-1">
        <Image src="/images/logo.png" alt="" width={32} height={32} className="rounded" priority />
      </Link>

      <RailLink href="/"         label="Home"     active={pathname === '/'}                glyph="🏠" />
      <RailLink href="/discover" label="Discover" active={pathname.startsWith('/discover')} glyph="🔍" />
      <RailLink href="/authors"  label="Authors"  active={pathname.startsWith('/authors')}  glyph="👥" />

      <div className="w-7 h-px bg-border my-1.5" aria-hidden />

      {/* Create actions inline — the old bottom-sheet items, context-aware.
          Rendered as plain strip icons, matching the nav links above. */}
      {createActions.map(a => (
        <button
          key={a.href}
          type="button"
          onClick={() => router.push(a.href)}
          aria-label={a.label}
          title={a.label}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg text-text-muted hover:text-accent hover:bg-bg-elevated/60 active:scale-95 transition-colors"
        >
          <span className="leading-none" aria-hidden>{a.icon}</span>
        </button>
      ))}

      {/* Context FAB actions as additional strip icons. */}
      {fabActions.map(a => (
        <button
          key={a.href}
          type="button"
          onClick={() => router.push(a.href)}
          aria-label={a.label}
          title={a.label}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:text-accent hover:bg-bg-elevated/60 active:scale-95 transition-colors"
        >
          <FabIcon name={a.icon} />
        </button>
      ))}

      {/* Profile / sign-in pinned to the bottom. */}
      <div className="mt-auto">
        {session ? (
          <Link
            href="/profile"
            aria-label="Profile"
            aria-current={pathname.startsWith('/profile') ? 'page' : undefined}
            title="Profile"
            className={`block rounded-full ring-2 transition ${pathname.startsWith('/profile') ? 'ring-accent' : 'ring-transparent hover:ring-border'}`}
          >
            <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? 'Account'} size={36} />
          </Link>
        ) : (
          <Link href="/login" aria-label="Sign in" className="text-text-muted hover:text-accent text-xl" title="Sign in">🔐</Link>
        )}
      </div>
    </nav>
  );
}

// The old create bottom-sheet's items, context-keyed to the current selection,
// now rendered inline in the strip.
function buildCreateActions(universeId: string | null, storyId: string | null) {
  return [
    { label: 'New Universe', icon: '🌌', href: '/universes/new' },
    ...(universeId ? [{ label: 'New Story', icon: '📖', href: `/stories/new?universeId=${universeId}` }] : []),
    ...(storyId    ? [{ label: 'New Page',  icon: '📝', href: `/pages/new?storyId=${storyId}&parentId=${storyId}&intent=next` }] : []),
  ];
}

function RailLink({ href, label, active, glyph }: { href: string; label: string; active: boolean; glyph: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      title={label}
      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors ${
        active ? 'bg-bg-elevated text-accent' : 'text-text-muted hover:text-accent hover:bg-bg-elevated/60'
      }`}
    >
      <span aria-hidden>{glyph}</span>
    </Link>
  );
}

function buildFabActions(detailMeta: ReturnType<typeof usePanelStore.getState>['detailMeta']) {
  if (!detailMeta) return [];
  if (detailMeta.kind === 'page' && detailMeta.pageId && detailMeta.storyId) {
    const altParent = detailMeta.parentId ?? detailMeta.storyId;
    return [
      { label: 'Add next page', icon: 'next' as const,      href: `/pages/new?storyId=${detailMeta.storyId}&parentId=${detailMeta.pageId}&intent=next` },
      { label: 'Alternate page', icon: 'alternate' as const, href: `/pages/new?storyId=${detailMeta.storyId}&parentId=${altParent}&intent=alter` },
    ];
  }
  if (detailMeta.kind === 'story' && detailMeta.storyId) {
    return [
      { label: 'Add a page', icon: 'edit' as const, href: `/pages/new?storyId=${detailMeta.storyId}&parentId=${detailMeta.storyId}&intent=next` },
    ];
  }
  return [];
}
