const MAX_BATCH_SIZE = 50;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_LEASE_SECONDS = 300;

function toSafeErrorMessage(error) {
    return String(error?.message || 'Unknown reminder-delivery error').slice(0, 1000);
}

function buildDeadlineNotification(job) {
    const title = String(job.payload?.title || 'opportunity').slice(0, 200);
    const isTomorrow = job.reminder_type === 'deadline_1d';

    return {
        user_id: job.user_id,
        opportunity_id: job.opportunity_id,
        notification_type: job.reminder_type,
        deadline: job.deadline,
        title: isTomorrow ? 'Deadline tomorrow' : 'Deadline in 7 days',
        body: `Your deadline for ${title} is ${isTomorrow ? 'tomorrow' : 'in 7 days'}.`,
    };
}

function retryDelayMs(attempt) {
    return Math.min(60 * 60 * 1000, 60 * 1000 * (2 ** Math.max(0, attempt - 1)));
}

async function updateLeasedJob(supabase, job, update) {
    const { error } = await supabase
        .from('notification_jobs')
        .update(update)
        .eq('id', job.id)
        .eq('lease_token', job.lease_token)
        .eq('state', 'processing');

    if (error) throw error;
}

async function dispatchReminderJobs(supabase, {
    limit = DEFAULT_BATCH_SIZE,
    leaseSeconds = DEFAULT_LEASE_SECONDS,
    now = () => new Date(),
} = {}) {
    const safeLimit = Math.min(Math.max(limit, 1), MAX_BATCH_SIZE);
    const { data: jobs, error: leaseError } = await supabase.rpc('lease_notification_jobs', {
        p_limit: safeLimit,
        p_lease_seconds: leaseSeconds,
    });

    if (leaseError) throw leaseError;

    const summary = { leased: (jobs || []).length, completed: 0, retried: 0, dead: 0 };

    for (const job of jobs || []) {
        try {
            const notification = buildDeadlineNotification(job);
            const { error: notificationError } = await supabase
                .from('user_notifications')
                .upsert(notification, {
                    onConflict: 'user_id,opportunity_id,notification_type,deadline',
                });

            if (notificationError) throw notificationError;

            await updateLeasedJob(supabase, job, {
                state: 'completed',
                completed_at: now().toISOString(),
                lease_token: null,
                lease_expires_at: null,
                last_error: null,
                updated_at: now().toISOString(),
            });
            summary.completed += 1;
        } catch (error) {
            const isTerminal = job.attempts >= job.max_attempts;
            const update = isTerminal
                ? {
                    state: 'dead',
                    lease_token: null,
                    lease_expires_at: null,
                    last_error: toSafeErrorMessage(error),
                    updated_at: now().toISOString(),
                }
                : {
                    state: 'queued',
                    available_at: new Date(now().getTime() + retryDelayMs(job.attempts)).toISOString(),
                    lease_token: null,
                    lease_expires_at: null,
                    last_error: toSafeErrorMessage(error),
                    updated_at: now().toISOString(),
                };

            await updateLeasedJob(supabase, job, update);
            if (isTerminal) summary.dead += 1;
            else summary.retried += 1;
        }
    }

    return summary;
}

module.exports = {
    DEFAULT_BATCH_SIZE,
    DEFAULT_LEASE_SECONDS,
    dispatchReminderJobs,
};
