import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { getUniverseCount } from '@/lib/db/queries/universes';

export const metadata: Metadata = { title: 'Sign In — Kahaniverse' };

export default async function LoginPage() {
  const universeCount = await getUniverseCount().catch(() => 3);
  return <AuthCard universeCount={universeCount} initialTab="login" />;
}
