import type { Metadata } from 'next';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { StoryForm }   from '@/components/forms/StoryForm';

export const metadata: Metadata = { title: 'Write a Story — Kahaniverse' };

export default function NewStoryPage() {
  return (
    <NarrowShell title="Add Story">
      <div className="max-w-xl mx-auto py-6 px-2">
        <StoryForm />
      </div>
    </NarrowShell>
  );
}
