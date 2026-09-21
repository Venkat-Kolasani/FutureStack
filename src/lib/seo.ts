import type { Metadata } from 'next';
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from './site';

export function noIndexMetadata(title: string, description?: string): Metadata {
  return {
    title,
    description: description || SITE_DESCRIPTION,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description: description || SITE_DESCRIPTION,
      images: [OG_IMAGE],
      siteName: SITE_NAME,
      locale: 'en_US',
      type: 'website',
    },
  };
}

export function indexMetadata({
  title,
  description,
  path,
  keywords,
  type = 'website',
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: 'website' | 'article';
}): Metadata {
  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      images: [OG_IMAGE],
      siteName: SITE_NAME,
      locale: 'en_US',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [OG_IMAGE],
    },
  };
}
