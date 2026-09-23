import robots from './robots';

describe('robots', () => {
  it('allows AI crawlers and points at the sitemap', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const agents = rules.map((rule) => rule.userAgent);

    expect(agents).toEqual(expect.arrayContaining([
      '*',
      'GPTBot',
      'ChatGPT-User',
      'ClaudeBot',
      'anthropic-ai',
      'PerplexityBot',
      'Google-Extended',
    ]));

    for (const rule of rules) {
      expect(rule.allow).toBe('/');
    }

    expect(result.sitemap).toBe('https://futuretracker.online/sitemap.xml');
  });
});
