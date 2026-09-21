#!/usr/bin/env node
/**
 * Fetch public Next.js routes and assert SEO markers on the raw HTML.
 * Does not execute JavaScript in a browser.
 */
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.SEO_SMOKE_PORT || '4310';
const BASE = `http://127.0.0.1:${PORT}`;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function countMatches(html, pattern) {
  const matches = html.match(pattern);
  return matches ? matches.length : 0;
}

function attr(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : null;
}

async function fetchUrl(urlPath, { redirect = 'manual' } = {}) {
  const response = await fetch(`${BASE}${urlPath}`, { redirect });
  const body = await response.text();
  return { status: response.status, headers: response.headers, body };
}

function assertPublicPage(name, html, { canonical, h1, copy }) {
  if (countMatches(html, /<h1[\s>]/gi) !== 1) {
    fail(`${name}: expected exactly one <h1>, found ${countMatches(html, /<h1[\s>]/gi)}`);
  }
  const title = attr(html, /<title>([^<]+)<\/title>/i);
  if (!title) fail(`${name}: missing <title>`);
  const description = attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || attr(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  if (!description) fail(`${name}: missing meta description`);
  const canonicalHref = attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || attr(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (!canonicalHref || !canonicalHref.includes(canonical)) {
    fail(`${name}: expected canonical containing ${canonical}, got ${canonicalHref}`);
  }
  for (const property of ['og:title', 'og:description', 'og:image', 'og:url']) {
    const hasOg = html.includes(`property="${property}"`) || html.includes(`property='${property}'`);
    if (!hasOg) fail(`${name}: missing ${property}`);
  }
  const jsonBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (jsonBlocks.length === 0) {
    fail(`${name}: missing JSON-LD`);
  }
  for (const [, raw] of jsonBlocks) {
    try {
      JSON.parse(raw);
    } catch (error) {
      fail(`${name}: invalid JSON-LD (${error.message})`);
    }
  }
  if (h1 && !html.includes(h1)) fail(`${name}: missing h1 text ${h1}`);
  if (copy && !html.includes(copy)) fail(`${name}: missing feature copy ${copy}`);
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tryOnce = () => {
      const req = http.get(`${BASE}/`, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - started > 60000) {
          reject(new Error('Timed out waiting for next start'));
          return;
        }
        setTimeout(tryOnce, 500);
      });
    };
    tryOnce();
  });
}

async function main() {
  console.log('Building Next.js app for SEO smoke…');
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'build'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_ci_placeholder',
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'sk_test_ci_placeholder',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
      },
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build exited ${code}`))));
  });

  const server = spawn('npx', ['next', 'start', '-p', PORT, '-H', '127.0.0.1'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_ci_placeholder',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'sk_test_ci_placeholder',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    },
  });

  const shutdown = () => {
    if (!server.killed) {
      server.kill('SIGTERM');
    }
  };
  process.on('exit', shutdown);

  try {
    await waitForServer();

    const landing = await fetchUrl('/');
    if (landing.status !== 200) fail(`landing status ${landing.status}`);
    assertPublicPage('landing', landing.body, {
      canonical: 'futuretracker.online',
      h1: 'Build Your Future',
      copy: 'Application Tracker',
    });

    const about = await fetchUrl('/about');
    if (about.status !== 200) fail(`about status ${about.status}`);
    assertPublicPage('about', about.body, {
      canonical: '/about',
      h1: 'Built for the messy middle',
    });

    const privacy = await fetchUrl('/privacy');
    if (privacy.status !== 200) fail(`privacy status ${privacy.status}`);
    assertPublicPage('privacy', privacy.body, {
      canonical: '/privacy',
      h1: 'How FutureTracker.online handles your data',
    });

    const guide = await fetchUrl('/guides/internship-application-tracker');
    if (guide.status !== 200) fail(`guide status ${guide.status}`);
    assertPublicPage('guide', guide.body, {
      canonical: '/guides/internship-application-tracker',
      h1: 'Internship application tracker',
    });

    const sitemap = await fetchUrl('/sitemap.xml');
    if (sitemap.status !== 200) fail(`sitemap status ${sitemap.status}`);
    const sitemapType = sitemap.headers.get('content-type') || '';
    if (!sitemapType.includes('xml') && !sitemap.body.includes('<urlset')) {
      fail(`sitemap content-type ${sitemapType}`);
    }

    const robots = await fetchUrl('/robots.txt');
    if (robots.status !== 200) fail(`robots status ${robots.status}`);
    if (!/GPTBot/i.test(robots.body) || !robots.body.includes('sitemap.xml')) {
      fail('robots.txt missing AI crawler allow or sitemap');
    }
    if (!robots.body.includes('Disallow: /dashboard') || !robots.body.includes('Disallow: /progress')) {
      fail('robots.txt should disallow authenticated workspace paths');
    }

    const dashboard = await fetchUrl('/dashboard', { redirect: 'manual' });
    const dashboardBody = dashboard.body || '';
    const dashboardNoindex =
      /noindex/i.test(dashboardBody) || dashboard.status === 307 || dashboard.status === 302;
    if (!dashboardNoindex) {
      fail(`dashboard should be noindex or auth-redirected, got ${dashboard.status}`);
    }

    const legacy = await fetchUrl('/about.html', { redirect: 'manual' });
    if (legacy.status !== 308 && legacy.status !== 307 && legacy.status !== 301) {
      fail(`about.html should redirect, got ${legacy.status}`);
    }
    const location = legacy.headers.get('location') || '';
    if (!location.endsWith('/about')) {
      fail(`about.html redirect location ${location}`);
    }
  } finally {
    shutdown();
  }

  if (process.exitCode) {
    console.error('SEO smoke failed.');
    process.exit(process.exitCode);
  }
  console.log('SEO smoke passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
