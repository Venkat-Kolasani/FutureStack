// Tests for page metadata extraction logic

const getMeta = (doc, name) => {
  const el = doc.querySelector(
    `meta[property="${name}"], meta[name="${name}"]`
  );
  return el ? el.content : null;
};

const getPageMetadata = (doc, url) => ({
  title: getMeta(doc, 'og:title') || doc.title,
  description: getMeta(doc, 'og:description') || '',
  link: url,
});

describe('getPageMetadata', () => {
  test('returns og:title when present', () => {
    const doc = {
      title: 'Page Title',
      querySelector: (sel) => {
        if (sel.includes('og:title')) return { content: 'OG Title' };
        return null;
      },
    };
    const result = getPageMetadata(doc, 'https://example.com');
    expect(result.title).toBe('OG Title');
  });

  test('falls back to document.title when og:title missing', () => {
    const doc = {
      title: 'Fallback Title',
      querySelector: () => null,
    };
    const result = getPageMetadata(doc, 'https://example.com');
    expect(result.title).toBe('Fallback Title');
  });

  test('returns og:description when present', () => {
    const doc = {
      title: '',
      querySelector: (sel) => {
        if (sel.includes('og:description')) return { content: 'A description' };
        return null;
      },
    };
    const result = getPageMetadata(doc, 'https://example.com');
    expect(result.description).toBe('A description');
  });

  test('returns empty string when og:description missing', () => {
    const doc = {
      title: '',
      querySelector: () => null,
    };
    const result = getPageMetadata(doc, 'https://example.com');
    expect(result.description).toBe('');
  });

  test('always returns the provided URL as link', () => {
    const doc = {
      title: '',
      querySelector: () => null,
    };
    const result = getPageMetadata(doc, 'https://linkedin.com/jobs/123');
    expect(result.link).toBe('https://linkedin.com/jobs/123');
  });
});