'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: '#0f0f0f', color: '#f0f0f0', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ maxWidth: 480, margin: '10vh auto', padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, marginBottom: 12 }}>Something broke.</h1>
          <p style={{ color: '#888', marginBottom: 24 }}>
            {error.digest ? `Error ${error.digest}` : 'The page failed to load.'}
          </p>
          <button
            onClick={reset}
            style={{
              background: '#6A0DAD', color: '#fff', border: 0,
              padding: '10px 18px', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
