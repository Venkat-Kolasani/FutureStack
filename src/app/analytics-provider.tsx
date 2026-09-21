'use client';

import { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics, trackPageView } from '@/lib/analytics';

function AnalyticsInner() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/share/')) {
      trackPageView('/share/[token]');
      return;
    }
    if (pathname.startsWith('/hackathons/invites/')) {
      trackPageView('/hackathons/invites/[token]');
      return;
    }
    trackPageView(pathname);
  }, [pathname]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner />
    </Suspense>
  );
}
