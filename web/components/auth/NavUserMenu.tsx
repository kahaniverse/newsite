'use client';
import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { useReactionStore } from '@/store';
import type { Session } from 'next-auth';

interface Props { session: Session | null }

export function NavUserMenu({ session }: Props) {
  const [open, setOpen] = useState(false);
  const resetReactions = useReactionStore(s => s.resetReactions);

  if (!session) {
    return (
      <Link
        href="/login"
        className="text-sm border border-accent text-accent px-4 py-1.5 rounded-btn hover:bg-accent hover:text-white transition-colors font-medium"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full"
        aria-label="User menu"
        aria-expanded={open}
      >
        <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? 'User'} size={32} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-10 z-50 w-48 bg-bg-elevated border border-border rounded-card shadow-xl py-1">
            <p className="px-4 py-2 text-xs text-text-muted border-b border-border truncate">{session.user.name}</p>
            <Link href="/profile"       className="block px-4 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors" onClick={() => setOpen(false)}>Profile</Link>
            <Link href="/profile/edit"  className="block px-4 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors" onClick={() => setOpen(false)}>Edit Profile</Link>
            <Link href="/universes/new" className="block px-4 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors" onClick={() => setOpen(false)}>New Universe</Link>
            <hr className="border-border my-1" />
            <button
              onClick={() => { resetReactions(); signOut({ callbackUrl: '/' }); }}
              className="w-full text-left px-4 py-2 text-sm text-error hover:bg-bg-card transition-colors"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
