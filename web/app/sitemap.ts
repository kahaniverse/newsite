import type { MetadataRoute } from 'next';
import { getUniverses } from '@/lib/db/queries/universes';
import { getStories }   from '@/lib/db/queries/stories';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kahaniverse.com';

  const [{ data: universes }, { data: stories }] = await Promise.all([
    getUniverses({ page: 1, limit: 100 }),
    getStories({ page: 1, limit: 200, status: 'published' }),
  ]);

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily',  priority: 1 },
    { url: `${base}/discover`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/authors`,  lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    ...universes.map(u => ({
      url:             `${base}/universes/${u.slug}`,
      lastModified:    new Date(u.createdAt),
      changeFrequency: 'weekly' as const,
      priority:        0.8,
    })),
    ...stories.map(s => ({
      url:             `${base}/stories/${s.id}`,
      lastModified:    new Date(s.createdAt),
      changeFrequency: 'weekly' as const,
      priority:        0.7,
    })),
  ];
}
