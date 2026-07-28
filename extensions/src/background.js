import { createClerkClient } from '@clerk/chrome-extension/background';
import { CLERK_PUBLISHABLE_KEY, SYNC_HOST } from './lib/clerk.js';

async function initClerk() {
  try {
    // createClerkClient from /background returns Promise<Clerk> (load is already invoked)
    await createClerkClient({
      publishableKey: CLERK_PUBLISHABLE_KEY,
      syncHost: SYNC_HOST,
      __experimental_syncHostListener: true,
    });
    console.log('FutureTracker: Clerk loaded');
  } catch (err) {
    console.error('FutureTracker: Clerk failed to load', err);
  }
}

initClerk();