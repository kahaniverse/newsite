import { getUniverses } from '@/lib/db/queries/universes';
import { writeFileSync } from 'fs';

const { data } = await getUniverses({ page: 1, limit: 5 });
const payload  = {
  generated: new Date().toISOString(),
  universes:  data.map(u => ({
    slug:        u.slug,
    name:        u.name,
    concept:     u.concept,
    coverImage:  u.coverImage,
    genres:      u.genres,
    creatorName: u.creator.displayName,
    storyCount:  u.storyCount,
  })),
};
writeFileSync('public/data/universes.json', JSON.stringify(payload, null, 2));
console.log(`Written ${data.length} universes.`);