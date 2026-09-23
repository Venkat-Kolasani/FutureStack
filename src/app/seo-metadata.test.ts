import { metadata as landingMetadata } from './(marketing)/page';
import { metadata as aboutMetadata } from './(marketing)/about/page';
import { metadata as privacyMetadata } from './(marketing)/privacy/page';
import { generateMetadata as generateGuideMetadata } from './(marketing)/guides/[slug]/page';
import { noIndexMetadata } from '@/lib/seo';

describe('route metadata', () => {
  it('marks authenticated app routes as noindex without inheriting a homepage canonical', () => {
    const dashboard = noIndexMetadata('Dashboard');
    expect(dashboard.robots).toEqual({ index: false, follow: false });
    expect(dashboard.alternates?.canonical).toBeNull();
    expect(noIndexMetadata('Internships').robots).toEqual({ index: false, follow: false });
    expect(noIndexMetadata('Shared progress').robots).toEqual({ index: false, follow: false });
  });

  it('gives marketing routes indexable titles, descriptions, and canonicals', () => {
    expect(landingMetadata.alternates?.canonical).toBe('/');
    expect(landingMetadata.robots).toEqual({ index: true, follow: true });
    expect(landingMetadata.alternates?.types?.['text/plain']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: '/llms.txt' }),
        expect.objectContaining({ url: '/llms-full.txt' }),
      ])
    );
    expect(String(landingMetadata.description).length).toBeGreaterThan(20);
    expect(String(landingMetadata.description).length).toBeLessThanOrEqual(160);

    expect(String(aboutMetadata.title)).toMatch(/About/);
    expect(aboutMetadata.alternates?.canonical).toBe('/about');
    expect(aboutMetadata.alternates?.types?.['text/plain']).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: '/llms.txt' })])
    );
    expect(String(aboutMetadata.description).length).toBeLessThanOrEqual(160);

    expect(String(privacyMetadata.title)).toMatch(/Privacy/);
    expect(privacyMetadata.alternates?.canonical).toBe('/privacy');
    expect(String(privacyMetadata.description).length).toBeLessThanOrEqual(160);
  });

  it('noindexes unknown guide slugs instead of inheriting marketing metadata', async () => {
    const metadata = await generateGuideMetadata({
      params: Promise.resolve({ slug: 'not-a-real-guide' }),
    });
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates?.canonical).toBeNull();
    expect(String(metadata.title)).toMatch(/Guide not found/i);
  });
});
