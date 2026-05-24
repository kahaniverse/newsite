import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-6 text-center px-6">
      <span className="text-6xl font-serif text-text-muted">404</span>
      <h1 className="font-serif text-2xl font-bold text-text-primary">Page not found</h1>
      <p className="text-text-muted text-sm max-w-xs">
        This story doesn't exist — yet. Perhaps you could write it.
      </p>
      <Link
        href="/"
        className="bg-accent hover:bg-accent-light text-white font-semibold py-2.5 px-6 rounded-btn text-sm transition-colors"
      >
        Browse the Universe
      </Link>
    </div>
  );
}
