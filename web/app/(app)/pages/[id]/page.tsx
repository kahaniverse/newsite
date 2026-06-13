import type { Metadata } from 'next';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { HorizontalBrowse } from '@/components/shell/HorizontalBrowse';
import { PageCard }    from '@/components/cards/PageCard';
import { PageList }    from '@/components/lists/PageList';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HydrateSelection } from '@/components/shell/HydrateSelection';
import { ViewTracker }   from '@/components/ui/ViewTracker';
import { SpeedDialFab } from '@/components/shell/Fab';
import { getPageById } from '@/lib/db/queries/pages';
import { getStoryById } from '@/lib/db/queries/stories';
import { dummyPage }   from '@/lib/sample-content';

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPageById(params.id);
  return { title: 'Story Page — Kahaniverse', description: (p ?? dummyPage(params.id)).content.slice(0, 160) };
}

export default async function PageDetailPage({ params }: Props) {
  // Fall back to sample content so the page screen is always inspectable.
  const page  = (await getPageById(params.id)) ?? dummyPage(params.id);
  const story = await getStoryById(page.storyId);

  const altParent = page.parentId ?? page.storyId;
  const fabActions = [
    ...(!page.disallowNext ? [{
      label: 'Add Next',
      icon: 'next' as const,
      href: `/pages/new?storyId=${page.storyId}&parentId=${page.id}&intent=next`,
    }] : []),
    ...(!page.disallowAlternate ? [{
      label: 'Alternate',
      icon: 'alternate' as const,
      href: `/pages/new?storyId=${page.storyId}&parentId=${altParent}&intent=alter`,
    }] : []),
  ];

  const hydrate = (
    <HydrateSelection
      storyId={page.storyId}
      pageId={page.id}
      detailMeta={{
        kind:     'page',
        pageId:   page.id,
        storyId:  page.storyId,
        parentId: page.parentId,
        authorId: page.author.id,
      }}
    />
  );

  return (
    <>
      {/* Count a unique view for this page (click-through only). */}
      <ViewTracker targetId={page.id} targetType="page" />

      {hydrate}

      {/* Horizontal cascading panels (tablet + desktop) */}
      <div className="hidden md:block">
        <HorizontalBrowse />
      </div>

      {/* Narrow stacked layout (mobile) */}
      <div className="block md:hidden">
      <NarrowShell title={story?.title ?? 'Story Page'} subtitle="Page">
      <div className="flex flex-col gap-5 py-4">
        <PageCard page={page} />
        {page.children.length > 0 && (
          <section>
            <SectionHeader title="Alternate Next Pages" />
            <PageList pages={page.children} />
          </section>
        )}
      </div>
      {fabActions.length > 0 && <SpeedDialFab actions={fabActions} />}
      </NarrowShell>
      </div>
    </>
  );
}
