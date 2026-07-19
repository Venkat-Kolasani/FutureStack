import { getPageMetadata } from '../src/lib/metadata.js';

describe('getPageMetadata', () => {
  const url = { href: 'https://linkedin.com/jobs/123' };

  test('returns og:title when present', () => {
    const documentObject = {
      title: 'Page Title',
      querySelector: (selector) => selector.includes('og:title') ? { content: 'OG Title' } : null,
    };
    const result = getPageMetadata(documentObject, url);
    expect(result.title).toBe('OG Title');
  });

  test('falls back to document.title when og:title missing', () => {
    const documentObject = { title: 'Fallback Title', querySelector: () => null };
    const result = getPageMetadata(documentObject, url);
    expect(result.title).toBe('Fallback Title');
  });

  test('returns og:description when present', () => {
    const documentObject = {
      title: '',
      querySelector: (selector) => selector.includes('og:description') ? { content: 'A description' } : null,
    };
    const result = getPageMetadata(documentObject, url);
    expect(result.description).toBe('A description');
  });

  test('returns empty string when og:description missing', () => {
    const result = getPageMetadata({ title: '', querySelector: () => null }, url);
    expect(result.description).toBe('');
  });

  test('returns the current page URL as link', () => {
    const result = getPageMetadata({ title: '', querySelector: () => null }, url);
    expect(result.link).toBe(url.href);
  });
});
