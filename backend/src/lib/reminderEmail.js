const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const EMAIL_REQUEST_TIMEOUT_MS = 10_000;

function getReminderEmailConfig(env = process.env) {
    const apiKey = String(env.RESEND_API_KEY || '').trim();
    const from = String(env.REMINDER_EMAIL_FROM || '').trim();

    return {
        enabled: env.REMINDER_EMAILS_ENABLED === 'true' && Boolean(apiKey) && Boolean(from),
        apiKey,
        from,
    };
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildDeadlineReminderEmail(job) {
    const title = String(job.payload?.title || 'your hackathon').slice(0, 200);
    const isTomorrow = job.reminder_type === 'deadline_1d';
    const timing = isTomorrow ? 'tomorrow' : 'in 7 days';
    const subject = `FutureStack reminder: submission deadline ${timing}`;
    const text = `Your submission deadline for ${title} is ${timing} (${job.deadline}).`;

    return {
        subject,
        text,
        html: `<p>Your submission deadline for <strong>${escapeHtml(title)}</strong> is ${timing} (${escapeHtml(job.deadline)}).</p>`,
    };
}

function buildProviderError(response, payload) {
    const message = String(payload?.message || payload?.name || `Resend request failed with status ${response.status}`)
        .slice(0, 500);
    const error = new Error(message);
    error.status = response.status;
    return error;
}

async function findUserEmail(supabase, userId) {
    const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

    if (error) throw error;
    return data?.email || null;
}

async function userWantsDeadlineEmail(supabase, userId) {
    const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('deadline_email_enabled')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    return data?.deadline_email_enabled === true;
}

async function findEmailDelivery(supabase, notificationJobId) {
    const { data, error } = await supabase
        .from('notification_email_deliveries')
        .select('state, provider_message_id')
        .eq('notification_job_id', notificationJobId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

async function createPendingEmailDelivery(supabase, notificationJobId) {
    const { error } = await supabase
        .from('notification_email_deliveries')
        .insert({ notification_job_id: notificationJobId, state: 'pending' });

    if (error && error.code !== '23505') throw error;
    return error?.code === '23505';
}

async function markEmailDelivered(supabase, notificationJobId, providerMessageId) {
    const { error } = await supabase
        .from('notification_email_deliveries')
        .update({
            state: 'sent',
            provider_message_id: providerMessageId,
            last_error: null,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('notification_job_id', notificationJobId)
        .eq('state', 'pending');

    if (error) throw error;
}

async function recordEmailFailure(supabase, notificationJobId, error) {
    const { error: updateError } = await supabase
        .from('notification_email_deliveries')
        .update({
            last_error: String(error?.message || 'Unknown email-delivery error').slice(0, 1000),
            updated_at: new Date().toISOString(),
        })
        .eq('notification_job_id', notificationJobId)
        .eq('state', 'pending');

    if (updateError) {
        console.error('Unable to record reminder email failure:', {
            notificationJobId,
            message: updateError.message,
        });
    }
}

async function sendWithResend({ config, recipientEmail, job, fetchImpl = fetch }) {
    const message = buildDeadlineReminderEmail(job);
    const response = await fetchImpl(RESEND_EMAILS_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `deadline-reminder/${job.id}`,
            'User-Agent': 'FutureStack/1.0 (+https://futuretracker.online)',
        },
        body: JSON.stringify({
            from: config.from,
            to: [recipientEmail],
            subject: message.subject,
            text: message.text,
            html: message.html,
        }),
        signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw buildProviderError(response, payload);
    if (!payload?.id) throw new Error('Resend response did not include an email ID.');

    return payload.id;
}

async function deliverDeadlineReminderEmail(supabase, job, {
    env = process.env,
    fetchImpl = fetch,
} = {}) {
    const config = getReminderEmailConfig(env);
    if (!config.enabled) return { status: 'disabled' };

    const userSelectedEmail = await userWantsDeadlineEmail(supabase, job.user_id);
    if (!userSelectedEmail) {
        return { status: 'disabled_by_user' };
    }

    const recipientEmail = await findUserEmail(supabase, job.user_id);
    if (!recipientEmail) {
        console.warn('Reminder email skipped: no recipient email on file', {
            type: 'REMINDER_EMAIL_SKIPPED_NO_RECIPIENT',
            jobId: job.id,
            userId: job.user_id,
        });
        return { status: 'skipped_no_recipient' };
    }

    let delivery = await findEmailDelivery(supabase, job.id);
    if (delivery?.state === 'sent') return { status: 'already_sent' };

    if (!delivery) {
        const alreadyCreated = await createPendingEmailDelivery(supabase, job.id);
        if (alreadyCreated) {
            delivery = await findEmailDelivery(supabase, job.id);
            if (delivery?.state === 'sent') return { status: 'already_sent' };
            if (!delivery) throw new Error('Email delivery record was not available after a concurrent insert.');
        }
    }

    try {
        const providerMessageId = await sendWithResend({ config, recipientEmail, job, fetchImpl });
        await markEmailDelivered(supabase, job.id, providerMessageId);
        return { status: 'sent', providerMessageId };
    } catch (error) {
        await recordEmailFailure(supabase, job.id, error);
        throw error;
    }
}

module.exports = {
    buildDeadlineReminderEmail,
    deliverDeadlineReminderEmail,
    getReminderEmailConfig,
};
