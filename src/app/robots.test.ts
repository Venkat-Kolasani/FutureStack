import robots, { WORKSPACE_DISALLOW } from './robots';

describe('robots', () => {
  it('allows marketing pages and AI crawlers while disallowing workspace routes', () => {
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
      expect(rule.disallow).toEqual(WORKSPACE_DISALLOW);
    }

    expect(WORKSPACE_DISALLOW).toEqual(expect.arrayContaining([
      '/dashboard',
      '/internships',
      '/hackathons',
      '/add',
      '/edit',
      '/status-board',
      '/calendar',
      '/reports',
      '/analytics',
      '/documents',
      '/notifications',
      '/progress',
    ]));

    expect(result.sitemap).toBe('https://futuretracker.online/sitemap.xml');
  });
});
