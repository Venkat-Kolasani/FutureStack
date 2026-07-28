import { getPageMetadata } from './lib/metadata.js';

// Optional legacy entry for message-based scraping.
// Popup now uses chrome.scripting.executeScript({ func }) instead.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'GET_PAGE_METADATA') return false;

  sendResponse(getPageMetadata());
  return false;
});
