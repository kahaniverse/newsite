import type { Metadata } from 'next';
import { redirect }     from 'next/navigation';
import { NarrowShell }  from '@/components/shell/NarrowShell';
import { FormDialog }   from '@/components/shell/FormDialog';
import { UniverseForm } from '@/components/forms/UniverseForm';
import { auth }         from '@/lib/auth/config';

export const metadata: Metadata = { title: 'Create a Universe — Kahaniverse' };

export default async function NewUniversePage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/universes/new');

  return (
    <>
      {/* Horizontal (tablet + desktop): modal dialog, no bottom nav. */}
      <div className="hidden md:block">
        <FormDialog title="Add Universe">
          <UniverseForm />
        </FormDialog>
      </div>

      {/* Narrow (mobile): full-screen shell with bottom nav. */}
      <div className="block md:hidden">
        <NarrowShell title="Add Universe">
          <div className="max-w-xl mx-auto py-6 px-2">
            <UniverseForm />
          </div>
        </NarrowShell>
      </div>
    </>
  );
}
