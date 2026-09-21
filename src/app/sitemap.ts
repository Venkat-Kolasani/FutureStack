import type { MetadataRoute } from 'next';
import { GUIDES } from '@/content/guides';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const latestGuideDate = GUIDES.reduce((latest, guide) => (
    guide.dateModified > latest ? guide.dateModified : latest
  ), GUIDES[0]?.dateModified ?? '2026-07-31');
  const siteLastMod = new Date(latestGuideDate);

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: siteLastMod,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: siteLastMod,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: siteLastMod,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...GUIDES.map((guide) => ({
      url: `${SITE_URL}/guides/${guide.slug}`,
      lastModified: new Date(guide.dateModified),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    {
      url: `${SITE_URL}/llms.txt`,
      lastModified: siteLastMod,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/llms-full.txt`,
      lastModified: siteLastMod,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
