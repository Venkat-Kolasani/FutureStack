import { scrapePageInTab } from './extractJob.js';
import injectPath from './injectExtractJob.js?script';

function scriptFile() {
  return String(injectPath || '').replace(/^\//, '');
}

export function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs?.[0] ?? null);
    });
  });
}

export async function extractFromTab(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [scriptFile()],
      world: 'ISOLATED',
      injectImmediately: true,
    });
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'ISOLATED',
      func: async () => {
        const deadline = Date.now() + 4000;
        while (typeof globalThis.__FT_EXTRACT_JOB__ !== 'function') {
          if (Date.now() > deadline) return null;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        return globalThis.__FT_EXTRACT_JOB__();
      },
    });
    if (results?.[0]?.result) return results[0].result;
  } catch (error) {
    console.warn('FutureTracker: extractor inject failed, using Open Graph fallback', error);
  }

  try {
    const fallback = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'ISOLATED',
      func: scrapePageInTab,
    });
    return fallback?.[0]?.result ?? null;
  } catch (error) {
    console.warn('FutureTracker: could not read page metadata', error);
    return null;
  }
}

export async function getPageSelection(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'ISOLATED',
      func: () => window.getSelection()?.toString() ?? '',
    });
    return String(results?.[0]?.result || '');
  } catch (error) {
    console.warn('FutureTracker: could not read page selection', error);
    return '';
  }
}
