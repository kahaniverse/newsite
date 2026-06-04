'use client';
import { useEffect } from 'react';
import { usePanelStore, type DetailMeta } from '@/store';

interface Props {
  universeSlug?: string;
  universeId?:   string | null;
  storyId?:      string;
  pageId?:       string;
  detailMeta?:   DetailMeta | null;
}

// Server components render this to push selection + detail context
// into the panel store. Keeps the narrow shell's bottom nav / create sheet
// in sync even on deep links / refresh.
export function HydrateSelection({ universeSlug, universeId, storyId, pageId, detailMeta }: Props) {
  const { selectUniverse, selectStory, selectPage, setDetailMeta } = usePanelStore();

  useEffect(() => {
    if (universeSlug) selectUniverse(universeSlug, universeId ?? null);
    if (storyId) selectStory(storyId);
    if (pageId)  selectPage(pageId);
    if (detailMeta) setDetailMeta(detailMeta);
    return () => {
      if (detailMeta) setDetailMeta(null);
    };
  }, [universeSlug, universeId, storyId, pageId, detailMeta?.pageId, detailMeta?.storyId]); // eslint-disable-line

  return null;
}
