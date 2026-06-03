import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastContainer } from '@/components/ui/Toast';
import Link from 'next/link';
import '@/styles/auth.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="auth-shell">
        <nav aria-label="Main navigation">
          <Link href="/" className="nav-logo" aria-label="Kahaniverse home">
            <img src="/images/logo.png" alt="Kahaniverse logo" className="nav-logo-img" width={42} height={42} />
            <span className="nav-logo-text">Kahaniverse</span>
            <p className="book-tagline">The Universe of Stories</p>
          </Link>
        </nav>

        <main className="auth-main">{children}</main>

        <footer>
          <ul className="footer-links">
            <li><Link href="/terms">Terms</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><a href="mailto:help@kahaniverse.com">Help</a></li>
          </ul>
          <p className="footer-copy">© 2025 Kahaniverse. All rights reserved.</p>
        </footer>
      </div>

      <ToastContainer />
    </QueryProvider>
  );
}
