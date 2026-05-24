import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = { title: 'Reset Password — Kahaniverse' };

export default function ResetPasswordPage({
  searchParams,
}: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? '';

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold text-text-primary">Choose a new password</h1>
        <p className="text-sm text-text-muted mt-1">Tokens expire 15 minutes after request.</p>
      </div>
      <div className="bg-bg-card border border-border rounded-card p-6">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-sm text-error">No reset token supplied. Request a new link from the forgot password page.</p>
        )}
      </div>
      <p className="text-center text-sm text-text-muted">
        <Link href="/login" className="text-accent hover:underline font-medium">Back to sign in</Link>
      </p>
    </div>
  );
}
