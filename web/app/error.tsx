'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="max-w-md mx-auto mt-24 px-6 text-center">
      <h1 className="font-serif text-2xl text-text-primary mb-2">Something broke.</h1>
      <p className="text-sm text-text-muted mb-6">
        {error.digest ? `Error ${error.digest}` : 'The page failed to load.'}
      </p>
      <button
        onClick={reset}
        className="bg-accent hover:bg-accent-light text-white font-semibold py-2.5 px-5 rounded-btn text-sm transition-colors"
      >
        Try again
      </button>
    </main>
  );
}
