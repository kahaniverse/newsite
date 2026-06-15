'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { usePanelStore } from '@/store';
import { FabIcon } from '@/components/shell/Fab';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { useStoryPages } from '@/hooks/useStoryPages';
import { buildPageNav } from '@/lib/page-nav';
import type { Page } from '@/lib/types';

interface Props { session: Session | null }

// The far-left navigation strip for the horizontal (tablet + desktop) layout.
// Holds primary nav, context-aware create actions, context FAB actions, and a
// profile link — everything the old app put in its tab bar + FAB + drawer.
// Unlike the narrow shell, every create action lives inline in the strip; there
// is no bottom-sheet trigger here.
export function NavRail({ session }: Props) {
  const pathname = usePathname() ?? '/';
  const router   = useRouter();
  const { selectedUniverseId, selectedStoryId, detailMeta, clearFocus, startCompose, focused } = usePanelStore();

  // The story's page tree drives page numbering + which add-page actions apply.
  const { data: pagesData } = useStoryPages(selectedStoryId);
  const pages = pagesData?.data ?? [];

  // Universe / story creation. New Story is gated on `focused`, not just
  // `selectedUniverseId`: the home carousel passively seeds a universe selection
  // (so panel 2 lists its stories) without focusing it. That seed is not a
  // deliberate choice, so New Story stays hidden until the user actually drills
  // into a universe (or a story under one), which sets `focused`. The universe
  // form still opens as a modal; the story form opens inline in the third panel.
  const createActions = buildCreateActions(focused ? selectedUniverseId : null, router, startCompose);

  // Page creation, numbered and context-aware (see buildPageActions): a generic
  // "Add page N" that appends after the last page, plus — when a page is
  // selected — "add after this page" / "add alternate" relative to it.
  const pageActions = buildPageActions(selectedStoryId, detailMeta, pages, startCompose);

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

      {/* Page-create actions as additional strip icons, each tooltip naming the
          page number it will add. */}
      {pageActions.map(a => (
        <button
          key={a.key}
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

// Universe / story creation. New Universe still routes to its modal; New Story
// opens the inline compose form in the third panel and only appears once a
// universe is the active (focused) selection.
function buildCreateActions(
  universeId:   string | null,
  router:       ReturnType<typeof useRouter>,
  startCompose: ReturnType<typeof usePanelStore.getState>['startCompose'],
): CreateAction[] {
  return [
    { label: 'New Universe', icon: '🌌', run: () => router.push('/universes/new') },
    ...(universeId
      ? [{ label: 'New Story', icon: '📖', run: () => startCompose({ kind: 'story', universeId }) }]
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

type PageAction = { key: string; label: string; icon: 'next' | 'alternate' | 'plus'; run: () => void };

// Numbered, context-aware page-create actions:
//  • "Add page N" — appends after the story's last main-line page. Hidden when
//    the selected page IS that last page, since its own "add after this page"
//    already appends to the end (the two would be identical).
//  • When a page is selected: "Add page M+1 after page M" (continue) and
//    "Add alternate to page M" (branch a sibling), each respecting the page's
//    disallowNext / disallowAlternate flags.
function buildPageActions(
  storyId:      string | null,
  detailMeta:   ReturnType<typeof usePanelStore.getState>['detailMeta'],
  pages:        Page[],
  startCompose: ReturnType<typeof usePanelStore.getState>['startCompose'],
): PageAction[] {
  if (!storyId) return [];
  const nav = buildPageNav(pages);
  const actions: PageAction[] = [];

  const selPageId = detailMeta?.kind === 'page' ? detailMeta.pageId ?? null : null;
  const selPage   = selPageId ? pages.find(p => p.id === selPageId) ?? null : null;
  const selNum    = selPage ? nav.numberOf(selPage.id) : 0;

  // Generic append — redundant when the selected page is already the last page.
  if (!(selPage && nav.isLast(selPage.id))) {
    const parentId = nav.lastPageId ?? storyId; // empty story → sentinel creates the root
    actions.push({
      key:   'append',
      label: `Add page ${nav.lastNumber + 1}`,
      icon:  'plus',
      run:   () => startCompose({ kind: 'page', storyId, parentId, intent: 'next' }),
    });
  }

  if (selPage) {
    if (!selPage.disallowNext) {
      actions.push({
        key:   'next',
        label: `Add page ${selNum + 1} after page ${selNum}`,
        icon:  'next',
        run:   () => startCompose({ kind: 'page', storyId, parentId: selPage.id, intent: 'next' }),
      });
    }
    if (!selPage.disallowAlternate) {
      actions.push({
        key:   'alternate',
        label: `Add alternate to page ${selNum}`,
        icon:  'alternate',
        run:   () => startCompose({ kind: 'page', storyId, parentId: selPage.parentId ?? storyId, intent: 'alter' }),
      });
    }
  }

  return actions;
}
