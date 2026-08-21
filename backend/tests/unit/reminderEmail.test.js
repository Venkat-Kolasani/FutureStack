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
    clerkId = 'user_clerk_owner',
    missingUser = false,
    deadlineEmailEnabled = true,
    existingDelivery = null,
    insertResult = { error: null },
    updateResult = { error: null },
    userUpdateResult = { error: null },
} = {}) {
    const userLookup = createMaybeSingleChain({
        data: missingUser
            ? null
            : { id: job.user_id, email: email || null, clerk_id: clerkId },
        error: null,
    });
    const preferenceLookup = createMaybeSingleChain({
        data: { deadline_email_enabled: deadlineEmailEnabled },
        error: null,
    });
    const deliveryLookup = createMaybeSingleChain({ data: existingDelivery, error: null });
    const insert = jest.fn(() => Promise.resolve(insertResult));
    const update = jest.fn(() => createUpdateChain(updateResult));
    const userUpdate = jest.fn(() => createUpdateChain(userUpdateResult));

    return {
        supabase: {
            from: jest.fn((table) => {
                if (table === 'users') {
                    return {
                        select: jest.fn(() => userLookup),
                        update: userUpdate,
                    };
                }
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
        userUpdate,
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

    it('resolves a missing stored email from Clerk, backfills it, and sends', async () => {
        const { supabase, insert, update, userUpdate } = createSupabase({ email: null });
        const fetchPrimaryEmail = jest.fn().mockResolvedValue('clerk@example.com');
        const fetchImpl = jest.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'resend-message-clerk' }),
        }));

        const result = await deliverDeadlineReminderEmail(supabase, job, {
            env: enabledEnv,
            fetchImpl,
            fetchPrimaryEmail,
        });

        expect(fetchPrimaryEmail).toHaveBeenCalledWith('user_clerk_owner');
        expect(userUpdate).toHaveBeenCalledWith({ email: 'clerk@example.com' });
        expect(result).toEqual({ status: 'sent', providerMessageId: 'resend-message-clerk' });
        expect(JSON.parse(fetchImpl.mock.calls[0][1].body).to).toEqual(['clerk@example.com']);
        expect(insert).toHaveBeenCalled();
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            state: 'sent',
            provider_message_id: 'resend-message-clerk',
        }));
    });

    it('does not call Clerk when a stored recipient email already exists', async () => {
        const { supabase } = createSupabase();
        const fetchPrimaryEmail = jest.fn();
        const fetchImpl = jest.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'resend-message-1' }),
        }));

        await deliverDeadlineReminderEmail(supabase, job, {
            env: enabledEnv,
            fetchImpl,
            fetchPrimaryEmail,
        });

        expect(fetchPrimaryEmail).not.toHaveBeenCalled();
    });

    it('skips without calling Resend and logs a warning when Clerk also has no email', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const fetchPrimaryEmail = jest.fn().mockResolvedValue(null);
        const fetchImpl = jest.fn();

        try {
            const { supabase, insert } = createSupabase({ email: null });

            await expect(deliverDeadlineReminderEmail(supabase, job, {
                env: enabledEnv,
                fetchImpl,
                fetchPrimaryEmail,
            })).resolves.toEqual({ status: 'skipped_no_recipient' });

            expect(fetchImpl).not.toHaveBeenCalled();
            expect(insert).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy).toHaveBeenCalledWith(
                'Reminder email skipped: no recipient email on file',
                {
                    type: 'REMINDER_EMAIL_SKIPPED_NO_RECIPIENT',
                    jobId: job.id,
                    userId: job.user_id,
                    clerkId: 'user_clerk_owner',
                }
            );
        } finally {
            warnSpy.mockRestore();
        }
    });

    it('retries through the outbox when Clerk lookup fails', async () => {
        const { supabase, insert } = createSupabase({ email: null });
        const fetchPrimaryEmail = jest.fn().mockRejectedValue(new Error('Clerk API unavailable'));

        await expect(deliverDeadlineReminderEmail(supabase, job, {
            env: enabledEnv,
            fetchPrimaryEmail,
        })).rejects.toThrow('Clerk API unavailable');

        expect(insert).not.toHaveBeenCalled();
    });
});
