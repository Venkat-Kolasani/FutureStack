import { createClerkClient } from '@clerk/chrome-extension/background';
import { CLERK_PUBLISHABLE_KEY, SYNC_HOST } from './lib/clerk.js';

const clerkClient = createClerkClient({
  publishableKey: CLERK_PUBLISHABLE_KEY,
  syncHost: SYNC_HOST,
});

chrome.runtime.onInstalled.addListener(async () => {
  await clerkClient.load();
  console.log('FutureTracker extension installed, Clerk loaded');
});