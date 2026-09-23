import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { indexMetadata } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { MarketingDoc } from '@/components/marketing/MarketingDoc';

export const metadata: Metadata = indexMetadata({
  title: 'Privacy',
  description:
    'Privacy overview for FutureTracker.online: Clerk authentication, user-scoped API access, and how account data is handled.',
  path: '/privacy',
});

const privacyLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Privacy — FutureTracker.online',
    url: `${SITE_URL}/privacy`,
    description:
      'Privacy overview for FutureTracker.online: Clerk authentication, user-scoped API access, and how account data is handled.',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Privacy', item: `${SITE_URL}/privacy` },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <MarketingDoc>
      <JsonLd data={privacyLd} />
      <p className="eyebrow">Privacy</p>
      <h1>How FutureTracker.online handles your data</h1>
      <p className="lead">
        This page summarizes the privacy posture of the FutureTracker.online product at{' '}
        <a href="https://futuretracker.online">https://futuretracker.online</a>.
      </p>
      <h2>Authentication</h2>
      <p>
        Sign-in is handled by <strong>Clerk</strong>. FutureTracker.online does not store your password.
        After you authenticate, the API verifies your session and scopes all data access to your account.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>Opportunity records you create (internships, hackathons, statuses, notes)</li>
        <li>Interview rounds, prep notes, and related calendar timing you enter</li>
        <li>Documents you upload or link (for example resumes) and associations to opportunities</li>
        <li>Notification preferences and in-app reminder history</li>
        <li>Optional share-link metadata when you create a read-only share</li>
      </ul>
      <h2>Access control</h2>
      <p>
        Protected API routes require authentication. Database queries are scoped to the signed-in user.
        PostgreSQL constraints and Row-Level Security reinforce ownership boundaries.
      </p>
      <h2>Sharing</h2>
      <p>
        Read-only share links expose only the snapshot you choose to share. Viewers do not get dashboard access.
        You can revoke share links.
      </p>
      <h2>Email reminders</h2>
      <p>
        Deadline email copies are off unless you opt in and the API has email delivery configured.
        In-app notifications remain available in the product.
      </p>
      <h2>Analytics</h2>
      <p>
        Product analytics may be collected to improve reliability and features. Do not put secrets into free-text fields.
      </p>
      <h2>Contact</h2>
      <p>
        For privacy questions or data requests, open an issue on{' '}
        <a href="https://github.com/Venkat-Kolasani/FutureStack/issues">GitHub Issues</a>.
      </p>
      <p className="disclaimer">
        Note: FutureTracker.online is not affiliated with the company at futuretracker.com.
        Last updated: 30 July 2026.
      </p>
      <p>
        <Link className="cta" href="/">Return to FutureTracker.online</Link>
      </p>
    </MarketingDoc>
  );
}
