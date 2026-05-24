import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastContainer } from '@/components/ui/Toast';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-bg-primary flex flex-col">
        <header className="flex items-center px-6 py-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2" aria-label="Kahaniverse home">
            <img src="/images/logo.png" alt="Kahaniverse logo" width={32} height={32} className="rounded" />
            <span className="font-serif font-bold text-text-primary">Kahaniverse</span>
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          {children}
        </main>
        <footer className="text-center py-4 text-xs text-text-muted border-t border-border">
          © 2025 Kahaniverse
        </footer>
      </div>
      <ToastContainer />
    </QueryProvider>
  );
}
