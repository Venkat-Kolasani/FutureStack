import { Helmet } from 'react-helmet-async';

const SEO = ({
  title,
  description,
  keywords,
  canonical,
  type = 'website',
  image = 'https://futuretracker.online/og-image.png',
  noindex = false,
}) => {
  const siteTitle = 'FutureTracker.online';
  const fullTitle = title
    ? `${title} | ${siteTitle}`
    : `${siteTitle} — Free Internship, Hackathon & Job Application Tracker`;
  const defaultDescription =
    'FutureTracker.online is a free career workspace for students and developers. Track internships round-by-round, manage hackathons, and organize job applications — not affiliated with futuretracker.com.';
  const metaDescription = description || defaultDescription;
  const defaultKeywords =
    'FutureTracker.online, internship tracker, hackathon tracker, job application tracker, student career tracker, interview round tracker, application kanban';
  const metaKeywords = keywords || defaultKeywords;
  const baseUrl = 'https://futuretracker.online';
  const canonicalUrl = canonical ? `${baseUrl}${canonical}` : baseUrl;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <>
          <meta name="robots" content="index, follow" />
          {/* Only add canonical for indexable pages */}
          <link rel="canonical" href={canonicalUrl} />
        </>
      )}

      {/* Open Graph / Facebook - Use base URL for noindex pages */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={noindex ? baseUrl : canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="FutureTracker.online" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter - Use base URL for noindex pages */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={noindex ? baseUrl : canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
