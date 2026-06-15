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
  const { selectedUniverseId, selectedStoryId, detailMeta, clearFocus, startCompose } = usePanelStore();

  // Context-aware create options keyed to the current selection: New Story only
  // when a universe is selected, New Page only when a story is. The universe
  // form still opens as a modal; story/page forms open inline in the third
  // panel via the compose flow.
  const onStoryOrPage = pathname.startsWith('/stories/') || pathname.startsWith('/pages/')
                        || !!selectedStoryId;
  const createActions = buildCreateActions(
    selectedUniverseId,
    onStoryOrPage ? selectedStoryId : null,
    router,
    startCompose,
  );

  // Context FAB actions surfaced as extra icons in the strip — driven by what
  // the leaf panel is currently showing (a page → Add Next / Alternate). These
  // also open inline in the third panel.
  const fabActions = buildFabActions(detailMeta, startCompose);

  return (
    <nav
      className="relative w-16 shrink-0 h-screen flex flex-col items-center py-3 gap-1 border-r border-border nav-translucent z-50"
      aria-label="Main navigation"
    >
      <Link href="/" aria-label="Kahaniverse home" className="mb-1">
        <Image src="/images/logo.png" alt="" width={32} height={32} className="rounded" priority />
      </Link>

      {/* Home also resets the horizontal cascade to browse mode. On the home
          route the URL is already "/" when drilled into a universe, so a plain
          Link is a no-op navigation and the focused hero would otherwise stick. */}
      <RailLink href="/" label="Home" active={pathname === '/'} glyph="🏠" onClick={clearFocus} />

      <div className="w-7 h-px bg-border my-1.5" aria-hidden />

      {/* Create actions inline — the old bottom-sheet items, context-aware.
          Rendered as plain strip icons, matching the nav links above. */}
      {createActions.map(a => (
        <button
          key={a.label}
          type="button"
          onClick={a.run}
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
          key={a.label}
          type="button"
          onClick={a.run}
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

type CreateAction = { label: string; icon: string; run: () => void };

// The old create bottom-sheet's items, context-keyed to the current selection,
// now rendered inline in the strip. New Universe still routes to its modal;
// New Story / New Page open the inline compose form in the third panel and only
// appear once their parent (universe / story) is selected.
function buildCreateActions(
  universeId:   string | null,
  storyId:      string | null,
  router:       ReturnType<typeof useRouter>,
  startCompose: ReturnType<typeof usePanelStore.getState>['startCompose'],
): CreateAction[] {
  return [
    { label: 'New Universe', icon: '🌌', run: () => router.push('/universes/new') },
    ...(universeId
      ? [{ label: 'New Story', icon: '📖', run: () => startCompose({ kind: 'story', universeId }) }]
      : []),
    ...(storyId
      ? [{ label: 'New Page', icon: '📝', run: () => startCompose({ kind: 'page', storyId, parentId: storyId, intent: 'next' as const }) }]
      : []),
  ];
}

function RailLink({ href, label, active, glyph, onClick }: { href: string; label: string; active: boolean; glyph: string; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
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

type FabAction = { label: string; icon: 'next' | 'alternate' | 'edit'; run: () => void };

function buildFabActions(
  detailMeta:   ReturnType<typeof usePanelStore.getState>['detailMeta'],
  startCompose: ReturnType<typeof usePanelStore.getState>['startCompose'],
): FabAction[] {
  if (!detailMeta) return [];
  if (detailMeta.kind === 'page' && detailMeta.pageId && detailMeta.storyId) {
    const { storyId, pageId } = detailMeta;
    const altParent = detailMeta.parentId ?? storyId;
    return [
      { label: 'Add next page',  icon: 'next',      run: () => startCompose({ kind: 'page', storyId, parentId: pageId,    intent: 'next' }) },
      { label: 'Alternate page', icon: 'alternate', run: () => startCompose({ kind: 'page', storyId, parentId: altParent, intent: 'alter' }) },
    ];
  }
  if (detailMeta.kind === 'story' && detailMeta.storyId) {
    const { storyId } = detailMeta;
    return [
      { label: 'Add a page', icon: 'edit', run: () => startCompose({ kind: 'page', storyId, parentId: storyId, intent: 'next' }) },
    ];
  }
  return [];
}
