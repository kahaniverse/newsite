import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kahaniverse.com';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/profile/', '/profile/edit'] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
