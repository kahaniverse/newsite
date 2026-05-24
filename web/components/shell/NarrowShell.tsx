import Link from 'next/link';
import Image from 'next/image';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/config';
import { ToastContainer } from '@/components/ui/Toast';

interface Props {
  children: React.ReactNode;
  session?: Session | null;
}

export async function NarrowShell({ children, session: sessionProp }: Props) {
  const session = sessionProp === undefined ? await auth() : sessionProp;

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-primary z-50 shrink-0">
        <Link href="/" className="flex items-center gap-2" aria-label="Kahaniverse home">
          <Image src="/images/logo.png" alt="" width={28} height={28} className="rounded" />
          <span className="font-serif font-semibold text-text-primary text-sm">Kahaniverse</span>
        </Link>
        {session
          ? <Link href="/profile" className="text-text-muted text-sm" aria-label="Profile">🧑</Link>
          : <Link href="/login"   className="text-xs text-accent font-medium border border-accent px-3 py-1.5 rounded-btn hover:bg-accent hover:text-white transition-colors">Sign in</Link>
        }
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex items-center justify-around py-3 bg-bg-card border-t border-border z-50"
        aria-label="Bottom navigation"
      >
        <Link href="/"         className="flex flex-col items-center gap-1 text-text-muted hover:text-accent transition-colors" aria-label="Home">
          <span className="text-xl" aria-hidden>🏠</span>
          <span className="text-[10px]">Home</span>
        </Link>
        <Link href="/discover" className="flex flex-col items-center gap-1 text-text-muted hover:text-accent transition-colors" aria-label="Discover">
          <span className="text-xl" aria-hidden>🔍</span>
          <span className="text-[10px]">Discover</span>
        </Link>
        <Link href="/universes/new" className="flex flex-col items-center gap-1" aria-label="Create">
          <span className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white text-2xl shadow-lg -mt-5" aria-hidden>+</span>
          <span className="text-[10px] text-accent font-semibold">Create</span>
        </Link>
        <Link href="/authors"  className="flex flex-col items-center gap-1 text-text-muted hover:text-accent transition-colors" aria-label="People">
          <span className="text-xl" aria-hidden>👥</span>
          <span className="text-[10px]">People</span>
        </Link>
        <Link href={session ? '/profile' : '/login'} className="flex flex-col items-center gap-1 text-text-muted hover:text-accent transition-colors" aria-label="Profile">
          <span className="text-xl" aria-hidden>🧑</span>
          <span className="text-[10px]">{session ? 'Profile' : 'Sign in'}</span>
        </Link>
      </nav>

      <ToastContainer />
    </div>
  );
}
