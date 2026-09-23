import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export const WORKSPACE_DISALLOW = [
  '/dashboard',
  '/internships',
  '/hackathons',
  '/add',
  '/edit',
  '/status-board',
  '/calendar',
  '/reports',
  '/analytics',
  '/documents',
  '/notifications',
  '/progress',
  '/share',
];

export const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'OAI-SearchBot',
  'Claude-SearchBot',
  'Applebot-Extended',
  'Amazonbot',
  'CCBot',
  'meta-externalagent',
];

export default function robots(): MetadataRoute.Robots {
  const publicRule = {
    allow: '/',
    disallow: WORKSPACE_DISALLOW,
  };

  return {
    rules: [
      { userAgent: '*', ...publicRule },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, ...publicRule })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
