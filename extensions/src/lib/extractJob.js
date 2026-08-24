import { elementToText, htmlToText, normalizeText } from './htmlToText.js';

export { htmlToText, normalizeText };

const TITLE_SUFFIXES = [
  /\s*[|\-–—]\s*LinkedIn\s*$/i,
  /\s*[|\-–—]\s*Lever\s*$/i,
  /\s*[|\-–—]\s*Greenhouse\s*$/i,
  /\s*[|\-–—]\s*Job Application\s*$/i,
];

const TITLE_PREFIXES = [
  /^Job Application for\s+/i,
  /^Apply for\s+/i,
  /^Job:\s+/i,
];

const LINKEDIN_TITLE_SELECTORS = [
  '.job-details-jobs-unified-top-card__job-title h1',
  'h1.job-details-jobs-unified-top-card__job-title',
  '.job-details-jobs-unified-top-card__job-title',
  '.jobs-unified-top-card__job-title h1',
  '.jobs-unified-top-card__job-title',
  '.t-24.job-details-jobs-unified-top-card__job-title',
];

const LINKEDIN_COMPANY_SELECTORS = [
  '.job-details-jobs-unified-top-card__company-name a',
  '.job-details-jobs-unified-top-card__company-name',
  '.jobs-unified-top-card__company-name a',
  '.jobs-unified-top-card__company-name',
  'a.topcard__org-name-link',
];

const LINKEDIN_DESCRIPTION_SELECTORS = [
  '#job-details',
  '.jobs-description__content',
  '.jobs-box__html-content',
  '.jobs-description-content__text',
  '.jobs-description',
  'article.jobs-description__container',
];

const GREENHOUSE_TITLE_SELECTORS = [
  'h1.app-title',
  '.app-title',
  'h1.section-header',
  '.job__title h1',
  '.job-header h1',
  '[data-testid="job-title"]',
];

const GREENHOUSE_COMPANY_SELECTORS = [
  '.company-name',
  '.logo-text',
  '.app-title + .company-name',
];

const GREENHOUSE_LOCATION_SELECTORS = [
  '.job__location',
  '.location',
];

const GREENHOUSE_DESCRIPTION_SELECTORS = [
  '#content',
  '#job_description',
  '.job__description',
  '.content',
  '[data-testid="job-description"]',
];

const LEVER_TITLE_SELECTORS = [
  '.posting-headline h2',
  '.posting-headline h1',
  'h2.posting-title',
  '.posting-page h2',
];

const LEVER_COMPANY_SELECTORS = [
  '.main-header-logo img[alt]',
  '.posting-headline .sort-by-team',
];

const LEVER_DESCRIPTION_SELECTORS = [
  '.section-wrapper.page-full-width',
  '.posting-page .section-wrapper',
  '.posting-page .content',
  '.content',
];

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function isJobPosting(node) {
  if (!node || typeof node !== 'object') return false;
  return asArray(node['@type']).some((type) => String(type).toLowerCase() === 'jobposting');
}

function organizationName(org) {
  if (!org) return '';
  if (typeof org === 'string') return normalizeText(org);
  return normalizeText(org.name || org.legalName || '');
}

function locationFromJobPosting(posting) {
  const locations = asArray(posting?.jobLocation);
  for (const loc of locations) {
    if (typeof loc === 'string' && loc.trim()) return normalizeText(loc);
    const address = loc?.address;
    if (typeof address === 'string' && address.trim()) return normalizeText(address);
    const locality = address?.addressLocality || loc?.addressLocality;
    const region = address?.addressRegion;
    const country = address?.addressCountry?.name || address?.addressCountry;
    const parts = [locality, region, country].map((part) => normalizeText(part)).filter(Boolean);
    if (parts.length) return parts.join(', ');
  }
  if (posting?.jobLocationType) return normalizeText(posting.jobLocationType);
  return '';
}

function parseJsonLdText(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function collectJsonLdNodes(value, bucket) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonLdNodes(item, bucket));
    return;
  }
  if (typeof value !== 'object') return;
  bucket.push(value);
  if (value['@graph']) collectJsonLdNodes(value['@graph'], bucket);
}

export function readJsonLdJobPosting(documentObject) {
  const scripts = documentObject?.querySelectorAll?.('script[type="application/ld+json"]');
  if (!scripts?.length) return null;

  const nodes = [];
  for (const script of scripts) {
    const parsed = parseJsonLdText(script.textContent);
    collectJsonLdNodes(parsed, nodes);
  }

  const posting = nodes.find(isJobPosting);
  if (!posting) return null;

  const doc = documentObject;
  return {
    title: normalizeText(posting.title || posting.name || ''),
    description: htmlToText(posting.description || '', doc),
    company: organizationName(posting.hiringOrganization),
    location: locationFromJobPosting(posting),
    source: 'jsonld',
  };
}

export function cleanupTitle(title) {
  let next = normalizeText(title);
  TITLE_SUFFIXES.forEach((pattern) => {
    next = next.replace(pattern, '');
  });
  TITLE_PREFIXES.forEach((pattern) => {
    next = next.replace(pattern, '');
  });
  return normalizeText(next);
}

export function composeTitle(title, company) {
  const clean = cleanupTitle(title);
  const firm = normalizeText(company);
  if (!clean) return firm;
  if (!firm) return clean;
  if (clean.toLowerCase().includes(firm.toLowerCase())) return clean;
  const combined = `${clean} at ${firm}`;
  return combined.length <= 200 ? combined : clean;
}

export function detectSite(href) {
  try {
    const host = new URL(href).hostname.replace(/^www\./, '');
    if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) return 'linkedin';
    if (host === 'greenhouse.io' || host.endsWith('.greenhouse.io')) return 'greenhouse';
    if (host === 'jobs.lever.co' || host.endsWith('.lever.co')) return 'lever';
    return 'generic';
  } catch {
    return 'generic';
  }
}

function readMeta(documentObject, name) {
  const element = documentObject?.querySelector?.(
    `meta[property="${name}"], meta[name="${name}"]`,
  );
  return element?.content ? normalizeText(element.content) : '';
}

function firstMatching(root, selectors) {
  if (!root?.querySelector) return null;
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (element) return element;
  }
  return null;
}

function firstText(root, selectors) {
  const element = firstMatching(root, selectors);
  if (!element) return '';
  if (element.tagName === 'IMG') return normalizeText(element.getAttribute('alt'));
  if (element.tagName === 'TITLE') return cleanupTitle(element.textContent);
  return normalizeText(element.textContent);
}

function firstDescription(root, selectors) {
  const element = firstMatching(root, selectors);
  return element ? elementToText(element) : '';
}

function companyFromPath(href, index) {
  try {
    const parts = new URL(href).pathname.split('/').filter(Boolean);
    const slug = parts[index] || '';
    if (!slug || slug === 'jobs') return '';
    return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return '';
  }
}

function companyFromDocumentTitle(documentObject) {
  const cleaned = cleanupTitle(documentObject?.title || '');
  const match = cleaned.match(/\sat\s+(.+)$/i);
  return match ? normalizeText(match[1]) : '';
}

export function isWeakTitle(text) {
  const value = normalizeText(text);
  if (!value || value.length < 3) return true;
  return /^(linkedin|greenhouse|lever|indeed|jobs?|careers?|job application)$/i.test(value);
}

export function isWeakDescription(text) {
  const value = normalizeText(text);
  if (!value || value.length < 80) return true;
  if (/see who (you know|was hired)/i.test(value)) return true;
  if (/^apply (on|for)/i.test(value)) return true;
  if (/sign in to see/i.test(value)) return true;
  if (/linkedin/i.test(value) && value.length < 180) return true;
  return false;
}

function emptyJob(link, site) {
  return {
    title: '',
    description: '',
    link,
    company: '',
    location: '',
    site,
    source: '',
  };
}

function coalesceField(candidates, isWeak = () => false) {
  const values = candidates.map((value) => (value == null ? '' : String(value)));
  const strong = values.find((value) => value && !isWeak(value));
  if (strong) return strong;
  return values.find(Boolean) || '';
}

function extractOpenGraph(documentObject, locationObject) {
  const link = locationObject?.href || '';
  return {
    title: cleanupTitle(readMeta(documentObject, 'og:title') || documentObject?.title || ''),
    description: readMeta(documentObject, 'og:description'),
    company: readMeta(documentObject, 'og:site_name'),
    location: '',
    link,
    source: 'opengraph',
  };
}

function extractLinkedIn(documentObject, locationObject, jsonLd) {
  const root = documentObject;
  const og = extractOpenGraph(documentObject, locationObject);
  const title = coalesceField(
    [firstText(root, LINKEDIN_TITLE_SELECTORS), jsonLd?.title, og.title],
    isWeakTitle,
  );
  const description = coalesceField(
    [
      firstDescription(root, LINKEDIN_DESCRIPTION_SELECTORS),
      jsonLd?.description,
      isWeakDescription(og.description) ? '' : og.description,
    ],
    isWeakDescription,
  );
  const company = coalesceField([
    firstText(root, LINKEDIN_COMPANY_SELECTORS),
    jsonLd?.company,
  ]);
  const usedDomDescription = Boolean(firstMatching(root, LINKEDIN_DESCRIPTION_SELECTORS));
  return {
    title,
    description,
    company,
    location: jsonLd?.location || '',
    link: locationObject?.href || '',
    source: usedDomDescription && !isWeakDescription(description)
      ? 'linkedin'
      : jsonLd?.source || (isWeakDescription(description) ? 'opengraph' : 'linkedin'),
  };
}

function extractGreenhouse(documentObject, locationObject, jsonLd) {
  const og = extractOpenGraph(documentObject, locationObject);
  const title = coalesceField(
    [jsonLd?.title, firstText(documentObject, GREENHOUSE_TITLE_SELECTORS), og.title],
    isWeakTitle,
  );
  const description = coalesceField(
    [jsonLd?.description, firstDescription(documentObject, GREENHOUSE_DESCRIPTION_SELECTORS), og.description],
    isWeakDescription,
  );
  const company = coalesceField([
    jsonLd?.company,
    firstText(documentObject, GREENHOUSE_COMPANY_SELECTORS),
    companyFromDocumentTitle(documentObject),
    companyFromPath(locationObject?.href, 0),
  ]);
  return {
    title,
    description,
    company,
    location: jsonLd?.location || firstText(documentObject, GREENHOUSE_LOCATION_SELECTORS),
    link: locationObject?.href || '',
    source: jsonLd?.description ? 'jsonld' : 'greenhouse',
  };
}

function extractLever(documentObject, locationObject, jsonLd) {
  const og = extractOpenGraph(documentObject, locationObject);
  const title = coalesceField(
    [jsonLd?.title, firstText(documentObject, LEVER_TITLE_SELECTORS), og.title],
    isWeakTitle,
  );
  const description = coalesceField(
    [jsonLd?.description, firstDescription(documentObject, LEVER_DESCRIPTION_SELECTORS), og.description],
    isWeakDescription,
  );
  const company = coalesceField([
    jsonLd?.company,
    firstText(documentObject, LEVER_COMPANY_SELECTORS),
    companyFromPath(locationObject?.href, 0),
  ]);
  return {
    title,
    description,
    company,
    location: jsonLd?.location || '',
    link: locationObject?.href || '',
    source: jsonLd?.description ? 'jsonld' : 'lever',
  };
}

function extractGeneric(documentObject, locationObject, jsonLd) {
  const og = extractOpenGraph(documentObject, locationObject);
  const heading = firstText(documentObject, ['h1']);
  const title = coalesceField([jsonLd?.title, heading, og.title], isWeakTitle);
  const description = coalesceField([jsonLd?.description, og.description], isWeakDescription);
  return {
    title,
    description,
    company: jsonLd?.company || og.company || '',
    location: jsonLd?.location || '',
    link: locationObject?.href || '',
    source: jsonLd?.title || jsonLd?.description ? 'jsonld' : 'opengraph',
  };
}

export function isWeakParse(job) {
  if (!job) return true;
  if (isWeakTitle(job.title)) return true;
  if (isWeakDescription(job.description)) return true;
  return job.source === 'opengraph';
}

export function applyExtractedJob(prev, extracted, dirty = {}) {
  const next = { ...prev };
  if (!dirty.title && extracted?.title) next.title = extracted.title;
  if (!dirty.description && extracted?.description) next.description = extracted.description;
  if (!dirty.link && extracted?.link) next.link = extracted.link;
  next.company = extracted?.company || prev.company || '';
  next.location = extracted?.location || prev.location || '';
  next.site = extracted?.site || prev.site || '';
  next.source = extracted?.source || prev.source || '';
  return next;
}

export function joinBlocks(existing, addition) {
  const current = String(existing || '').trimEnd();
  const extra = normalizeText(addition);
  if (!extra) return String(existing || '');
  if (!current) return extra;
  return `${current}\n\n${extra}`;
}

const TRACKING_QUERY_KEYS = new Set([
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'mc_cid',
  'mc_eid',
  'li_fat_id',
  'trk',
  'trkinfo',
]);

export function listingKey(url) {
  try {
    const parsed = new URL(url);
    const jobId = parsed.searchParams.get('currentJobId');
    if (jobId) {
      return `${parsed.origin}${parsed.pathname}?job=${jobId}`;
    }

    const params = new URLSearchParams(parsed.search);
    for (const key of [...params.keys()]) {
      const normalized = key.toLowerCase();
      if (TRACKING_QUERY_KEYS.has(normalized) || normalized.startsWith('utm_')) {
        params.delete(key);
      }
    }
    const query = params.toString();
    return query
      ? `${parsed.origin}${parsed.pathname}?${query}`
      : `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url || 'unknown';
  }
}

export function extractJob(documentObject = document, locationObject = window.location) {
  const link = locationObject?.href || '';
  const site = detectSite(link);
  const jsonLd = readJsonLdJobPosting(documentObject);
  let parsed;

  if (site === 'linkedin') parsed = extractLinkedIn(documentObject, locationObject, jsonLd);
  else if (site === 'greenhouse') parsed = extractGreenhouse(documentObject, locationObject, jsonLd);
  else if (site === 'lever') parsed = extractLever(documentObject, locationObject, jsonLd);
  else parsed = extractGeneric(documentObject, locationObject, jsonLd);

  const title = composeTitle(parsed.title, parsed.company);
  const description = normalizeText(parsed.description);

  return {
    ...emptyJob(link, site),
    ...parsed,
    title,
    description,
    link: parsed.link || link,
    site,
    source: parsed.source || site,
  };
}

export function getPageMetadata(documentObject = document, locationObject = window.location) {
  const job = extractJob(documentObject, locationObject);
  return {
    title: job.title,
    description: job.description,
    link: job.link,
  };
}

/**
 * Self-contained OG fallback for chrome.scripting.executeScript({ func }).
 * Must not close over imports — Chrome serializes only this function body.
 */
export function scrapePageInTab() {
  const read = (name) => {
    const element = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
    return element ? element.content : null;
  };

  return {
    title: read('og:title') || document.title || '',
    description: read('og:description') || '',
    link: window.location.href,
    company: '',
    location: '',
    site: 'generic',
    source: 'opengraph',
  };
}

export const SITE_LABELS = {
  linkedin: 'LinkedIn',
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  jsonld: 'Job posting',
  opengraph: 'This page',
  generic: 'This page',
};
