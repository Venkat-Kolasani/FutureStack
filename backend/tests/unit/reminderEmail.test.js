const {
    buildDeadlineReminderEmail,
    deliverDeadlineReminderEmail,
    getReminderEmailConfig,
} = require('../../src/lib/reminderEmail');

const job = {
    id: '6e945d32-b29f-4675-b3a9-0aa43c0980e1',
    user_id: '2b7045c4-553d-4c3c-9c8e-af9b0b4cc1da',
    reminder_type: 'deadline_1d',
    deadline: '2026-08-01',
    payload: { title: 'AI <Launch> & Demo' },
};

const enabledEnv = {
    REMINDER_EMAILS_ENABLED: 'true',
    RESEND_API_KEY: 're_test_key',
    REMINDER_EMAIL_FROM: 'FutureStack <onboarding@resend.dev>',
};

function createMaybeSingleChain(result) {
    const chain = {
        eq: jest.fn(() => chain),
        maybeSingle: jest.fn(() => Promise.resolve(result)),
    };
    return chain;
}

function createUpdateChain(result = { error: null }) {
    const chain = {
        eq: jest.fn(() => chain),
        then: (resolve) => resolve(result),
    };
    return chain;
}

function createSupabase({
    email = 'owner@example.com',
    deadlineEmailEnabled = true,
    existingDelivery = null,
    insertResult = { error: null },
    updateResult = { error: null },
} = {}) {
    const userLookup = createMaybeSingleChain({ data: email ? { email } : null, error: null });
    const preferenceLookup = createMaybeSingleChain({
        data: { deadline_email_enabled: deadlineEmailEnabled },
        error: null,
    });
    const deliveryLookup = createMaybeSingleChain({ data: existingDelivery, error: null });
    const insert = jest.fn(() => Promise.resolve(insertResult));
    const update = jest.fn(() => createUpdateChain(updateResult));

    return {
        supabase: {
            from: jest.fn((table) => {
                if (table === 'users') return { select: jest.fn(() => userLookup) };
                if (table === 'user_notification_preferences') {
                    return { select: jest.fn(() => preferenceLookup) };
                }
                if (table === 'notification_email_deliveries') {
                    return {
                        select: jest.fn(() => deliveryLookup),
                        insert,
                        update,
                    };
                }
                throw new Error(`Unexpected table: ${table}`);
            }),
        },
        insert,
        update,
    };
}

describe('reminder email delivery', () => {
    it('keeps delivery disabled unless every server-side setting is present', () => {
        expect(getReminderEmailConfig({ REMINDER_EMAILS_ENABLED: 'true' }).enabled).toBe(false);
        expect(getReminderEmailConfig(enabledEnv).enabled).toBe(true);
    });

    it('escapes user-controlled titles in the email HTML', () => {
        const message = buildDeadlineReminderEmail(job);

        expect(message.subject).toBe('FutureStack reminder: submission deadline tomorrow');
        expect(message.html).toContain('AI &lt;Launch&gt; &amp; Demo');
        expect(message.text).toContain('AI <Launch> & Demo');
    });

    it('does not read or write the database when the optional channel is disabled', async () => {
        const { supabase } = createSupabase();

        await expect(deliverDeadlineReminderEmail(supabase, job, { env: {} }))
            .resolves.toEqual({ status: 'disabled' });
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it('sends one idempotent email and persists the provider message ID', async () => {
        const { supabase, insert, update } = createSupabase();
        const fetchImpl = jest.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'resend-message-1' }),
        }));

        const result = await deliverDeadlineReminderEmail(supabase, job, { env: enabledEnv, fetchImpl });

        expect(result).toEqual({ status: 'sent', providerMessageId: 'resend-message-1' });
        expect(insert).toHaveBeenCalledWith({
            notification_job_id: job.id,
            state: 'pending',
        });
        expect(fetchImpl).toHaveBeenCalledWith(
            'https://api.resend.com/emails',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer re_test_key',
                    'Idempotency-Key': `deadline-reminder/${job.id}`,
                    'User-Agent': 'FutureStack/1.0 (+https://futuretracker.online)',
                }),
            })
        );
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            state: 'sent',
            provider_message_id: 'resend-message-1',
        }));
    });

    it('does not read the recipient or call Resend when the user has not opted in', async () => {
        const { supabase, insert } = createSupabase({ deadlineEmailEnabled: false });
        const fetchImpl = jest.fn();

        await expect(deliverDeadlineReminderEmail(supabase, job, { env: enabledEnv, fetchImpl }))
            .resolves.toEqual({ status: 'disabled_by_user' });
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(insert).not.toHaveBeenCalled();
        expect(supabase.from).toHaveBeenCalledWith('user_notification_preferences');
        expect(supabase.from).not.toHaveBeenCalledWith('users');
    });

    it('does not resend a delivery that was already persisted', async () => {
        const { supabase, insert } = createSupabase({
            existingDelivery: { state: 'sent', provider_message_id: 'resend-message-1' },
        });
        const fetchImpl = jest.fn();

        await expect(deliverDeadlineReminderEmail(supabase, job, { env: enabledEnv, fetchImpl }))
            .resolves.toEqual({ status: 'already_sent' });
        expect(insert).not.toHaveBeenCalled();
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('records the provider failure and lets the outbox retry it', async () => {
        const { supabase, update } = createSupabase();
        const fetchImpl = jest.fn(() => Promise.resolve({
            ok: false,
            status: 503,
            json: () => Promise.resolve({ message: 'provider unavailable' }),
        }));

        await expect(deliverDeadlineReminderEmail(supabase, job, { env: enabledEnv, fetchImpl }))
            .rejects.toThrow('provider unavailable');
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            last_error: 'provider unavailable',
        }));
    });

    it('skips without calling Resend and logs a warning when no recipient email exists', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        try {
            const { supabase, insert } = createSupabase({ email: null });
            const fetchImpl = jest.fn();

            await expect(deliverDeadlineReminderEmail(supabase, job, { env: enabledEnv, fetchImpl }))
                .resolves.toEqual({ status: 'skipped_no_recipient' });

            expect(fetchImpl).not.toHaveBeenCalled();
            expect(insert).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledWith(
                'Reminder email skipped: no recipient email on file',
                expect.objectContaining({
                    type: 'REMINDER_EMAIL_SKIPPED_NO_RECIPIENT',
                    jobId: job.id,
                    userId: job.user_id,
                })
            );

            const warnPayload = JSON.stringify(warnSpy.mock.calls);
            expect(warnPayload).not.toContain('@');
        } finally {
            warnSpy.mockRestore();
        }
    });
});
