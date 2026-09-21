import type { Metadata } from 'next';
import LandingPage from '@/components/marketing/LandingPage';
import { indexMetadata } from '@/lib/seo';
import { SITE_DESCRIPTION, SITE_KEYWORDS } from '@/lib/site';

export const metadata: Metadata = indexMetadata({
  description: SITE_DESCRIPTION,
  path: '/',
  keywords: SITE_KEYWORDS,
});

export default function Page() {
  return <LandingPage />;
}
