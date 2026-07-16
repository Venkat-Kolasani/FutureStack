-- Records successful provider email delivery separately from the reminder job.
-- The job remains the durable unit of work; this table prevents a completed
-- job from being emailed again after a worker retry or restart.

CREATE TABLE IF NOT EXISTS public.notification_email_deliveries (
    notification_job_id UUID PRIMARY KEY
        REFERENCES public.notification_jobs(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'pending'
        CHECK (state IN ('pending', 'sent')),
    provider_message_id TEXT,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (state <> 'sent' OR provider_message_id IS NOT NULL)
);

ALTER TABLE public.notification_email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_email_deliveries FROM anon, authenticated;
