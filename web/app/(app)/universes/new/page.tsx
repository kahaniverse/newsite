import type { Metadata } from 'next';
import { NarrowShell }  from '@/components/shell/NarrowShell';
import { FormDialog }   from '@/components/shell/FormDialog';
import { UniverseForm } from '@/components/forms/UniverseForm';

export const metadata: Metadata = { title: 'Create a Universe — Kahaniverse' };

export default function NewUniversePage() {
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
