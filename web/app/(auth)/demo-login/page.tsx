import { notFound } from 'next/navigation';
import { DEMO_MODE } from '@/lib/auth/demo';
import { signInDemo } from './actions';

// Demo-only entry that establishes the screencast session. 404s when DEMO_MODE is
// off, so it's inert in any real deployment. Scenarios hit it off-camera in setup().
export const dynamic = 'force-dynamic';

export default function DemoLoginPage() {
  if (!DEMO_MODE) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-primary text-text-primary">
      <form action={signInDemo} className="text-center">
        <h1 className="mb-6 text-2xl font-bold">Kahaniverse — Demo</h1>
        <button
          type="submit"
          data-testid="demo-login"
          className="rounded-btn bg-brand px-8 py-3 font-semibold text-white"
        >
          Enter demo
        </button>
      </form>
    </main>
  );
}
