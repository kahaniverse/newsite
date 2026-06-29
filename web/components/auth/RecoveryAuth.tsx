'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { generatePenName } from '@/lib/penname';
import { TurnstileWidget } from './TurnstileWidget';

/**
 * Email-less, password-less account flow (anonymous signup method B).
 *
 *  • create: mints an account server-side and shows a one-time recovery code the
 *    user MUST save — it's the only way back in. Then signs them in.
 *  • login: signs in by re-entering that recovery code.
 *
 * No identifier (email/phone/name) is ever collected — the most anonymous path
 * we offer.
 */
export function RecoveryAuth({ mode }: { mode: 'create' | 'login' }) {
  return mode === 'create' ? <CreateFlow /> : <LoginFlow />;
}

function CreateFlow() {
  const router      = useRouter();
  const params      = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/';
  const [penName, setPenName]   = useState(generatePenName);
  const [code, setCode]         = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);
  const [copied, setCopied]     = useState(false);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function create() {
    setErr('');
    if (turnstileRequired && !captchaToken) { setErr('Please complete the CAPTCHA.'); return; }
    setBusy(true);
    const res = await fetch('/api/auth/register-anon', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ displayName: penName, captchaToken: captchaToken ?? '' }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(json.error ?? 'Could not create account. Try again.'); return; }
    setCode(json.recoveryCode as string);
  }

  async function finish() {
    if (!code) return;
    setBusy(true);
    const res = await signIn('recovery', { code, redirect: false });
    setBusy(false);
    if (res?.error) { setErr('Signed up, but auto sign-in failed. Use your recovery code to sign in.'); return; }
    router.push(callbackUrl);
    router.refresh();
  }

  // Step 2: show the one-time code.
  if (code) {
    return (
      <div className="auth-form" aria-live="polite">
        <p className="field-label">Your recovery code</p>
        <div className="field-input" style={{ fontFamily: 'monospace', letterSpacing: '0.05em', userSelect: 'all' }}>
          {code}
        </div>
        <p className="auth-footer-text" style={{ marginTop: '0.5rem' }}>
          This is the <strong>only</strong> way back into your account. We can&apos;t recover it for you —
          save it somewhere safe now.
        </p>
        <button
          type="button"
          className="social-btn"
          onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); }}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          {copied ? 'Copied ✓' : 'Copy code'}
        </button>
        <label className="auth-footer-text" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.75rem' }}>
          <input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />
          <span>I&apos;ve saved my recovery code.</span>
        </label>
        {err && <p className="auth-error" role="alert">{err}</p>}
        <button type="button" disabled={!saved || busy} className="auth-cta" onClick={finish}>
          {busy ? 'Entering…' : 'Enter the Universe →'}
        </button>
      </div>
    );
  }

  // Step 1: pick a pen name, create the account.
  return (
    <div className="auth-form">
      <div className="field-group">
        <label className="field-label" htmlFor="anonName">Pen Name</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="field-input"
            id="anonName" type="text" value={penName}
            onChange={e => setPenName(e.target.value)}
            maxLength={64} placeholder="Your author name"
          />
          <button
            type="button" className="social-btn" aria-label="Suggest another pen name"
            onClick={() => setPenName(generatePenName())} title="Shuffle"
          >🎲</button>
        </div>
      </div>
      <p className="auth-footer-text">
        No email, no password — just a recovery code you keep. The most private way to join.
      </p>
      {turnstileRequired && (
        <TurnstileWidget onToken={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
      )}
      {err && <p className="auth-error" role="alert">{err}</p>}
      <button type="button" disabled={busy} className="auth-cta" onClick={create}>
        {busy ? 'Creating…' : 'Create anonymous account →'}
      </button>
    </div>
  );
}

function LoginFlow() {
  const router      = useRouter();
  const params      = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/';
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  async function submit() {
    setErr('');
    if (code.trim().length < 8) { setErr('Enter your recovery code.'); return; }
    setBusy(true);
    const res = await signIn('recovery', { code: code.trim(), redirect: false });
    setBusy(false);
    if (res?.error) { setErr('That recovery code didn’t match an account.'); return; }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="auth-form">
      <div className="field-group">
        <label className="field-label" htmlFor="recoveryCode">Recovery code</label>
        <input
          className="field-input"
          id="recoveryCode" type="text" autoComplete="off"
          value={code} onChange={e => setCode(e.target.value)}
          placeholder="KV-XXXX-XXXX-XXXX-XXXX"
          style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
        />
      </div>
      {err && <p className="auth-error" role="alert">{err}</p>}
      <button type="button" disabled={busy} className="auth-cta" onClick={submit}>
        {busy ? 'Signing in…' : 'Sign in with code →'}
      </button>
    </div>
  );
}
