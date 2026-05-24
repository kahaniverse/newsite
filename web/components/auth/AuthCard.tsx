'use client';
import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface Props { universeCount: number }

export function AuthCard({ universeCount }: Props) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  return (
    <div className="auth-card bg-bg-card border border-border rounded-card p-6 flex flex-col gap-4 w-full max-w-sm mx-auto">
      {/* Tabs */}
      <div className="auth-tabs flex gap-1 bg-bg-elevated rounded-btn p-1" role="tablist">
        <button
          id="tabLogin"
          role="tab"
          aria-selected={tab === 'login'}
          aria-controls="panelLogin"
          onClick={() => setTab('login')}
          className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
            tab === 'login' ? 'bg-bg-card text-text-primary shadow' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Sign In
        </button>
        <button
          id="tabSignup"
          role="tab"
          aria-selected={tab === 'signup'}
          aria-controls="panelSignup"
          onClick={() => setTab('signup')}
          className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
            tab === 'signup' ? 'bg-bg-card text-text-primary shadow' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Join Free
        </button>
      </div>

      {/* Panels */}
      <div id="panelLogin" role="tabpanel" aria-labelledby="tabLogin" hidden={tab !== 'login'}>
        <LoginForm />
      </div>
      <div id="panelSignup" role="tabpanel" aria-labelledby="tabSignup" hidden={tab !== 'signup'}>
        <RegisterForm />
      </div>

      {/* Badge row */}
      <div className="universe-badge flex justify-between border-t border-border pt-4">
        <div className="badge-item flex flex-col items-center gap-0.5">
          <span className="badge-number font-serif font-bold text-text-primary text-lg">{universeCount}</span>
          <span className="badge-label text-[10px] text-text-muted">Universes</span>
        </div>
        <div className="badge-item flex flex-col items-center gap-0.5">
          <span className="badge-number font-serif font-bold text-text-primary text-lg">Free</span>
          <span className="badge-label text-[10px] text-text-muted">Beta Access</span>
        </div>
        <div className="badge-item flex flex-col items-center gap-0.5">
          <span className="badge-number font-serif font-bold text-text-primary text-lg">∞</span>
          <span className="badge-label text-[10px] text-text-muted">Stories</span>
        </div>
      </div>
    </div>
  );
}
