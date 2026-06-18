'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PERSONA_COOKIE, PERSONA_COOKIE_MAX_AGE, normalizePersona, type Persona,
} from '@/lib/persona';

function readCookiePersona(): Persona {
  if (typeof document === 'undefined') return 'grownup';
  const m = document.cookie.match(/(?:^|;\s*)kv_persona=([^;]+)/);
  return normalizePersona(m ? decodeURIComponent(m[1]) : null);
}

/**
 * Kid / Grown-up reading mode. Writes the persona cookie and refreshes so the
 * server re-renders filtered. This is a content filter, NOT an age check — we
 * never verify age — so the disclaimer travels with the control everywhere it
 * appears. See lib/persona.ts.
 */
export function PersonaToggle({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const router = useRouter();
  // Start null and resolve after mount: the cookie is only readable client-side,
  // so this avoids a hydration mismatch between server and client markup.
  const [persona, setPersona] = useState<Persona | null>(null);
  useEffect(() => setPersona(readCookiePersona()), []);

  function set(next: Persona) {
    document.cookie =
      `${PERSONA_COOKIE}=${next}; path=/; max-age=${PERSONA_COOKIE_MAX_AGE}; samesite=lax`;
    setPersona(next);
    router.refresh();
  }

  if (variant === 'compact') {
    // Single toggle button for the nav rail. Hidden until mounted so it never
    // flashes the wrong state.
    if (persona === null) return <div className="w-10 h-10" aria-hidden />;
    const isKid = persona === 'kid';
    const next: Persona = isKid ? 'grownup' : 'kid';
    return (
      <button
        type="button"
        onClick={() => set(next)}
        aria-label={`Reading mode: ${isKid ? 'Kid' : 'Grown-up'}. Switch to ${isKid ? 'Grown-up' : 'Kid'}. Age is not verified.`}
        title={`Reading mode: ${isKid ? 'Kid' : 'Grown-up'} — tap to switch. We don’t verify age; parental guidance advised.`}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg text-text-muted hover:text-accent hover:bg-bg-elevated/60 active:scale-95 transition-colors"
      >
        <span aria-hidden>{isKid ? '🧒' : '🌙'}</span>
      </button>
    );
  }

  const current = persona ?? 'grownup';
  return (
    <div className="space-y-2">
      <div className="flex gap-2" role="group" aria-label="Reading mode">
        {(['kid', 'grownup'] as const).map(p => {
          const active = current === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => set(p)}
              aria-pressed={active}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-accent text-white border-accent'
                  : 'border-border text-text-muted hover:border-accent hover:text-accent'
              }`}
            >
              <span aria-hidden>{p === 'kid' ? '🧒' : '🌙'}</span>
              {p === 'kid' ? 'Kid' : 'Grown-up'}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-text-muted leading-snug">
        A content filter, not an age check — we don’t verify age by any means.
        Parental guidance is advised.
      </p>
    </div>
  );
}
