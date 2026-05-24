import type { Metadata } from 'next';
import { notFound }    from 'next/navigation';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { StoryList }   from '@/components/lists/StoryList';
import { getAuthorById } from '@/lib/db/queries/authors';

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getAuthorById(params.id);
  if (!a) return {};
  return { title: `${a.displayName} — Kahaniverse`, description: a.bio ?? `Stories by ${a.displayName}` };
}

export default async function AuthorPage({ params }: Props) {
  const author = await getAuthorById(params.id);
  if (!author) notFound();

  return (
    <NarrowShell>
      <div className="max-w-xl mx-auto py-6 flex flex-col gap-6">
        {/* Hero */}
        <section className="flex items-start gap-4">
          <AvatarImage src={author.avatarImage} alt={author.displayName} size={72} />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl font-bold text-text-primary">{author.displayName}</h1>
            {author.bio && <p className="text-sm text-text-muted mt-1 leading-relaxed">{author.bio}</p>}
            <div className="flex gap-4 mt-2 text-xs text-text-muted">
              <span>{author.followCount.toLocaleString()} followers</span>
              <span>{author.loveCount.toLocaleString()} loves</span>
            </div>
          </div>
        </section>

        {/* Their stories */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Stories</h2>
          <StoryList />
        </section>
      </div>
    </NarrowShell>
  );
}
