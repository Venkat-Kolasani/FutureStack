import { listingKey } from './extractJob.js';

function storageArea() {
  return chrome.storage?.session ?? chrome.storage.local;
}

export function draftStorageKey(tabId, url) {
  return `ft-draft:${tabId}:${listingKey(url)}`;
}

export async function loadDraft(tabId, url) {
  const key = draftStorageKey(tabId, url);
  try {
    const result = await storageArea().get(key);
    return result?.[key] ?? null;
  } catch (error) {
    console.warn('FutureTracker: could not load draft', error);
    return null;
  }
}

export async function saveDraft(tabId, url, payload) {
  const key = draftStorageKey(tabId, url);
  try {
    await storageArea().set({ [key]: payload });
  } catch (error) {
    console.warn('FutureTracker: could not save draft', error);
  }
}

export async function clearDraft(tabId, url) {
  const key = draftStorageKey(tabId, url);
  try {
    await storageArea().remove(key);
  } catch (error) {
    console.warn('FutureTracker: could not clear draft', error);
  }
}
