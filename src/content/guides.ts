import { GITHUB_URL, SITE_NAME, SITE_URL } from '@/lib/site';

export type Guide = {
  slug: string;
  title: string;
  description: string;
  headline: string;
  datePublished: string;
  dateModified: string;
  keywords: string[];
  eyebrow: string;
  lead: string;
  sections: { heading: string; paragraphs?: string[]; bullets?: string[]; ordered?: string[] }[];
  card: string;
  cta: { href: string; label: string };
};

export const GUIDES: Guide[] = [
  {
    slug: 'internship-application-tracker',
    title: 'Internship Application Tracker for Students',
    description:
      'Track internship applications, interview rounds, and outcomes with FutureTracker, a free student internship application tracker.',
    headline: 'Internship application tracker for students',
    datePublished: '2026-07-30',
    dateModified: '2026-07-31',
    keywords: ['internship application tracker', 'student job tracker', 'interview rounds', 'FutureTracker.online'],
    eyebrow: 'Guide',
    lead:
      'FutureTracker is a free internship application tracker: log every role, move stages on a Kanban board, record interview rounds, and see what is coming next on your calendar.',
    card:
      'If recruiting season usually ends in a messy spreadsheet, start here instead. You get applications, OA and interview rounds, campus vs off-campus filters, and deadline reminders in one workspace, without building the tracker yourself.',
    sections: [
      {
        heading: 'What to track each season',
        bullets: [
          'Company, role, application date, and current status',
          'On-campus vs off-campus (campus mode)',
          'Each interview round with an optional scheduled time',
          'Notes, prep links, and documents tied to the opportunity',
          'Outcomes: offer, rejection, or ghosted',
        ],
      },
      {
        heading: 'How FutureTracker helps',
        bullets: [
          'Pipeline view: Kanban and list views so status stays visual',
          'Interview rounds: OA → technical → HR style progress that updates the parent opportunity',
          'Calendar: Upcoming rounds and deadlines in one place',
          'Chrome extension: Save a listing from the current tab with title, URL, and Open Graph details',
          'Analytics: Funnel and rejection insights after you have real volume',
        ],
      },
      {
        heading: 'Suggested workflow',
        ordered: [
          'Create a free account at futuretracker.online.',
          'Add each internship as you apply (or save it from the extension).',
          'Log rounds as soon as recruiters schedule them.',
          'Use the dashboard and calendar before each week of recruiting.',
          'Export a PDF or share a read-only link with a mentor if useful.',
        ],
      },
    ],
    cta: { href: '/', label: 'Start tracking internships free' },
  },
  {
    slug: 'hackathon-deadline-tracker',
    title: 'Hackathon Deadline Tracker',
    description:
      'Track hackathon teams, ideas, tasks, and submission deadlines with FutureTracker, a free hackathon deadline tracker for students.',
    headline: 'Hackathon deadline tracker',
    datePublished: '2026-07-30',
    dateModified: '2026-07-31',
    keywords: ['hackathon deadline tracker', 'hackathon team tracker', 'submission checklist', 'FutureTracker.online'],
    eyebrow: 'Guide',
    lead:
      'FutureTracker includes a hackathon workspace: keep the submission deadline visible, coordinate teammates, capture ideas, and close the checklist before the clock runs out.',
    card:
      'Need a free place for hackathon deadlines, team invites, idea voting, tasks, and reminders, without losing the internship pipeline in another tab? That is what this workspace is for.',
    sections: [
      {
        heading: 'Why hackathons need a dedicated tracker',
        bullets: [
          'Submission times are easy to miss when internship season is noisy',
          'Teams need a shared place for ideas and ownership',
          'Tasks and checklists beat chat scrollback the night before submit',
        ],
      },
      {
        heading: 'What FutureTracker covers',
        bullets: [
          'Hackathon records with submission deadlines on the calendar',
          'Account-backed owner / editor / viewer access',
          'Expiring single-use team invites',
          'Idea brainstorming with idempotent votes',
          'Tasks and a submission checklist',
          'In-app deadline reminders (optional email copy if you opt in)',
        ],
      },
      {
        heading: 'Suggested workflow',
        ordered: [
          'Add the hackathon and set the submission deadline.',
          'Invite teammates with a single-use link.',
          'Brainstorm ideas and lock the direction early.',
          'Break work into tasks and track the checklist.',
          'Watch the dashboard / calendar so the deadline never surprises you.',
        ],
      },
    ],
    cta: { href: '/', label: 'Track your next hackathon free' },
  },
  {
    slug: 'job-tracker-vs-spreadsheet',
    title: 'Job Tracker vs Spreadsheet',
    description:
      'Compare a dedicated job and internship tracker to Google Sheets or Notion. Why FutureTracker works better for interview rounds and deadlines.',
    headline: 'Job tracker vs spreadsheet',
    datePublished: '2026-07-30',
    dateModified: '2026-07-31',
    keywords: ['job tracker vs spreadsheet', 'internship tracker', 'Notion alternative', 'FutureTracker.online'],
    eyebrow: 'Guide',
    lead:
      'Spreadsheets work until interview season gets real. FutureTracker is a free, purpose-built job and internship tracker with stages, rounds, calendars, and reports already modeled.',
    card:
      'Keep a sheet for custom analysis if you like. Use FutureTracker as the day-to-day system for applications, interview rounds, hackathon deadlines, and mentor-ready PDF or share links.',
    sections: [
      {
        heading: 'Where spreadsheets break down',
        bullets: [
          'Status columns drift; everyone invents their own stage names',
          'Multi-round interviews need nested rows the sheet was not designed for',
          'Deadlines live in another calendar app, which makes them easy to miss',
          'Sharing a messy sheet with a mentor exposes everything',
          'Mobile edits and browser saving are clumsy',
        ],
      },
      {
        heading: 'What a dedicated tracker adds',
        bullets: [
          'Kanban and list views tuned for application status',
          'Interview rounds that update the parent opportunity',
          'Calendar surfaces for rounds and hackathon submissions',
          'Document vault linked to roles',
          'Funnel analytics without pivot-table homework',
          'Revocable read-only share links',
        ],
      },
      {
        heading: 'When FutureTracker is the better default',
        bullets: [
          'You are applying to more than a handful of roles',
          'You have OAs and multi-round loops on overlapping weeks',
          'You also run hackathons in the same season',
          'You want a free tool instead of assembling Notion databases',
        ],
      },
    ],
    cta: { href: '/', label: 'Switch from your spreadsheet' },
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug);
}

export function guideJsonLd(guide: Guide) {
  const url = `${SITE_URL}/guides/${guide.slug}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.description,
      url,
      image: [`${SITE_URL}/og-image.png`],
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/og-image.png` },
      },
      datePublished: guide.datePublished,
      dateModified: guide.dateModified,
      articleSection: 'Guides',
      keywords: guide.keywords,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: guide.title, item: url },
      ],
    },
  ];
}

export { GITHUB_URL };
