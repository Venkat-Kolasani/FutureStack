-- FutureStack tracks internships after the application is sent. A job-posting
-- close date therefore is not an active deadline; pending interview rounds are.
-- Hackathon submission deadlines remain eligible for reminder delivery.

ALTER TABLE public.opportunities
    ADD COLUMN IF NOT EXISTS applied_on DATE;

-- Existing records predate an explicit applied-on value. Their tracked date is
-- the closest available historical value; users can correct it in the UI.
UPDATE public.opportunities
SET applied_on = created_at::date
WHERE category = 'internship'
  AND applied_on IS NULL;

ALTER TABLE public.opportunity_rounds
    ADD COLUMN IF NOT EXISTS scheduled_time TIME;

CREATE INDEX IF NOT EXISTS idx_opportunity_rounds_upcoming
    ON public.opportunity_rounds (user_id, scheduled_date, scheduled_time)
    WHERE result = 'pending' AND scheduled_date IS NOT NULL;

-- Preserve historical application-close dates already stored on internships,
-- but never allow a new or changed internship deadline to become an event.
CREATE OR REPLACE FUNCTION public.normalize_internship_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NEW.category = 'internship' AND TG_OP = 'INSERT' THEN
        NEW.deadline := NULL;
    ELSIF NEW.category = 'internship'
        AND (
            OLD.category IS DISTINCT FROM NEW.category
            OR OLD.deadline IS DISTINCT FROM NEW.deadline
        ) THEN
        NEW.deadline := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_internship_deadline ON public.opportunities;
CREATE TRIGGER normalize_internship_deadline
BEFORE INSERT OR UPDATE OF deadline, category ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.normalize_internship_deadline();

-- Suppress already-queued application-close reminders for internships without
-- deleting legacy values. They are no longer rendered as active deadlines.
UPDATE public.notification_jobs AS job
SET state = 'cancelled',
    lease_token = NULL,
    lease_expires_at = NULL,
    updated_at = NOW()
FROM public.opportunities AS opportunity
WHERE opportunity.id = job.opportunity_id
  AND opportunity.category = 'internship'
  AND job.state IN ('queued', 'processing');

CREATE OR REPLACE FUNCTION public.queue_opportunity_deadline_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    -- A category change from hackathon to internship invalidates work already
    -- queued for that opportunity. A worker holding the old lease loses its
    -- conditional completion update instead of emitting a stale notification.
    IF TG_OP = 'UPDATE'
        AND (
            OLD.deadline IS DISTINCT FROM NEW.deadline
            OR OLD.user_id IS DISTINCT FROM NEW.user_id
            OR OLD.category IS DISTINCT FROM NEW.category
        ) THEN
        UPDATE public.notification_jobs
        SET state = 'cancelled',
            lease_token = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
        WHERE opportunity_id = NEW.id
          AND state IN ('queued', 'processing');
    END IF;

    IF NEW.category IS DISTINCT FROM 'hackathon' OR NEW.deadline IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
        AND OLD.deadline IS NOT DISTINCT FROM NEW.deadline
        AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id
        AND OLD.category IS NOT DISTINCT FROM NEW.category THEN
        RETURN NEW;
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
    ON CONFLICT (job_type, opportunity_id, reminder_type, deadline) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        payload = EXCLUDED.payload,
        available_at = EXCLUDED.available_at,
        state = 'queued',
        attempts = 0,
        lease_token = NULL,
        lease_expires_at = NULL,
        last_error = NULL,
        completed_at = NULL,
        updated_at = NOW()
    WHERE public.notification_jobs.state IN ('queued', 'cancelled')
       OR public.notification_jobs.user_id IS DISTINCT FROM EXCLUDED.user_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_opportunity_deadline_reminders ON public.opportunities;
CREATE TRIGGER queue_opportunity_deadline_reminders
AFTER INSERT OR UPDATE OF deadline, user_id, category ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.queue_opportunity_deadline_reminders();
