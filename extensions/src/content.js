import { getPageMetadata } from './lib/metadata.js';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'GET_PAGE_METADATA') return false;

  sendResponse(getPageMetadata());
  return false;
});
