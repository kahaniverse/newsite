import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@/lib/auth/config';

export const metadata: Metadata = { title: 'Coming Soon — Kahaniverse' };

export const dynamic = 'force-dynamic';

interface Props { params: { universe: string; issue: string; page: string } }

export default async function ComicsPage({ params }: Props) {
  const session = await auth();
  if (!session) {
    redirect(`/login?callbackUrl=/comics/${params.universe}/${params.issue}/${params.page}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-bg-primary px-6 py-16 text-center">
      <h1 className="text-5xl sm:text-6xl font-extrabold text-brand">Coming Soon!</h1>

      <Image
        src="/images/cover.png"
        alt="Kahaniverse Comics — coming soon"
        width={848}
        height={1264}
        priority
        className="w-full max-w-xs sm:max-w-sm rounded-card shadow-2xl"
      />

      <p className="text-text-muted max-w-md">
        The comics section is on its way. Check back soon for new chapters.
      </p>

      <Link href="/" className="btn-pill btn-pill-primary">
        Go to Kahaniverse Home Page and Create Your Own Stories
      </Link>
    </main>
  );
}
