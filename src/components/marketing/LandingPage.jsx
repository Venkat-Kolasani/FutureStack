import { FiBarChart2, FiBookOpen, FiBriefcase, FiCode, FiFileText, FiLayers } from 'react-icons/fi';
import FAQ from '@/components/common/FAQ';
import Footer from '@/components/common/Footer';
import { JsonLd } from '@/components/seo/JsonLd';
import { FAQ_ITEMS } from '@/content/faq';
import { GITHUB_URL, OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import LandingCtas from './LandingCtas';
import LandingNav from './LandingNav';

const FEATURES = [
  {
    title: 'Application Tracker',
    desc: 'Kanban and list views with campus filters. Add roles in-app or from the Chrome extension.',
    icon: 'briefcase',
    gradient: 'from-blue-500/20 to-cyan-500/5',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    title: 'Interview Pipeline',
    desc: 'Log every round and schedule. Your status and calendar stay in sync.',
    icon: 'layers',
    gradient: 'from-indigo-500/20 to-violet-500/5',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    title: 'Interview Prep',
    desc: 'Research, questions, and STAR stories per role. Separate from your live pipeline.',
    icon: 'book',
    gradient: 'from-violet-500/20 to-purple-500/5',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  {
    title: 'Hackathon Manager',
    desc: 'Teams, ideas, tasks, and submission deadlines in one workspace.',
    icon: 'code',
    gradient: 'from-purple-500/20 to-pink-500/5',
    iconClass: 'text-purple-600 dark:text-purple-400',
  },
  {
    title: 'Document Vault',
    desc: 'Resumes and cover letters linked to applications. Local ATS-style feedback for PDF and DOCX.',
    icon: 'file',
    gradient: 'from-amber-500/20 to-yellow-500/5',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    title: 'Analytics & Reports',
    desc: 'Funnel insights, PDF export, and read-only share links for mentors.',
    icon: 'chart',
    gradient: 'from-orange-500/20 to-rose-500/5',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
];

const ICONS = {
  briefcase: FiBriefcase,
  layers: FiLayers,
  book: FiBookOpen,
  code: FiCode,
  file: FiFileText,
  chart: FiBarChart2,
};

const cardBaseClass = 'border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.03]';

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  disambiguatingDescription:
    'Student career workspace at futuretracker.online. Not the sustainability company at futuretracker.com.',
  publisher: { '@id': `${SITE_URL}/#organization` },
};

const webApplicationLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  alternateName: ['FutureTracker.online', 'FutureStack'],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'Web',
  isAccessibleForFree: true,
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@id': `${SITE_URL}/#organization` },
  featureList: [
    'Internship Application Tracking',
    'Interview Round Pipeline',
    'Hackathon Deadline Management',
    'Kanban Status Board',
    'Calendar View',
    'PDF Report Export',
    'Analytics Dashboard',
    'Chrome Extension Quick-Save',
  ],
};

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: 'FutureTracker.online',
  url: SITE_URL,
  logo: OG_IMAGE,
  sameAs: [GITHUB_URL],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: `${GITHUB_URL}/issues`,
  },
  description:
    'Student career workspace at futuretracker.online. Not affiliated with the sustainability platform at futuretracker.com.',
};

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans selection:bg-blue-500 overflow-x-hidden transition-colors duration-300">
      <JsonLd data={websiteLd} />
      <JsonLd data={webApplicationLd} />
      <JsonLd data={organizationLd} />
      <JsonLd data={faqLd} />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-white dark:from-black via-transparent to-transparent transition-colors duration-300" />
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-white dark:bg-black/5 dark:bg-white/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white dark:bg-black/5 dark:bg-white/5 rounded-full blur-[120px]" />
      </div>

      <LandingNav />

      <main id="main-content" className="relative z-10 min-h-screen flex flex-col justify-center pt-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
            Build Your Future, <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-200 dark:to-gray-400">
              One Opportunity at a Time
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            FutureTracker is the all-in-one workspace for students and developers to track
            internships round-by-round, manage hackathons, and see exactly where your applications stand.
          </p>
          <LandingCtas />
        </div>
      </main>

      <div id="about" className="mt-20 relative z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className={`rounded-3xl ${cardBaseClass} backdrop-blur-md p-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative overflow-hidden`}>
            {[
              { label: 'Organized', value: '100%' },
              { label: 'Missed Deadlines', value: '0' },
              { label: 'Opportunities', value: '∞' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:to-gray-500 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-widest uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="features" className="max-w-7xl mx-auto mt-32 px-6 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Everything you need to succeed</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Stop using spreadsheets. FutureTracker gives you a powerful, dedicated environment
            to manage your career growth.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const Icon = ICONS[feature.icon];
            return (
              <article
                key={feature.title}
                className={`group relative p-8 rounded-2xl ${cardBaseClass} hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-gray-100/50 dark:bg-white/5 rounded-xl flex items-center justify-center mb-6 ring-1 ring-gray-200 dark:ring-white/10 group-hover:scale-110 transition-transform duration-300">
                    <Icon className={`w-6 h-6 ${feature.iconClass}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-200 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed group-hover:text-gray-900 dark:group-hover:text-gray-300 transition-colors">
                    {feature.desc}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <FAQ />
      <Footer />
    </div>
  );
}
