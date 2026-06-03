import Link from 'next/link';
import Image from 'next/image';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/config';
import { NavUserMenu } from '@/components/auth/NavUserMenu';
import { ToastContainer } from '@/components/ui/Toast';
import { CreateLink } from '@/components/shell/CreateLink';

interface Props {
  children: [React.ReactNode, React.ReactNode, React.ReactNode];
  session?: Session | null;
}

export async function WideShell({ children, session: sessionProp }: Props) {
  const session = sessionProp === undefined ? await auth() : sessionProp;
  const [left, centre, right] = children;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-primary">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0 bg-bg-primary z-50" aria-label="Main navigation">
        <Link href="/" className="flex items-center gap-2" aria-label="Kahaniverse home">
          <Image src="/images/logo.png" alt="Kahaniverse logo" width={36} height={36} className="rounded" priority />
          <div>
            <span className="font-serif font-bold text-text-primary">Kahaniverse</span>
            <p className="text-[10px] text-text-muted leading-none">The Universe of Stories</p>
          </div>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/"          className="text-sm text-text-muted hover:text-text-primary transition-colors">Browse</Link>
          <Link href="/discover"  className="text-sm text-text-muted hover:text-text-primary transition-colors">Discover</Link>
          <Link href="/authors"   className="text-sm text-text-muted hover:text-text-primary transition-colors">Authors</Link>
          <CreateLink className="text-sm text-text-muted hover:text-text-primary transition-colors">+ Create</CreateLink>
        </div>

        <div className="flex items-center gap-4">
          <SocialIcons />
          <NavUserMenu session={session} />
        </div>
      </nav>

      {/* Three-column body — left and centre share width 1:1, right is fixed */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex-1 min-w-0 overflow-y-auto border-r border-border p-4">
          {left}
        </aside>
        <main className="flex-1 min-w-0 overflow-y-auto p-4 border-r border-border">
          {centre}
        </main>
        <aside className="w-[320px] shrink-0 overflow-y-auto p-4">
          {right}
        </aside>
      </div>

      <ToastContainer />
    </div>
  );
}

function SocialIcons() {
  return (
    <div className="flex items-center gap-3 text-text-muted text-sm">
      <a href="https://twitter.com/kahaniverse" target="_blank" rel="noopener" aria-label="X / Twitter" className="hover:text-text-primary transition-colors">𝕏</a>
      <a href="https://www.facebook.com/Kahaniverse-107105257808893/" target="_blank" rel="noopener" aria-label="Facebook" className="hover:text-text-primary transition-colors">f</a>
      <a href="https://instagram.com/kahani.universe" target="_blank" rel="noopener" aria-label="Instagram" className="hover:text-text-primary transition-colors">◎</a>
      <a href="http://www.youtube.com/channel/UCA9q9zszGTfy0wLIBJB3TjA" target="_blank" rel="noopener" aria-label="YouTube" className="hover:text-text-primary transition-colors">▶</a>
    </div>
  );
}
