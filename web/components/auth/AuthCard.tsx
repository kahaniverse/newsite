'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface Props {
  universeCount: number;
  initialTab?: 'login' | 'signup';
}

export function AuthCard({ universeCount, initialTab = 'login' }: Props) {
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);

  return (
    <section className="auth-section" aria-label="Sign in or create account">
      <div className="auth-card">
        <div className="auth-tabs" role="tablist">
          <button
            id="tabLogin"
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            aria-controls="panelLogin"
            onClick={() => setTab('login')}
            className={`auth-tab${tab === 'login' ? ' active' : ''}`}
          >
            Sign In
          </button>
          <button
            id="tabSignup"
            type="button"
            role="tab"
            aria-selected={tab === 'signup'}
            aria-controls="panelSignup"
            onClick={() => setTab('signup')}
            className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
          >
            Join Free
          </button>
        </div>

        <div
          id="panelLogin"
          role="tabpanel"
          aria-labelledby="tabLogin"
          className={tab === 'login' ? '' : 'hidden'}
        >
          <LoginForm />
          <p className="auth-footer-text">
            <Link href="/forgot-password">Forgot password?</Link>
          </p>
        </div>

        <div
          id="panelSignup"
          role="tabpanel"
          aria-labelledby="tabSignup"
          className={tab === 'signup' ? '' : 'hidden'}
        >
          <RegisterForm />
          <p className="auth-footer-text">
            By joining you agree to our <Link href="/terms">Terms</Link> &amp;{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>

        <div className="universe-badge">
          <div className="badge-item">
            <span className="badge-number">{universeCount}</span>
            <span className="badge-label">Universes</span>
          </div>
          <div className="badge-item">
            <span className="badge-number">Free</span>
            <span className="badge-label">Beta Access</span>
          </div>
          <div className="badge-item">
            <span className="badge-number">∞</span>
            <span className="badge-label">Stories</span>
          </div>
        </div>
      </div>
    </section>
  );
}
