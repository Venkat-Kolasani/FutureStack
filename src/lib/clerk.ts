export const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

/**
 * CI and local builds run without real Clerk credentials, so the app renders a
 * signed-out shell instead of crashing during prerender. Production must never
 * take that path: `assertClerkConfigured` fails the build rather than shipping
 * an app whose auth middleware silently becomes a no-op.
 */
export function isClerkKey(key: string | undefined, prefix: 'pk_' | 'sk_'): boolean {
  if (!key || !key.startsWith(prefix)) return false;
  if (key.includes('placeholder')) return false;
  return key.length > 20;
}

export function hasUsableClerkKey(key: string = clerkPublishableKey): boolean {
  return isClerkKey(key, 'pk_');
}

export function hasUsableClerkServerKeys(
  publishableKey: string | undefined = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey: string | undefined = process.env.CLERK_SECRET_KEY
): boolean {
  return isClerkKey(publishableKey, 'pk_') && isClerkKey(secretKey, 'sk_');
}

/**
 * `NODE_ENV` is always "production" during `next build`, including in CI, so it cannot
 * distinguish a real deployment. Missing Clerk config must fail closed on ordinary hosts.
 * Opt-outs are CI, `next dev`, and Vercel preview/development. `REQUIRE_CLERK=true`
 * and `VERCEL_ENV=production` still force the production check.
 */
export type ClerkEnv = {
  [key: string]: string | undefined;
  VERCEL_ENV?: string;
  REQUIRE_CLERK?: string;
  CI?: string;
  GITHUB_ACTIONS?: string;
  NODE_ENV?: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
};

export function isProductionDeployment(env: ClerkEnv = process.env): boolean {
  if (env.REQUIRE_CLERK === 'true' || env.VERCEL_ENV === 'production') {
    return true;
  }
  if (env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'development') {
    return false;
  }
  if (env.CI === 'true' || env.GITHUB_ACTIONS === 'true') {
    return false;
  }
  if (env.NODE_ENV === 'development') {
    return false;
  }
  return true;
}

export function assertClerkConfigured(env: ClerkEnv = process.env): void {
  const publishableKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = env.CLERK_SECRET_KEY;
  const publishableUsable = isClerkKey(publishableKey, 'pk_');
  const secretUsable = isClerkKey(secretKey, 'sk_');

  if (publishableUsable && !secretUsable) {
    throw new Error(
      'Clerk publishable key is set without a usable CLERK_SECRET_KEY. ' +
        'Refusing to start because Clerk UI would be active without auth.protect().'
    );
  }

  if (!isProductionDeployment(env)) return;
  if (hasUsableClerkServerKeys(publishableKey, secretKey)) return;

  throw new Error(
    'Clerk is not configured for a production deployment. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and ' +
      'CLERK_SECRET_KEY to real values; placeholder keys disable authentication middleware.'
  );
}
