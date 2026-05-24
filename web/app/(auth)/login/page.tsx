import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Sign In — Kahaniverse' };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold text-text-primary">Welcome back</h1>
        <p className="text-sm text-text-muted mt-1">Enter the universe.</p>
      </div>
      <div className="bg-bg-card border border-border rounded-card p-6">
        <LoginForm />
      </div>
      <p className="text-center text-sm text-text-muted">
        New here?{' '}
        <Link href="/register" className="text-accent hover:underline font-medium">Join free</Link>
      </p>
    </div>
  );
}
