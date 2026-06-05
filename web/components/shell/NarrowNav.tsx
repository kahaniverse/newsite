'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Session } from 'next-auth';
import { usePathname, useRouter } from 'next/navigation';
import { usePanelStore } from '@/store';
import { CreateSheet } from '@/components/shell/CreateSheet';
import { AvatarImage } from '@/components/ui/AvatarImage';

interface Props {
  session:   Session | null;
  title?:    string;
  subtitle?: string;
}

// One root path = top header shows the logo, bottom nav shows the
// default Home / Post / People. Anything else is "stacked" and gets
// a back button in the header (with a centred title, like the old app bar).
const ROOT_PATHS = new Set(['/', '/discover', '/authors', '/profile']);

export function NarrowNav({ session, title, subtitle }: Props) {
  const pathname = usePathname() ?? '/';
  const router   = useRouter();
  const { selectedUniverseId, selectedStoryId } = usePanelStore();
  const [sheetOpen, setSheetOpen]   = useState(false);

  const isRoot = ROOT_PATHS.has(pathname);

  // Context-aware create options keyed to the CURRENT screen (like the old
  // app), so you can't add a story without a universe in context or a page
  // without a story in context.
  const onUniverse    = pathname.startsWith('/universes/') && pathname !== '/universes/new';
  const onStoryOrPage = pathname.startsWith('/stories/')  || pathname.startsWith('/pages/');

  return (
    <>
      <TopHeader
        isRoot={isRoot}
        session={session}
        title={title}
        subtitle={subtitle}
        onBack={() => router.back()}
      />
      <BottomNav onCreate={() => setSheetOpen(true)} />
      <CreateSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        universeId={onUniverse ? selectedUniverseId : null}
        storyId={onStoryOrPage ? selectedStoryId : null}
      />
    </>
  );
}

// ── Header — translucent black bar, centred title/subtitle, mauve back ───
function TopHeader({ isRoot, session, title, subtitle, onBack }: {
  isRoot:    boolean;
  session:   Session | null;
  title?:    string;
  subtitle?: string;
  onBack:    () => void;
}) {
  return (
    <header className="fixed top-0 inset-x-0 flex items-center justify-between px-3 h-14 border-b border-border nav-translucent z-50">
      {/* Left: logo (root) or back arrow */}
      {isRoot ? (
        <Link href="/" className="flex items-center gap-2 z-10" aria-label="Kahaniverse home">
          <Image src="/images/logo.png" alt="" width={28} height={28} className="rounded" />
          {!title && <span className="font-serif font-semibold text-text-primary text-sm">Kahaniverse</span>}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex items-center gap-1 text-accent hover:brightness-110 transition z-10"
        >
          <span className="text-2xl leading-none" aria-hidden>‹</span>
          <span className="text-sm font-medium">Back</span>
        </button>
      )}

      {/* Centre: title + subtitle (absolutely centred, like the old app bar) */}
      {title && (
        <div className="absolute inset-x-0 flex flex-col items-center justify-center pointer-events-none px-16">
          <span className="text-sm font-bold text-text-primary truncate max-w-full">{title}</span>
          {subtitle && <span className="text-[11px] text-text-muted truncate max-w-full">{subtitle}</span>}
        </div>
      )}

      {/* Right: discover + avatar (opens drawer) / sign-in */}
      <div className="flex items-center gap-3 z-10">
        <Link href="/discover" className="text-lg text-text-muted hover:text-accent transition-colors" aria-label="Discover">🔍</Link>
        {session
          ? (
            <Link
              href="/profile"
              aria-label="Profile"
              className="rounded-full ring-1 ring-transparent hover:ring-border transition"
            >
              <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? 'Account'} size={28} />
            </Link>
          )
          : <Link href="/login"   className="text-xs text-white font-medium bg-brand px-3 py-1.5 rounded-full hover:brightness-110 transition" >Sign in</Link>
        }
      </div>
    </header>
  );
}

// ── Bottom nav — Home / Post (centre logo) / People, like the old app ────
function BottomNav({ onCreate }: { onCreate: () => void }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around py-2.5 nav-translucent border-t border-border z-40"
      aria-label="Bottom navigation"
    >
      <Link href="/" className="flex flex-col items-center gap-0.5 text-text-muted hover:text-accent transition-colors" aria-label="Home">
        <span className="text-xl" aria-hidden>🏠</span>
        <span className="text-[10px]">Home</span>
      </Link>

      {/* Centre: the app logo as the "Post" button → opens the create sheet. */}
      <button type="button" onClick={onCreate} className="flex flex-col items-center gap-1" aria-label="Post" aria-haspopup="dialog">
        <span className="w-12 h-12 -mt-5 rounded-full shadow-lg ring-2 ring-brand overflow-hidden flex items-center justify-center" aria-hidden>
          <Image src="/images/logo.png" alt="" width={48} height={48} className="w-full h-full object-cover" />
        </span>
        <span className="text-[10px] text-brand font-semibold">Post</span>
      </button>

      <Link href="/authors" className="flex flex-col items-center gap-0.5 text-text-muted hover:text-accent transition-colors" aria-label="People">
        <span className="text-xl" aria-hidden>👥</span>
        <span className="text-[10px]">People</span>
      </Link>
    </nav>
  );
}
