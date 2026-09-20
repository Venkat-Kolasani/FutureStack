import type { MetadataRoute } from 'next';
import { GUIDES } from '@/content/guides';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastMod = new Date('2026-07-31');
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...GUIDES.map((guide) => ({
      url: `${SITE_URL}/guides/${guide.slug}`,
      lastModified: lastMod,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    {
      url: `${SITE_URL}/llms.txt`,
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/llms-full.txt`,
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
