import type { Metadata } from 'next';
import { notFound }    from 'next/navigation';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { LeafPanel }   from '@/components/panels/LeafPanel';
import { getStoryById } from '@/lib/db/queries/stories';

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getStoryById(params.id);
  if (!s) return {};
  return {
    title:       `${s.title} — Kahaniverse`,
    description: s.synopsis,
    openGraph:   { title: s.title, description: s.synopsis, images: s.coverImage ? [s.coverImage] : [] },
  };
}

export default async function StoryPage({ params }: Props) {
  const story = await getStoryById(params.id);
  if (!story) notFound();

  return (
    <NarrowShell>
      <LeafPanel />
    </NarrowShell>
  );
}
