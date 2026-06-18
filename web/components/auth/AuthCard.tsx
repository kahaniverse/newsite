'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { RecoveryAuth } from './RecoveryAuth';

interface Props {
  universeCount: number;
  initialTab?: 'login' | 'signup';
}

export function AuthCard({ universeCount, initialTab = 'login' }: Props) {
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);
  const [loginMode, setLoginMode]   = useState<'password' | 'recovery'>('password');
  const [signupMode, setSignupMode] = useState<'email' | 'anon'>('email');

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
          {loginMode === 'password' ? (
            <>
              <Suspense fallback={null}>
                <LoginForm />
              </Suspense>
              <p className="auth-footer-text">
                <Link href="/forgot-password">Forgot password?</Link>
                {' · '}
                <button type="button" className="auth-link-btn" onClick={() => setLoginMode('recovery')}>
                  Have a recovery code?
                </button>
              </p>
            </>
          ) : (
            <>
              <RecoveryAuth mode="login" />
              <p className="auth-footer-text">
                <button type="button" className="auth-link-btn" onClick={() => setLoginMode('password')}>
                  ← Back to email sign-in
                </button>
              </p>
            </>
          )}
        </div>

        <div
          id="panelSignup"
          role="tabpanel"
          aria-labelledby="tabSignup"
          className={tab === 'signup' ? '' : 'hidden'}
        >
          {signupMode === 'email' ? (
            <>
              <RegisterForm />
              <p className="auth-footer-text">
                <button type="button" className="auth-link-btn" onClick={() => setSignupMode('anon')}>
                  Prefer no email? Create an anonymous account →
                </button>
              </p>
            </>
          ) : (
            <>
              <RecoveryAuth mode="create" />
              <p className="auth-footer-text">
                <button type="button" className="auth-link-btn" onClick={() => setSignupMode('email')}>
                  ← Sign up with email instead
                </button>
              </p>
            </>
          )}
          <p className="auth-footer-text">
            By joining you agree to our <a href="/terms.html">Terms</a> &amp;{' '}
            <a href="/privacy.html">Privacy Policy</a>.
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
