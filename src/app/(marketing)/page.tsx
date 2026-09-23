import type { Metadata } from 'next';
import LandingPage from '@/components/marketing/LandingPage';
import { SITE_DESCRIPTION, SITE_KEYWORDS } from '@/lib/site';

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <LandingPage />;
}
