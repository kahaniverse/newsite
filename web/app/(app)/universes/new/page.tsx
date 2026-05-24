import type { Metadata } from 'next';
import { NarrowShell }  from '@/components/shell/NarrowShell';
import { UniverseForm } from '@/components/forms/UniverseForm';

export const metadata: Metadata = { title: 'Create a Universe — Kahaniverse' };

export default function NewUniversePage() {
  return (
    <NarrowShell>
      <div className="max-w-xl mx-auto py-6 px-2">
        <UniverseForm />
      </div>
    </NarrowShell>
  );
}
