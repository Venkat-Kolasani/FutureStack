import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { assertClerkConfigured, hasUsableClerkServerKeys } from '@/lib/clerk';

assertClerkConfigured({
  VERCEL_ENV: process.env.VERCEL_ENV,
  REQUIRE_CLERK: process.env.REQUIRE_CLERK,
  CI: process.env.CI,
  GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
});

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/internships(.*)',
  '/hackathons(.*)',
  '/add(.*)',
  '/edit(.*)',
  '/status-board(.*)',
  '/calendar(.*)',
  '/reports(.*)',
  '/analytics(.*)',
  '/documents(.*)',
  '/notifications(.*)',
  '/progress(.*)',
]);

export default hasUsableClerkServerKeys(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  process.env.CLERK_SECRET_KEY
)
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
