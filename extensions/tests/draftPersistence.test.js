import { createDraftPersistence } from '../src/lib/draftPersistence.js';

const TAB = { id: 7, url: 'https://example.com/careers?jobId=1' };

describe('createDraftPersistence', () => {
  test('forget waits for an in-flight write, then clears the draft', async () => {
    let releaseSave;
    const saveGate = new Promise((resolve) => {
      releaseSave = resolve;
    });
    let markStarted;
    const started = new Promise((resolve) => {
      markStarted = resolve;
    });
    const events = [];
    const persistence = createDraftPersistence({
      saveDraft: async () => {
        events.push('save-start');
        markStarted();
        await saveGate;
        events.push('save-end');
      },
      clearDraft: async () => {
        events.push('clear');
      },
    });

    const persistDone = persistence.persist(TAB, { title: 'Role' }, { title: true });
    await started;
    const forgetDone = persistence.forget(TAB);
    releaseSave();
    await Promise.all([persistDone, forgetDone]);

    expect(events).toEqual(['save-start', 'save-end', 'clear']);
  });

  test('forget cancels a pending timer so a later save does not recreate the draft', async () => {
    const saved = [];
    const persistence = createDraftPersistence({
      saveDraft: async (_id, _url, payload) => {
        saved.push(payload);
      },
      clearDraft: async () => {
        saved.length = 0;
      },
    });

    persistence.schedulePersist(TAB, { title: 'Draft' }, { title: true }, 20);
    await persistence.forget(TAB);
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(saved).toEqual([]);
  });

  test('persist no-ops after forget until allowPersist', async () => {
    const saved = [];
    const persistence = createDraftPersistence({
      saveDraft: async (_id, _url, payload) => {
        saved.push(payload);
      },
      clearDraft: async () => {},
    });

    await persistence.forget(TAB);
    await persistence.persist(TAB, { title: 'After save' }, { title: true });
    expect(saved).toHaveLength(0);

    persistence.allowPersist();
    await persistence.persist(TAB, { title: 'Edited' }, { title: true });
    expect(saved).toHaveLength(1);
    expect(saved[0].data.title).toBe('Edited');
  });
});
