import type { Metadata } from 'next';
import { notFound }    from 'next/navigation';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { CompositeScreen } from '@/components/screens/CompositeScreen';
import { HeroBlock }   from '@/components/screens/HeroBlock';
import { StoryList }   from '@/components/lists/StoryList';
import { getAuthorById } from '@/lib/db/queries/authors';
import { sampleAvatar } from '@/lib/sample-images';

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getAuthorById(params.id);
  if (!a) return {};
  return { title: `${a.displayName} — Kahaniverse`, description: a.bio ?? `Stories by ${a.displayName}` };
}

export default async function AuthorPage({ params }: Props) {
  const author = await getAuthorById(params.id);
  if (!author) notFound();

  const photo = author.avatarImage || sampleAvatar(author.id, 480);

  return (
    <NarrowShell title={author.displayName}>
      <CompositeScreen
        hero={
          <HeroBlock
            image={photo}
            aspect="4/3"
            title={author.displayName}
            synopsis={author.bio}
            meta={
              <div className="flex gap-5 text-sm text-white/85 pt-0.5">
                <span><strong className="text-white">{author.followCount.toLocaleString()}</strong> followers</span>
                <span><strong className="text-white">{author.loveCount.toLocaleString()}</strong> loves</span>
              </div>
            }
            reactions={{
              targetId:    author.id,
              targetType:  'author',
              loveCount:   author.loveCount,
              followCount: author.followCount,
            }}
          />
        }
        sections={[
          { title: 'Stories Authored', node: <StoryList /> },
        ]}
      />
    </NarrowShell>
  );
}
