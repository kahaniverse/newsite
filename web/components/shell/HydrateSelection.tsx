'use client';
import { useEffect } from 'react';
import { usePanelStore, type DetailMeta } from '@/store';

interface Props {
  universeSlug?: string;
  universeId?:   string | null;
  authorId?:     string;
  storyId?:      string;
  pageId?:       string;
  detailMeta?:   DetailMeta | null;
  /** Horizontal focused-takeover intent. Deep-link routes leave this true so
   *  panel 1 shows the entity's hero; browse-root routes pass false to drop
   *  back to the browse list. */
  focus?:        boolean;
}

// Server components render this to push selection + detail context into the
// panel store. Keeps the narrow shell's bottom nav / create sheet and the
// horizontal cascade panels in sync even on deep links / refresh.
export function HydrateSelection({
  universeSlug, universeId, authorId, storyId, pageId, detailMeta, focus = true,
}: Props) {
  const { selectUniverse, selectAuthor, selectStory, selectPage, setDetailMeta, setFocus, clearFocus } = usePanelStore();

  useEffect(() => {
    if (authorId) selectAuthor(authorId);
    if (universeSlug) selectUniverse(universeSlug, universeId ?? null);
    if (storyId) selectStory(storyId);
    if (pageId)  selectPage(pageId);
    if (detailMeta) setDetailMeta(detailMeta);

    // Deepest provided id wins as the panel-1 hero; browse roots clear it.
    const kind = !focus ? null
      : (storyId || pageId) ? 'story'
      : authorId            ? 'author'
      : universeSlug        ? 'universe'
      : null;
    if (kind) setFocus(kind); else clearFocus();

    return () => {
      if (detailMeta) setDetailMeta(null);
    };
  }, [universeSlug, universeId, authorId, storyId, pageId, detailMeta?.pageId, detailMeta?.storyId, focus]); // eslint-disable-line

  return null;
}
