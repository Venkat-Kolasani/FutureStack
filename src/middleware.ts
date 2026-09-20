import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { assertClerkConfigured, hasUsableClerkServerKeys } from '@/lib/clerk';

assertClerkConfigured();

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

export default hasUsableClerkServerKeys()
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
