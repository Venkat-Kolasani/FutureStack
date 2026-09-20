import { createClerkClient } from '@clerk/chrome-extension/background';
import { CLERK_PUBLISHABLE_KEY, SYNC_HOST } from './lib/clerk.js';

function enableSidePanelOnActionClick() {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => {
      console.warn('FutureTracker: could not bind the toolbar icon to the side panel', error);
    });
}

enableSidePanelOnActionClick();
chrome.runtime.onInstalled.addListener(enableSidePanelOnActionClick);

async function initClerk() {
  try {
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
