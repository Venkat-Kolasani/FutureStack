import { createClerkClient } from '@clerk/chrome-extension/background';
import { CLERK_PUBLISHABLE_KEY, SYNC_HOST } from './lib/clerk.js';

const clerkClient = createClerkClient({
  publishableKey: CLERK_PUBLISHABLE_KEY,
  syncHost: SYNC_HOST,
});

async function initClerk() {
  try {
    await clerkClient.load();
    console.log('FutureTracker: Clerk loaded');
  } catch (err) {
    console.error('FutureTracker: Clerk failed to load', err);
  }
}

initClerk();