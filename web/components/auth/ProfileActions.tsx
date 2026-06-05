'use client';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

// Account actions that used to live in the old app's profile drawer. Kept on
// the profile screen itself until there are enough actions to warrant a drawer.
export function ProfileActions() {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <Link
        href="/forgot-password"
        className="inline-flex items-center justify-center h-11 px-5 rounded-full border border-border text-text-primary font-medium text-sm hover:border-accent hover:text-accent transition-colors"
      >
        Change Password
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="inline-flex items-center justify-center h-11 px-5 rounded-full border border-border text-error font-medium text-sm hover:border-error hover:brightness-110 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
