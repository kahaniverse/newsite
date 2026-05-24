import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = { title: 'Join Free — Kahaniverse' };

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold text-text-primary">Begin your story</h1>
        <p className="text-sm text-text-muted mt-1">Free forever during beta.</p>
      </div>
      <div className="bg-bg-card border border-border rounded-card p-6">
        <RegisterForm />
      </div>
      <p className="text-center text-sm text-text-muted">
        Already a member?{' '}
        <Link href="/login" className="text-accent hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  );
}
