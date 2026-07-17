-- Follow-up safeguards for the July 16 system-design migrations.
-- This is intentionally forward-only: deployments that already applied the
-- original migrations can apply it safely in timestamp order.

-- Backfill before enforcing the invariant so existing data cannot block the
-- constraint. The mutation functions also preserve this invariant atomically.
UPDATE public.brainstorm_ideas
SET vote_count = GREATEST(COALESCE(vote_count, 0), 0)
WHERE vote_count IS NULL OR vote_count < 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'brainstorm_ideas_vote_count_nonnegative'
          AND conrelid = 'public.brainstorm_ideas'::regclass
    ) THEN
        ALTER TABLE public.brainstorm_ideas
            ADD CONSTRAINT brainstorm_ideas_vote_count_nonnegative
            CHECK (vote_count >= 0);
    END IF;
END;
$$;

-- Deletion must verify that the idea is in the team already authorized by the
-- API. This keeps a malformed cross-team function call from deleting a vote.
CREATE OR REPLACE FUNCTION public.remove_idea_vote(
    p_idea_id UUID,
    p_team_id UUID,
    p_user_id UUID
)
RETURNS TABLE (idea_id UUID, vote_count INTEGER, removed BOOLEAN)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    deleted_rows INTEGER;
BEGIN
    DELETE FROM public.idea_votes AS vote
    USING public.brainstorm_ideas AS idea
    WHERE vote.idea_id = p_idea_id
      AND vote.user_id = p_user_id
      AND idea.id = vote.idea_id
      AND idea.team_id = p_team_id;

    GET DIAGNOSTICS deleted_rows = ROW_COUNT;

    IF deleted_rows > 0 THEN
        RETURN QUERY
        UPDATE public.brainstorm_ideas AS idea
        SET vote_count = GREATEST(idea.vote_count - 1, 0)
        WHERE idea.id = p_idea_id AND idea.team_id = p_team_id
        RETURNING idea.id, idea.vote_count, TRUE;
    ELSE
        RETURN QUERY
        SELECT idea.id, idea.vote_count, FALSE
        FROM public.brainstorm_ideas AS idea
        WHERE idea.id = p_idea_id AND idea.team_id = p_team_id;
    END IF;
END;
$$;

-- The dead-job admin query orders by the last state transition, not original
-- creation time. Recreate the partial index because PostgreSQL cannot change
-- an index's sort key in place.
DROP INDEX IF EXISTS public.idx_notification_jobs_dead;
CREATE INDEX idx_notification_jobs_dead
    ON public.notification_jobs (updated_at DESC)
    WHERE state = 'dead';

-- Cancel stale work before returning for a NULL deadline. A changed owner also
-- invalidates queued/leased work; a worker with the former lease then loses its
-- conditional state update instead of notifying the wrong user.
CREATE OR REPLACE FUNCTION public.queue_opportunity_deadline_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE'
        AND (
            OLD.deadline IS DISTINCT FROM NEW.deadline
            OR OLD.user_id IS DISTINCT FROM NEW.user_id
        ) THEN
        UPDATE public.notification_jobs
        SET state = 'cancelled',
            lease_token = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
        WHERE opportunity_id = NEW.id
          AND state IN ('queued', 'processing');
    END IF;

    IF NEW.deadline IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
        AND OLD.deadline IS NOT DISTINCT FROM NEW.deadline
        AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id THEN
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

-- An invite can update an editor or viewer role, but it must never downgrade
-- an existing owner. Return the effective persisted role to the API.
CREATE OR REPLACE FUNCTION public.accept_team_invite(
    p_token_hash TEXT,
    p_user_id UUID
)
RETURNS TABLE (
    team_id UUID,
    opportunity_id UUID,
    role TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    invite_row public.team_invites%ROWTYPE;
BEGIN
    SELECT *
    INTO invite_row
    FROM public.team_invites
    WHERE token_hash = p_token_hash
      AND accepted_at IS NULL
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    INSERT INTO public.team_memberships (team_id, user_id, role, invited_by)
    VALUES (invite_row.team_id, p_user_id, invite_row.role, invite_row.invited_by)
    ON CONFLICT (team_id, user_id) DO UPDATE
    SET role = CASE
            WHEN public.team_memberships.role = 'owner' THEN public.team_memberships.role
            ELSE EXCLUDED.role
        END,
        invited_by = EXCLUDED.invited_by,
        accepted_at = NOW();

    UPDATE public.team_invites
    SET accepted_at = NOW(),
        accepted_by = p_user_id
    WHERE id = invite_row.id;

    RETURN QUERY
    SELECT invite_row.team_id, team.opportunity_id, membership.role
    FROM public.hackathon_teams AS team
    JOIN public.team_memberships AS membership
        ON membership.team_id = team.id
       AND membership.user_id = p_user_id
    WHERE team.id = invite_row.team_id;
END;
$$;
