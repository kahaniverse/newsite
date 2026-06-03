'use client';
import { useEffect } from 'react';
import { usePanelStore, type DetailMeta } from '@/store';

interface Props {
  storyId?:    string;
  pageId?:     string;
  detailMeta?: DetailMeta | null;
}

// Server components render this to push selection + detail context
// into the panel store. Keeps the narrow shell's bottom nav in sync
// even on deep links / refresh.
export function HydrateSelection({ storyId, pageId, detailMeta }: Props) {
  const { selectStory, selectPage, setDetailMeta } = usePanelStore();

  useEffect(() => {
    if (storyId) selectStory(storyId);
    if (pageId)  selectPage(pageId);
    if (detailMeta) setDetailMeta(detailMeta);
    return () => {
      if (detailMeta) setDetailMeta(null);
    };
  }, [storyId, pageId, detailMeta?.pageId, detailMeta?.storyId]); // eslint-disable-line

  return null;
}
