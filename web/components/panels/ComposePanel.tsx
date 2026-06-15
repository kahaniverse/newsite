'use client';
import { useRouter } from 'next/navigation';
import { usePanelStore, type ComposeState } from '@/store';
import { StoryForm } from '@/components/forms/StoryForm';
import { PageForm } from '@/components/forms/PageForm';

// The horizontal layout's third-panel create flow. Renders the story / page
// form inline (not as a modal like the universe form) with a header + close
// button, wired to the panel store's compose state. On success it closes the
// form and navigates to the freshly created entity, so the cascade re-hydrates
// around it just like any deep link.
export function ComposePanel({ compose }: { compose: ComposeState }) {
  const router = useRouter();
  const cancelCompose = usePanelStore(s => s.cancelCompose);

  const title =
    compose.kind === 'story'
      ? 'Add Story'
      : compose.intent === 'alter'
        ? 'Add Alternate Page'
        : 'Add Page';

  return (
    <div className="flex flex-col gap-3 pb-24 panel-enter">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold text-text-primary">{title}</h2>
        <button
          type="button"
          onClick={cancelCompose}
          aria-label="Close"
          title="Close"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-accent hover:bg-bg-elevated/60 transition-colors"
        >
          <span className="text-xl leading-none" aria-hidden>✕</span>
        </button>
      </div>

      {compose.kind === 'story' ? (
        <StoryForm
          universeId={compose.universeId}
          onCancel={cancelCompose}
          onCreated={story => { cancelCompose(); router.push(`/stories/${story.id}`); }}
        />
      ) : (
        <PageForm
          storyId={compose.storyId}
          parentId={compose.parentId}
          intent={compose.intent}
          onCancel={cancelCompose}
          onCreated={page => { cancelCompose(); router.push(`/pages/${page.id}`); }}
        />
      )}
    </div>
  );
}
