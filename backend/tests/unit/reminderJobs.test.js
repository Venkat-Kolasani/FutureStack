const { dispatchReminderJobs } = require('../../src/lib/reminderJobs');

function createUpdateChain(result = { data: [{ id: 'job-1' }], error: null }) {
    const chain = {
        eq: jest.fn(() => chain),
        select: jest.fn(() => chain),
        then: (resolve) => resolve(result),
    };
    return chain;
}

describe('dispatchReminderJobs', () => {
    const job = {
        id: 'job-1',
        lease_token: 'lease-1',
        user_id: 'user-1',
        opportunity_id: 'opportunity-1',
        reminder_type: 'deadline_7d',
        deadline: '2026-08-01',
        payload: { title: 'Platform Engineer Intern' },
        attempts: 1,
        max_attempts: 3,
    };

    it('persists an idempotent in-app notification and completes the leased job', async () => {
        const notificationUpsert = jest.fn(() => Promise.resolve({ error: null }));
        const jobUpdate = jest.fn(() => createUpdateChain());
        const supabase = {
            rpc: jest.fn(() => Promise.resolve({ data: [job], error: null })),
            from: jest.fn((table) => {
                if (table === 'user_notifications') return { upsert: notificationUpsert };
                if (table === 'notification_jobs') return { update: jobUpdate };
                throw new Error(`Unexpected table: ${table}`);
            }),
        };

        const summary = await dispatchReminderJobs(supabase, {
            now: () => new Date('2026-07-16T00:00:00.000Z'),
        });

        expect(summary).toEqual({ leased: 1, completed: 1, retried: 0, dead: 0 });
        expect(notificationUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-1',
                opportunity_id: 'opportunity-1',
                notification_type: 'deadline_7d',
            }),
            { onConflict: 'user_id,opportunity_id,notification_type,deadline' }
        );
        expect(jobUpdate).toHaveBeenCalledWith(expect.objectContaining({ state: 'completed' }));
    });

    it('does not count or retry a job after its lease is lost', async () => {
        const notificationUpsert = jest.fn(() => Promise.resolve({ error: null }));
        const jobUpdate = jest.fn(() => createUpdateChain({ data: [], error: null }));
        const supabase = {
            rpc: jest.fn(() => Promise.resolve({ data: [job], error: null })),
            from: jest.fn((table) => {
                if (table === 'user_notifications') return { upsert: notificationUpsert };
                if (table === 'notification_jobs') return { update: jobUpdate };
                throw new Error(`Unexpected table: ${table}`);
            }),
        };

        const summary = await dispatchReminderJobs(supabase, {
            now: () => new Date('2026-07-16T00:00:00.000Z'),
        });

        expect(summary).toEqual({ leased: 1, completed: 0, retried: 0, dead: 0 });
        expect(notificationUpsert).toHaveBeenCalledTimes(1);
        expect(jobUpdate).toHaveBeenCalledTimes(1);
        expect(jobUpdate).toHaveBeenCalledWith(expect.objectContaining({ state: 'completed' }));
    });

    it('requeues a failed delivery with bounded exponential backoff', async () => {
        const jobUpdate = jest.fn(() => createUpdateChain());
        const supabase = {
            rpc: jest.fn(() => Promise.resolve({ data: [job], error: null })),
            from: jest.fn((table) => {
                if (table === 'user_notifications') {
                    return { upsert: jest.fn(() => Promise.resolve({ error: new Error('storage unavailable') })) };
                }
                if (table === 'notification_jobs') return { update: jobUpdate };
                throw new Error(`Unexpected table: ${table}`);
            }),
        };

        const summary = await dispatchReminderJobs(supabase, {
            now: () => new Date('2026-07-16T00:00:00.000Z'),
        });

        expect(summary).toEqual({ leased: 1, completed: 0, retried: 1, dead: 0 });
        expect(jobUpdate).toHaveBeenCalledWith(expect.objectContaining({
            state: 'queued',
            available_at: '2026-07-16T00:01:00.000Z',
            last_error: 'storage unavailable',
        }));
    });

    it('requeues when configured email delivery fails after the in-app notification', async () => {
        const notificationUpsert = jest.fn(() => Promise.resolve({ error: null }));
        const jobUpdate = jest.fn(() => createUpdateChain());
        const emailDelivery = jest.fn(() => Promise.reject(new Error('Resend unavailable')));
        const supabase = {
            rpc: jest.fn(() => Promise.resolve({ data: [job], error: null })),
            from: jest.fn((table) => {
                if (table === 'user_notifications') return { upsert: notificationUpsert };
                if (table === 'notification_jobs') return { update: jobUpdate };
                throw new Error(`Unexpected table: ${table}`);
            }),
        };

        const summary = await dispatchReminderJobs(supabase, {
            now: () => new Date('2026-07-16T00:00:00.000Z'),
            emailDelivery,
        });

        expect(summary).toEqual({ leased: 1, completed: 0, retried: 1, dead: 0 });
        expect(notificationUpsert).toHaveBeenCalledTimes(1);
        expect(emailDelivery).toHaveBeenCalledWith(supabase, job);
        expect(jobUpdate).toHaveBeenCalledWith(expect.objectContaining({
            state: 'queued',
            last_error: 'Resend unavailable',
        }));
    });

    it('dead-letters a final failed attempt', async () => {
        const jobUpdate = jest.fn(() => createUpdateChain());
        const terminalJob = { ...job, attempts: 3 };
        const supabase = {
            rpc: jest.fn(() => Promise.resolve({ data: [terminalJob], error: null })),
            from: jest.fn((table) => {
                if (table === 'user_notifications') {
                    return { upsert: jest.fn(() => Promise.resolve({ error: new Error('storage unavailable') })) };
                }
                if (table === 'notification_jobs') return { update: jobUpdate };
                throw new Error(`Unexpected table: ${table}`);
            }),
        };

        const summary = await dispatchReminderJobs(supabase, {
            now: () => new Date('2026-07-16T00:00:00.000Z'),
        });

        expect(summary).toEqual({ leased: 1, completed: 0, retried: 0, dead: 1 });
        expect(jobUpdate).toHaveBeenCalledWith(expect.objectContaining({
            state: 'dead',
            last_error: 'storage unavailable',
        }));
    });
});
