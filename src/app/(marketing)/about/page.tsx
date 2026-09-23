import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { indexMetadata } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { MarketingDoc } from '@/components/marketing/MarketingDoc';

export const metadata: Metadata = indexMetadata({
  title: 'About: Student Career Workspace',
  description:
    'Learn about FutureTracker, a free workspace for students and developers to track internships, hackathons, and job applications.',
  path: '/about',
});

const aboutLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About FutureTracker',
  url: `${SITE_URL}/about`,
  description: 'About the FutureTracker student career workspace.',
  isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
};

export default function AboutPage() {
  return (
    <MarketingDoc>
      <JsonLd data={aboutLd} />
      <p className="eyebrow">About</p>
      <h1>Built for the messy middle of recruiting season</h1>
      <p className="lead">
        FutureTracker is a free career workspace for students and developers. It keeps internships,
        hackathons, interview rounds, and documents in one place so you are not juggling spreadsheets,
        calendar invites, and half-finished Notion boards.
      </p>
      <h2>Who it is for</h2>
      <ul>
        <li>Students applying to many internships in the same season</li>
        <li>Developers balancing hackathons with job applications</li>
        <li>Anyone who wants interview rounds, deadlines, and status in one view</li>
      </ul>
      <h2>What you can do</h2>
      <ul>
        <li>Track internship applications with campus filters and a Kanban board</li>
        <li>Log multi-round interviews (OA, technical, HR) with scheduled times</li>
        <li>Manage hackathon teams, ideas, tasks, and submission deadlines</li>
        <li>Keep resumes and cover letters next to the roles they belong to</li>
        <li>Export PDF reports or share a read-only snapshot with a mentor</li>
        <li>Save listings from the browser with the Chrome extension</li>
      </ul>
      <h2>Open source</h2>
      <p>
        The product is built in the open as{' '}
        <a href="https://github.com/Venkat-Kolasani/FutureStack">FutureStack on GitHub</a>.
        Feature ideas, bugs, and questions can go to GitHub Issues.
      </p>
      <h2>A note on the name</h2>
      <p className="disclaimer">
        There is a separate sustainability company at futuretracker.com. This product is
        <strong> FutureTracker</strong> at futuretracker.online, a student career tracker, and is not affiliated with that company.
      </p>
      <p>
        <Link className="cta" href="/">Get started free</Link>
      </p>
    </MarketingDoc>
  );
}
