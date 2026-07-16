-- Durable, free-tier reminder processing. Opportunity writes enqueue reminder
-- intent transactionally; a separately scheduled dispatcher leases and handles
-- the resulting jobs.

CREATE TABLE IF NOT EXISTS public.notification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL CHECK (job_type IN ('deadline_reminder')),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('deadline_7d', 'deadline_1d')),
    deadline DATE NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    state TEXT NOT NULL DEFAULT 'queued'
        CHECK (state IN ('queued', 'processing', 'completed', 'dead', 'cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lease_token UUID,
    lease_expires_at TIMESTAMPTZ,
    last_error TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_type, opportunity_id, reminder_type, deadline)
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('deadline_7d', 'deadline_1d')),
    deadline DATE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, opportunity_id, notification_type, deadline)
);

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_jobs FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_notifications FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_notification_jobs_dispatch
    ON public.notification_jobs (state, available_at)
    WHERE state IN ('queued', 'processing');
CREATE INDEX IF NOT EXISTS idx_notification_jobs_dead
    ON public.notification_jobs (created_at DESC)
    WHERE state = 'dead';
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
    ON public.user_notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.queue_opportunity_deadline_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NEW.deadline IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
        AND OLD.deadline IS NOT DISTINCT FROM NEW.deadline
        AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        UPDATE public.notification_jobs
        SET state = 'cancelled', updated_at = NOW()
        WHERE opportunity_id = NEW.id
          AND state IN ('queued', 'processing')
          AND deadline IS DISTINCT FROM NEW.deadline;
    END IF;

    INSERT INTO public.notification_jobs (
        job_type,
        user_id,
        opportunity_id,
        reminder_type,
        deadline,
        payload,
        available_at
    )
    VALUES
        (
            'deadline_reminder',
            NEW.user_id,
            NEW.id,
            'deadline_7d',
            NEW.deadline,
            jsonb_build_object('title', NEW.title, 'daysBeforeDeadline', 7),
            GREATEST(NOW(), NEW.deadline::TIMESTAMPTZ - INTERVAL '7 days')
        ),
        (
            'deadline_reminder',
            NEW.user_id,
            NEW.id,
            'deadline_1d',
            NEW.deadline,
            jsonb_build_object('title', NEW.title, 'daysBeforeDeadline', 1),
            GREATEST(NOW(), NEW.deadline::TIMESTAMPTZ - INTERVAL '1 day')
        )
    ON CONFLICT (job_type, opportunity_id, reminder_type, deadline) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_opportunity_deadline_reminders ON public.opportunities;
CREATE TRIGGER queue_opportunity_deadline_reminders
AFTER INSERT OR UPDATE OF deadline, user_id ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.queue_opportunity_deadline_reminders();

-- Backfill only future deadlines; historical rows should not generate surprise
-- notifications when this migration is first deployed.
INSERT INTO public.notification_jobs (
    job_type,
    user_id,
    opportunity_id,
    reminder_type,
    deadline,
    payload,
    available_at
)
SELECT
    'deadline_reminder',
    opportunity.user_id,
    opportunity.id,
    reminder.reminder_type,
    opportunity.deadline,
    jsonb_build_object('title', opportunity.title, 'daysBeforeDeadline', reminder.days_before_deadline),
    GREATEST(NOW(), opportunity.deadline::TIMESTAMPTZ - reminder.days_before_deadline * INTERVAL '1 day')
FROM public.opportunities AS opportunity
CROSS JOIN (VALUES ('deadline_7d', 7), ('deadline_1d', 1))
    AS reminder(reminder_type, days_before_deadline)
WHERE opportunity.deadline >= CURRENT_DATE
ON CONFLICT (job_type, opportunity_id, reminder_type, deadline) DO NOTHING;

CREATE OR REPLACE FUNCTION public.lease_notification_jobs(
    p_limit INTEGER DEFAULT 10,
    p_lease_seconds INTEGER DEFAULT 300
)
RETURNS SETOF public.notification_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    UPDATE public.notification_jobs
    SET state = 'dead',
        last_error = COALESCE(last_error, 'Lease expired after maximum attempts'),
        updated_at = NOW()
    WHERE state = 'processing'
      AND lease_expires_at < NOW()
      AND attempts >= max_attempts;

    RETURN QUERY
    WITH candidates AS (
        SELECT id
        FROM public.notification_jobs
        WHERE attempts < max_attempts
          AND (
              (state = 'queued' AND available_at <= NOW())
              OR (state = 'processing' AND lease_expires_at < NOW())
          )
        ORDER BY available_at ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT LEAST(GREATEST(p_limit, 1), 50)
    )
    UPDATE public.notification_jobs AS job
    SET state = 'processing',
        attempts = job.attempts + 1,
        lease_token = gen_random_uuid(),
        lease_expires_at = NOW() + LEAST(GREATEST(p_lease_seconds, 30), 900) * INTERVAL '1 second',
        updated_at = NOW()
    FROM candidates
    WHERE job.id = candidates.id
    RETURNING job.*;
END;
$$;

REVOKE ALL ON FUNCTION public.lease_notification_jobs(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lease_notification_jobs(INTEGER, INTEGER) TO service_role;
