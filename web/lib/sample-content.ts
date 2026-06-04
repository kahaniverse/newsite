import type { Page } from '@/lib/types';

// Demo/sample page used when a real page can't be loaded (empty DB or a
// non-UUID id), so the page screen — with its two FABs and the
// "Alternate Next Pages" list — can still be inspected. Remove once real
// page data exists.
export function dummyPage(id: string): Page {
  const child = (cid: string, content: string, i: number): Page => ({
    id:                cid,
    storyId:           'sample-story',
    parentId:          id,
    content,
    illustration:      undefined,
    disallowNext:      false,
    disallowAlternate: false,
    author:            { id: 'system', displayName: 'Kahaniverse' },
    loveCount:         8 + i * 3,
    viewCount:         210 + i * 47,
    children:          [],
    createdAt:         new Date(0).toISOString(),
  });

  return {
    id,
    storyId:           'sample-story',
    parentId:          null,
    content:
      'The airlock cycled with a long hiss, and for the first time in two ' +
      'hundred years a human breathed unfiltered air. Mira stepped onto the ' +
      'red soil of Kepler-9c, her boots sinking a centimetre into dust that ' +
      'had never known a footprint.\n\n' +
      '"Command, we are down," she said. The radio answered only with the ' +
      'soft static of a world too far from home. She looked up at a sky the ' +
      'colour of old copper and decided, then and there, that they would ' +
      'survive — whatever it cost.',
    illustration:      undefined,
    disallowNext:      false,
    disallowAlternate: false,
    author:            { id: 'system', displayName: 'Kahaniverse' },
    loveCount:         42,
    viewCount:         1280,
    children: [
      child('sample-alt-1', 'Mira radioed the colony ship instead, waiting for the others before taking a single step further.', 1),
      child('sample-alt-2', 'A tremor rolled through the ground — something beneath the dust had noticed they had arrived.', 2),
    ],
    createdAt: new Date(0).toISOString(),
  };
}
