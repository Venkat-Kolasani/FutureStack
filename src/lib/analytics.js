// Posthog Analytics Integration
// https://posthog.com/docs/libraries/react

import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.REACT_APP_POSTHOG_KEY;
const POSTHOG_HOST = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';

// Initialize Posthog
export const initAnalytics = () => {
    if (!POSTHOG_KEY) {
        console.warn('Posthog key not configured - analytics disabled');
        return;
    }

    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        // Capture page views automatically
        capture_pageview: false, // We'll handle this manually for SPA
        // Privacy settings
        persistence: 'localStorage',
        autocapture: true, // Auto-capture clicks, form submissions
        capture_pageleave: true,
        // Disable in development if needed
        loaded: (posthog) => {
            if (process.env.NODE_ENV === 'development') {
                // Uncomment to disable in dev:
                // posthog.opt_out_capturing();
            }
        }
    });
};

export const redactedPageUrl = (path) => {
    const safeUrl = new URL(window.location.href);
    safeUrl.pathname = path;
    return safeUrl.href;
};

// Track page views (call on route changes)
export const trackPageView = (path, title) => {
    if (!POSTHOG_KEY) return;

    posthog.capture('$pageview', {
        $current_url: redactedPageUrl(path),
        $pathname: path,
        title: title || document.title
    });
};

// Identify user after sign in
export const identifyUser = (userId, email) => {
    if (!POSTHOG_KEY) return;
    posthog.identify(userId, {
        email: email,
        signed_up_at: new Date().toISOString()
    });
};

// Reset on sign out
export const resetAnalytics = () => {
    if (!POSTHOG_KEY) return;
    posthog.reset();
};

// Track custom events
export const trackEvent = (eventName, properties = {}) => {
    if (!POSTHOG_KEY) return;
    posthog.capture(eventName, properties);
};

// Pre-defined event trackers for common actions
export const analytics = {
    // Opportunity events
    opportunityCreated: (category) => {
        trackEvent('opportunity_created', { category });
    },
    opportunityUpdated: (category, oldStatus, newStatus) => {
        trackEvent('opportunity_updated', { category, old_status: oldStatus, new_status: newStatus });
    },
    opportunityDeleted: (category) => {
        trackEvent('opportunity_deleted', { category });
    },
    statusBoardDrag: (oldStatus, newStatus) => {
        trackEvent('status_board_drag', { old_status: oldStatus, new_status: newStatus });
    },

    // Export events
    reportExported: (format, count) => {
        trackEvent('report_exported', { format, opportunity_count: count });
    },

    // Feature usage
    featureUsed: (featureName) => {
        trackEvent('feature_used', { feature: featureName });
    }
};

export default posthog;
