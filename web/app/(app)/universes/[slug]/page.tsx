import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NarrowShell }       from '@/components/shell/NarrowShell';
import { EntityDetailPanel } from '@/components/panels/EntityDetailPanel';
import { getUniverseBySlug } from '@/lib/db/queries/universes';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const u = await getUniverseBySlug(params.slug);
  if (!u) return {};
  return {
    title:       `${u.name} — Kahaniverse`,
    description: u.concept.slice(0, 160),
    openGraph:   { title: u.name, description: u.concept.slice(0, 160), images: [u.coverImage] },
  };
}

export default async function UniversePage({ params }: Props) {
  const universe = await getUniverseBySlug(params.slug);
  if (!universe) notFound();

  return (
    <div className="block lg:hidden">
      <NarrowShell>
        <EntityDetailPanel initialUniverse={universe} />
      </NarrowShell>
    </div>
  );
  // On wide screens the panel renders inside WideShell on the home page via store.
}
