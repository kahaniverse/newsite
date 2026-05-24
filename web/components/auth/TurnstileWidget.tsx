'use client';
import Script from 'next/script';
import { useEffect, useRef } from 'react';

interface Props {
  onToken:  (token: string) => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: {
        sitekey:  string;
        callback: (token: string) => void;
        'expired-callback'?: () => void;
        theme?:    'light' | 'dark' | 'auto';
      }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({ onToken, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef  = useRef<string | null>(null);
  const siteKey      = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    const tryRender = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme:   'dark',
        callback: onToken,
        'expired-callback': onExpire,
      });
    };
    tryRender();
    const interval = window.setInterval(tryRender, 200);
    return () => window.clearInterval(interval);
  }, [siteKey, onToken, onExpire]);

  if (!siteKey) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div ref={containerRef} className="cf-turnstile" />
    </>
  );
}
