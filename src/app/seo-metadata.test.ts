import { metadata as landingMetadata } from './(marketing)/page';
import { metadata as aboutMetadata } from './(marketing)/about/page';
import { metadata as privacyMetadata } from './(marketing)/privacy/page';
import { noIndexMetadata } from '@/lib/seo';

describe('route metadata', () => {
  it('marks authenticated app routes as noindex', () => {
    expect(noIndexMetadata('Dashboard').robots).toEqual({ index: false, follow: false });
    expect(noIndexMetadata('Internships').robots).toEqual({ index: false, follow: false });
    expect(noIndexMetadata('Shared progress').robots).toEqual({ index: false, follow: false });
  });

  it('gives marketing routes indexable titles, descriptions, and canonicals', () => {
    expect(landingMetadata.alternates?.canonical).toBe('/');
    expect(landingMetadata.robots).toEqual({ index: true, follow: true });
    expect(String(landingMetadata.description).length).toBeGreaterThan(20);
    expect(String(landingMetadata.description).length).toBeLessThanOrEqual(160);

    expect(String(aboutMetadata.title)).toMatch(/About/);
    expect(aboutMetadata.alternates?.canonical).toBe('/about');
    expect(String(aboutMetadata.description).length).toBeLessThanOrEqual(160);

    expect(String(privacyMetadata.title)).toMatch(/Privacy/);
    expect(privacyMetadata.alternates?.canonical).toBe('/privacy');
    expect(String(privacyMetadata.description).length).toBeLessThanOrEqual(160);
  });
});
