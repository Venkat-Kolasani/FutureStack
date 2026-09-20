import { extractJob } from './lib/extractJob.js';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'GET_PAGE_METADATA') return false;
  sendResponse(extractJob(document, window.location));
  return false;
});
