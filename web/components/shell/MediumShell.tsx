import Link from 'next/link';
import Image from 'next/image';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/config';
import { ToastContainer } from '@/components/ui/Toast';

interface Props {
  children: [React.ReactNode, React.ReactNode];
  session?: Session | null;
}

export async function MediumShell({ children, session: sessionProp }: Props) {
  const session = sessionProp === undefined ? await auth() : sessionProp;
  const [left, right] = children;

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      {/* Icon rail */}
      <nav className="w-14 shrink-0 flex flex-col items-center py-4 gap-5 border-r border-border bg-bg-primary" aria-label="Main navigation">
        <Link href="/" aria-label="Home">
          <Image src="/images/logo.png" alt="" width={28} height={28} className="rounded" />
        </Link>
        <Link href="/"         className="text-text-muted hover:text-text-primary text-lg" aria-label="Browse">🏠</Link>
        <Link href="/discover" className="text-text-muted hover:text-text-primary text-lg" aria-label="Discover">🔍</Link>
        <Link href="/universes/new" className="text-text-muted hover:text-text-primary text-lg" aria-label="Create">✏️</Link>
        <Link href="/authors"  className="text-text-muted hover:text-text-primary text-lg" aria-label="Authors">👥</Link>
        <div className="mt-auto">
          {session
            ? <Link href="/profile" className="text-text-muted hover:text-text-primary text-lg" aria-label="Profile">🧑</Link>
            : <Link href="/login"   className="text-text-muted hover:text-text-primary text-lg" aria-label="Sign in">🔐</Link>
          }
        </div>
      </nav>

      {/* Two panels */}
      <aside className="flex-1 overflow-y-auto border-r border-border p-4">{left}</aside>
      <main  className="flex-1 overflow-y-auto p-4">{right}</main>

      <ToastContainer />
    </div>
  );
}
