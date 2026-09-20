import sitemap from './sitemap';

describe('sitemap', () => {
  it('returns clean URLs without .html suffixes', () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(expect.arrayContaining([
      'https://futuretracker.online/',
      'https://futuretracker.online/about',
      'https://futuretracker.online/privacy',
      'https://futuretracker.online/guides/internship-application-tracker',
      'https://futuretracker.online/guides/hackathon-deadline-tracker',
      'https://futuretracker.online/guides/job-tracker-vs-spreadsheet',
      'https://futuretracker.online/llms.txt',
      'https://futuretracker.online/llms-full.txt',
    ]));

    for (const url of urls) {
      expect(url).not.toMatch(/\.html(\?|$)/);
    }
  });
});
