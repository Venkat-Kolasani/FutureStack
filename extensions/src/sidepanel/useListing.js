import { useCallback, useEffect, useRef, useState } from 'react';
import { applyExtractedJob, joinBlocks, listingKey } from '../lib/extractJob.js';
import { loadDraft } from '../lib/draft.js';
import { createDraftPersistence } from '../lib/draftPersistence.js';
import { extractFromTab, getActiveTab, getPageSelection } from '../lib/tab.js';

const EMPTY_FORM = {
  title: '',
  description: '',
  link: '',
  company: '',
  location: '',
  site: '',
  source: '',
  category: 'internship',
  status: 'applied',
  campus_mode: '',
};

const EMPTY_DIRTY = {
  title: false,
  description: false,
  link: false,
};

function emptyDirty() {
  return { ...EMPTY_DIRTY };
}

function sameListing(current, nextTab) {
  if (!current?.id || current.id !== nextTab?.id) return false;
  return listingKey(current.url || '') === listingKey(nextTab.url || '');
}

export function useListing() {
  const [tab, setTab] = useState(null);
  const [data, setData] = useState(EMPTY_FORM);
  const [dirty, setDirty] = useState(emptyDirty);
  const [metadataState, setMetadataState] = useState('loading');
  const [selectionMessage, setSelectionMessage] = useState('');
  const tabRef = useRef(null);
  const dataRef = useRef(data);
  const dirtyRef = useRef(dirty);
  const windowIdRef = useRef(null);
  const generationRef = useRef(0);
  const persistenceRef = useRef(null);
  if (!persistenceRef.current) {
    persistenceRef.current = createDraftPersistence();
  }
  const persistence = persistenceRef.current;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const loadListing = useCallback(async (nextTab) => {
    if (!nextTab?.id) {
      setMetadataState('idle');
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const keepInMemory = sameListing(tabRef.current, nextTab);

    tabRef.current = nextTab;
    setTab(nextTab);
    setSelectionMessage('');
    setMetadataState('loading');

    if (!keepInMemory) {
      persistence.allowPersist();
      const draft = await loadDraft(nextTab.id, nextTab.url || '');
      if (generation !== generationRef.current) return;
      const restored = {
        ...EMPTY_FORM,
        link: nextTab.url || '',
        ...(draft?.data || {}),
      };
      const restoredDirty = { ...emptyDirty(), ...(draft?.dirty || {}) };
      setData(restored);
      setDirty(restoredDirty);
      dataRef.current = restored;
      dirtyRef.current = restoredDirty;
    }

    const extracted = await extractFromTab(nextTab.id);
    if (generation !== generationRef.current) return;

    const merged = applyExtractedJob(
      dataRef.current,
      {
        ...(extracted || {}),
        link: extracted?.link || nextTab.url || dataRef.current.link,
      },
      dirtyRef.current,
    );
    setData(merged);
    dataRef.current = merged;
    persistence.persist(nextTab, merged, dirtyRef.current);
    setMetadataState(extracted ? 'idle' : 'unread');
  }, [persistence]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const active = await getActiveTab();
      if (cancelled || !active) {
        setMetadataState('idle');
        return;
      }
      windowIdRef.current = active.windowId ?? null;
      await loadListing(active);
    })();

    const onActivated = (info) => {
      if (windowIdRef.current != null && info.windowId !== windowIdRef.current) return;
      chrome.tabs.get(info.tabId, (nextTab) => {
        if (chrome.runtime.lastError || !nextTab) return;
        loadListing(nextTab);
      });
    };

    const onUpdated = (tabId, changeInfo, updatedTab) => {
      if (tabId !== tabRef.current?.id) return;
      if (changeInfo.status === 'complete' || changeInfo.url) {
        loadListing(updatedTab || tabRef.current);
      }
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);

    return () => {
      cancelled = true;
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [loadListing]);

  useEffect(() => {
    if (!tab?.id || metadataState === 'loading') return undefined;
    persistence.schedulePersist(tab, data, dirty);
    return () => persistence.cancelTimer();
  }, [tab, data, dirty, metadataState, persistence]);

  function updateField(name, value) {
    persistence.allowPersist();
    setData((prev) => {
      const next = { ...prev, [name]: value };
      dataRef.current = next;
      return next;
    });
    if (name in EMPTY_DIRTY) {
      setDirty((prev) => {
        const next = { ...prev, [name]: true };
        dirtyRef.current = next;
        return next;
      });
    }
    setSelectionMessage('');
  }

  async function applySelection(field, mode = 'replace') {
    const active = tabRef.current;
    if (!active?.id) {
      setSelectionMessage('Open a job listing tab first.');
      return false;
    }

    const selected = (await getPageSelection(active.id)).trim();
    if (!selected) {
      setSelectionMessage('Select text on the page, then try again.');
      return false;
    }

    if (mode === 'append') {
      updateField(field, joinBlocks(dataRef.current[field], selected));
    } else {
      updateField(field, selected);
    }
    setSelectionMessage('Added from the page selection.');
    return true;
  }

  async function reread() {
    const active = await getActiveTab();
    if (!active) return;
    await loadListing(active);
  }

  async function forgetDraft() {
    await persistence.forget(tabRef.current || tab);
  }

  return {
    tab,
    data,
    dirty,
    metadataState,
    selectionMessage,
    updateField,
    applySelection,
    reread,
    forgetDraft,
  };
}
