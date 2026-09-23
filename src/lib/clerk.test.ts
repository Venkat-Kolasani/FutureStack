import {
  assertClerkConfigured,
  hasUsableClerkKey,
  hasUsableClerkServerKeys,
  isClerkKey,
  isProductionDeployment,
} from './clerk';

const REAL_PUBLISHABLE = 'pk_test_Y2xlcmsuZXhhbXBsZS5jb20k';
const REAL_SECRET = 'sk_test_Y2xlcmsuZXhhbXBsZS5jb20kc2VjcmV0';

describe('isClerkKey', () => {
  it('accepts a real key with the expected prefix', () => {
    expect(isClerkKey(REAL_PUBLISHABLE, 'pk_')).toBe(true);
    expect(isClerkKey(REAL_SECRET, 'sk_')).toBe(true);
  });

  it('rejects missing keys, wrong prefixes, placeholders, and truncated values', () => {
    expect(isClerkKey(undefined, 'pk_')).toBe(false);
    expect(isClerkKey('', 'pk_')).toBe(false);
    expect(isClerkKey(REAL_SECRET, 'pk_')).toBe(false);
    expect(isClerkKey('pk_test_ci_placeholder', 'pk_')).toBe(false);
    expect(isClerkKey('pk_test_short', 'pk_')).toBe(false);
  });
});

describe('hasUsableClerkKey', () => {
  it('shares the publishable-key rule with the server check', () => {
    expect(hasUsableClerkKey(REAL_PUBLISHABLE)).toBe(true);
    expect(hasUsableClerkKey('pk_test_short')).toBe(false);
  });
});

describe('hasUsableClerkServerKeys', () => {
  it('requires both a publishable and a secret key', () => {
    expect(hasUsableClerkServerKeys(REAL_PUBLISHABLE, REAL_SECRET)).toBe(true);
    expect(hasUsableClerkServerKeys(REAL_PUBLISHABLE, 'sk_test_ci_placeholder')).toBe(false);
    expect(hasUsableClerkServerKeys('pk_test_ci_placeholder', REAL_SECRET)).toBe(false);
  });
});

describe('isProductionDeployment', () => {
  it('only treats a Vercel production deploy or an explicit opt-in as production', () => {
    expect(isProductionDeployment({ VERCEL_ENV: 'production' })).toBe(true);
    expect(isProductionDeployment({ REQUIRE_CLERK: 'true' })).toBe(true);
    expect(isProductionDeployment({ VERCEL_ENV: 'preview' })).toBe(false);
    expect(isProductionDeployment({})).toBe(false);
  });
});

describe('assertClerkConfigured', () => {
  const placeholders = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_ci_placeholder',
    CLERK_SECRET_KEY: 'sk_test_ci_placeholder',
  };

  it('allows placeholder keys for CI and preview builds', () => {
    expect(() => assertClerkConfigured({ ...placeholders })).not.toThrow();
    expect(() => assertClerkConfigured({ ...placeholders, VERCEL_ENV: 'preview' })).not.toThrow();
  });

  it('throws on a production deployment with placeholder keys', () => {
    expect(() =>
      assertClerkConfigured({ ...placeholders, VERCEL_ENV: 'production' })
    ).toThrow(/Clerk is not configured/);
  });

  it('passes on a production deployment with real keys', () => {
    expect(() =>
      assertClerkConfigured({
        VERCEL_ENV: 'production',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: REAL_PUBLISHABLE,
        CLERK_SECRET_KEY: REAL_SECRET,
      })
    ).not.toThrow();
  });
});
