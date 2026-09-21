import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarketingDoc } from '@/components/marketing/MarketingDoc';
import { JsonLd } from '@/components/seo/JsonLd';
import { getGuide, guideJsonLd, GUIDES } from '@/content/guides';
import { indexMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) {
    return { title: 'Guide not found' };
  }
  return indexMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
    keywords: guide.keywords,
    type: 'article',
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) {
    notFound();
  }

  return (
    <MarketingDoc>
      {guideJsonLd(guide).map((block, index) => (
        <JsonLd key={index} data={block} />
      ))}
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep" aria-hidden="true">/</span>
        <span aria-current="page">{guide.headline}</span>
      </nav>
      <p className="eyebrow">{guide.eyebrow}</p>
      <h1>{guide.headline}</h1>
      <p className="lead">
        <strong>FutureTracker.online</strong> {guide.lead.replace(/^FutureTracker\.online\s+/i, '')}
      </p>
      <div className="card">
        <p>{guide.card}</p>
      </div>
      {guide.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets && (
            <ul>
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {section.ordered && (
            <ol>
              {section.ordered.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          )}
        </section>
      ))}
      <p className="disclaimer">
        Note: FutureTracker.online is a student career product and is not affiliated with the company at futuretracker.com.
      </p>
      <p>
        <Link className="cta" href={guide.cta.href}>
          {guide.cta.label}
        </Link>
      </p>
    </MarketingDoc>
  );
}
