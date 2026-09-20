import { clearDraft, saveDraft } from './draft.js';

export function createDraftPersistence({
  saveDraft: save = saveDraft,
  clearDraft: clear = clearDraft,
} = {}) {
  let timer = null;
  let queue = Promise.resolve();
  let epoch = 0;
  let suppress = false;

  function enqueue(task) {
    const run = queue.then(task, task);
    queue = run.then(() => undefined, () => undefined);
    return run;
  }

  function persist(tab, data, dirty) {
    if (suppress || !tab?.id || !tab.url) return Promise.resolve();
    const scheduledEpoch = epoch;
    return enqueue(async () => {
      if (suppress || scheduledEpoch !== epoch) return;
      await save(tab.id, tab.url, {
        data,
        dirty,
        savedAt: Date.now(),
      });
    });
  }

  function cancelTimer() {
    if (timer == null) return;
    clearTimeout(timer);
    timer = null;
  }

  function schedulePersist(tab, data, dirty, delayMs = 300) {
    cancelTimer();
    if (suppress || !tab?.id || !tab.url) return;
    timer = setTimeout(() => {
      timer = null;
      persist(tab, data, dirty);
    }, delayMs);
  }

  function allowPersist() {
    suppress = false;
  }

  async function forget(tab) {
    cancelTimer();
    epoch += 1;
    suppress = true;
    await queue;
    if (tab?.id) await clear(tab.id, tab.url || '');
  }

  return {
    persist,
    schedulePersist,
    cancelTimer,
    allowPersist,
    forget,
  };
}
