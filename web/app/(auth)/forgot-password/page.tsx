'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/forgot-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? 'Something went wrong. Try again.');
      return;
    }
    setSent(true);
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold text-text-primary">Reset password</h1>
        <p className="text-sm text-text-muted mt-1">We'll send you a reset link.</p>
      </div>

      <div className="bg-bg-card border border-border rounded-card p-6">
        {sent ? (
          <div className="text-center py-4 flex flex-col gap-3">
            <span className="text-4xl">📬</span>
            <p className="text-sm text-text-primary font-medium">Check your inbox</p>
            <p className="text-xs text-text-muted">We sent a reset link to <strong>{email}</strong>. It expires in 15 minutes.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted" htmlFor="resetEmail">Email</label>
              <input
                id="resetEmail"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                autoComplete="email"
              />
            </div>
            {error && <p className="text-xs text-error">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-accent hover:bg-accent-light text-white font-semibold py-2.5 rounded-btn text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-text-muted">
        <Link href="/login" className="text-accent hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
