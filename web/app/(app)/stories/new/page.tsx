import type { Metadata } from 'next';
import { redirect }    from 'next/navigation';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { FormDialog }  from '@/components/shell/FormDialog';
import { StoryForm }   from '@/components/forms/StoryForm';
import { auth }        from '@/lib/auth/config';

export const metadata: Metadata = { title: 'Write a Story — Kahaniverse' };

export const dynamic = 'force-dynamic';

export default async function NewStoryPage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/stories/new');

  return (
    <>
      {/* Horizontal (tablet + desktop): modal dialog, no bottom nav. */}
      <div className="hidden md:block">
        <FormDialog title="Add Story">
          <StoryForm />
        </FormDialog>
      </div>

      {/* Narrow (mobile): full-screen shell with bottom nav. */}
      <div className="block md:hidden">
        <NarrowShell title="Add Story">
          <div className="max-w-xl mx-auto py-6 px-2">
            <StoryForm />
          </div>
        </NarrowShell>
      </div>
    </>
  );
}
