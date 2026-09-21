import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export const initAnalytics = (): void => {
  if (!POSTHOG_KEY) {
    console.warn('Posthog key not configured - analytics disabled');
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    persistence: 'localStorage',
    autocapture: true,
    capture_pageleave: true,
  });
};

export const redactedPageUrl = (path: string): string => {
  if (typeof window === 'undefined') {
    return path;
  }
  const safeUrl = new URL(window.location.href);
  safeUrl.pathname = path;
  return safeUrl.href;
};

export const trackPageView = (path: string, title?: string): void => {
  if (!POSTHOG_KEY) return;

  posthog.capture('$pageview', {
    $current_url: redactedPageUrl(path),
    $pathname: path,
    title: title || document.title,
  });
};

export const identifyUser = (userId: string, email?: string): void => {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, {
    email,
    signed_up_at: new Date().toISOString(),
  });
};

export const resetAnalytics = (): void => {
  if (!POSTHOG_KEY) return;
  posthog.reset();
};

export const trackEvent = (eventName: string, properties: Record<string, unknown> = {}): void => {
  if (!POSTHOG_KEY) return;
  posthog.capture(eventName, properties);
};

export const analytics = {
  opportunityCreated: (category: string) => {
    trackEvent('opportunity_created', { category });
  },
  opportunityUpdated: (category: string, oldStatus: string, newStatus: string) => {
    trackEvent('opportunity_updated', { category, old_status: oldStatus, new_status: newStatus });
  },
  opportunityDeleted: (category: string) => {
    trackEvent('opportunity_deleted', { category });
  },
  statusBoardDrag: (oldStatus: string, newStatus: string) => {
    trackEvent('status_board_drag', { old_status: oldStatus, new_status: newStatus });
  },
  reportExported: (format: string, count: number) => {
    trackEvent('report_exported', { format, opportunity_count: count });
  },
  featureUsed: (featureName: string) => {
    trackEvent('feature_used', { feature: featureName });
  },
};

export default posthog;
