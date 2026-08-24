import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import {
  applyExtractedJob,
  cleanupTitle,
  composeTitle,
  detectSite,
  extractJob,
  getPageMetadata,
  htmlToText,
  isWeakParse,
  joinBlocks,
  listingKey,
} from '../src/lib/extractJob.js';
import { normalizeText } from '../src/lib/htmlToText.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function loadJob(fileName, url) {
  const html = readFileSync(path.join(fixturesDir, fileName), 'utf8');
  const { document } = parseHTML(html);
  return extractJob(document, new URL(url));
}

describe('detectSite', () => {
  test('recognizes LinkedIn, Greenhouse, and Lever hosts', () => {
    expect(detectSite('https://www.linkedin.com/jobs/view/123')).toBe('linkedin');
    expect(detectSite('https://boards.greenhouse.io/stripe/jobs/1')).toBe('greenhouse');
    expect(detectSite('https://job-boards.greenhouse.io/acme/jobs/1')).toBe('greenhouse');
    expect(detectSite('https://jobs.lever.co/notion/abc')).toBe('lever');
    expect(detectSite('https://internshala.com/internship/detail/x')).toBe('generic');
  });
});

describe('title cleanup', () => {
  test('strips LinkedIn suffixes and application prefixes', () => {
    expect(cleanupTitle('Software Engineer | LinkedIn')).toBe('Software Engineer');
    expect(cleanupTitle('Job Application for Product Designer at Notion')).toBe('Product Designer at Notion');
  });

  test('composes company when it is missing from the title', () => {
    expect(composeTitle('Software Engineer', 'Acme')).toBe('Software Engineer at Acme');
    expect(composeTitle('Software Engineer at Acme', 'Acme')).toBe('Software Engineer at Acme');
  });
});

describe('htmlToText', () => {
  test('keeps paragraphs and list items', () => {
    const text = htmlToText('<p>Hello</p><p>World</p><ul><li>One</li><li>Two</li></ul>');
    expect(text).toContain('Hello');
    expect(text).toContain('World');
    expect(text).toContain('One');
    expect(text).toContain('Two');
    expect(text).not.toMatch(/<p>/);
  });

  test('drops script tags and collapses extra whitespace', () => {
    expect(normalizeText('  a \n\n\n b  ')).toBe('a\n\nb');
    expect(htmlToText('<p>Safe</p><script>alert(1)</script>')).toBe('Safe');
  });
});

describe('LinkedIn extraction', () => {
  const job = loadJob('linkedin.html', 'https://www.linkedin.com/jobs/view/4415735571/');

  test('prefers the job heading over junk Open Graph tags', () => {
    expect(job.site).toBe('linkedin');
    expect(job.title).toBe('Software Engineer at Acme');
    expect(job.company).toBe('Acme');
    expect(job.description).toContain('Build APIs for the intern platform');
    expect(job.description).toContain('Requirements: JavaScript');
    expect(job.description).not.toMatch(/See who you know/i);
    expect(isWeakParse(job)).toBe(false);
  });
});

describe('Greenhouse extraction', () => {
  const job = loadJob('greenhouse.html', 'https://boards.greenhouse.io/stripe/jobs/123');

  test('reads JSON-LD JobPosting title, company, location, and full description', () => {
    expect(job.site).toBe('greenhouse');
    expect(job.title).toBe('Backend Intern at Stripe');
    expect(job.company).toBe('Stripe');
    expect(job.location).toBe('San Francisco, CA');
    expect(job.description).toContain('billing APIs');
    expect(job.description).toContain('Python and SQL');
    expect(job.source).toBe('jsonld');
  });
});

describe('Lever extraction', () => {
  const job = loadJob('lever.html', 'https://jobs.lever.co/notion/abcd');

  test('uses JSON-LD graph JobPosting and strips application prefixes', () => {
    expect(job.site).toBe('lever');
    expect(job.title).toBe('Product Designer at Notion');
    expect(job.description).toContain("Design the next generation of Notion's editor");
    expect(job.description).toContain('Ship accessible interfaces');
    expect(job.title).not.toMatch(/Job Application for/i);
  });
});

describe('generic Open Graph fallback', () => {
  const url = { href: 'https://internshala.com/internship/detail/example' };

  test('returns og:title when present', () => {
    const job = loadJob('generic-og.html', url.href);
    expect(job.title).toBe('OG Title');
    expect(job.description).toMatch(/generic Open Graph summary/);
    expect(job.link).toBe(url.href);
    expect(job.site).toBe('generic');
  });

  test('falls back to document.title when og:title missing', () => {
    const documentObject = { title: 'Fallback Title', querySelector: () => null };
    const result = getPageMetadata(documentObject, url);
    expect(result.title).toBe('Fallback Title');
  });

  test('returns empty string when og:description missing', () => {
    const result = getPageMetadata({ title: '', querySelector: () => null }, url);
    expect(result.description).toBe('');
  });
});

describe('applyExtractedJob', () => {
  test('does not overwrite dirty title or description', () => {
    const prev = { title: 'Typed title', description: 'Typed notes', link: 'https://example.com/old' };
    const extracted = {
      title: 'Parsed title',
      description: 'Parsed description that is definitely long enough to look complete.',
      link: 'https://example.com/new',
      company: 'Acme',
      source: 'linkedin',
      site: 'linkedin',
    };
    const next = applyExtractedJob(prev, extracted, { title: true, description: true, link: false });
    expect(next.title).toBe('Typed title');
    expect(next.description).toBe('Typed notes');
    expect(next.link).toBe('https://example.com/new');
    expect(next.company).toBe('Acme');
  });

  test('fills empty fields from the extractor', () => {
    const next = applyExtractedJob(
      { title: '', description: '', link: '' },
      { title: 'Role', description: 'Body', link: 'https://example.com/job' },
      {},
    );
    expect(next.title).toBe('Role');
    expect(next.description).toBe('Body');
    expect(next.link).toBe('https://example.com/job');
  });
});

describe('joinBlocks and listingKey', () => {
  test('appends selected sections with a blank line', () => {
    expect(joinBlocks('Responsibilities', 'Requirements')).toBe('Responsibilities\n\nRequirements');
    expect(joinBlocks('', 'Only')).toBe('Only');
  });

  test('includes LinkedIn currentJobId in the listing key', () => {
    expect(listingKey('https://www.linkedin.com/jobs/search/?currentJobId=99')).toBe(
      'https://www.linkedin.com/jobs/search/?job=99',
    );
    expect(listingKey('https://jobs.lever.co/acme/uuid')).toBe('https://jobs.lever.co/acme/uuid');
  });
});
