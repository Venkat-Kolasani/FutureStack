import { MAX_LINK, describeLinkError, sanitizeLink } from '../src/lib/opportunityFields.js';

describe('sanitizeLink', () => {
  test('accepts http and https URLs', () => {
    expect(sanitizeLink('https://jobs.lever.co/acme/uuid')).toBe('https://jobs.lever.co/acme/uuid');
    expect(sanitizeLink(' http://localhost:3000/internships ')).toBe('http://localhost:3000/internships');
  });

  test('rejects empty, invalid, and non-http URLs', () => {
    expect(sanitizeLink('')).toBeNull();
    expect(sanitizeLink('not a url')).toBeNull();
    expect(sanitizeLink('javascript:alert(1)')).toBeNull();
  });

  test('does not strip query parameters from an oversized URL', () => {
    const query = `https://example.com/jobs?id=${'x'.repeat(MAX_LINK)}`;
    expect(query.length).toBeGreaterThan(MAX_LINK);
    expect(sanitizeLink(query)).toBeNull();
  });
});

describe('describeLinkError', () => {
  test('allows a missing link', () => {
    expect(describeLinkError('')).toBeNull();
    expect(describeLinkError('   ')).toBeNull();
    expect(describeLinkError(null)).toBeNull();
  });

  test('explains invalid and oversized links', () => {
    expect(describeLinkError('not a url')).toMatch(/valid page URL/i);
    expect(describeLinkError('ftp://example.com/job')).toMatch(/http or https/i);
    expect(describeLinkError(`https://example.com/jobs?id=${'x'.repeat(MAX_LINK)}`)).toMatch(/500 characters/i);
  });
});
