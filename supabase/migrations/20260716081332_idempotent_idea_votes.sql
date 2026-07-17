-- Database-enforced, one-vote-per-user idea voting.
-- Existing aggregate vote totals are preserved as historical counts because the
-- old schema did not record the voter and therefore cannot be reconstructed.

ALTER TABLE public.brainstorm_ideas
    ADD COLUMN IF NOT EXISTS vote_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.brainstorm_ideas
SET vote_count = GREATEST(COALESCE(votes, 0), 0)
WHERE vote_count = 0 AND COALESCE(votes, 0) > 0;

CREATE TABLE IF NOT EXISTS public.idea_votes (
    idea_id UUID NOT NULL REFERENCES public.brainstorm_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (idea_id, user_id)
);

ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;

-- Only the server-side service-role client may operate on vote records. The
-- browser never receives this privilege; Express performs ownership checks.
REVOKE ALL ON TABLE public.idea_votes FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_idea_votes_user_id ON public.idea_votes(user_id);

CREATE OR REPLACE FUNCTION public.cast_idea_vote(
    p_idea_id UUID,
    p_team_id UUID,
    p_user_id UUID
)
RETURNS TABLE (idea_id UUID, vote_count INTEGER, created BOOLEAN)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    inserted_rows INTEGER;
BEGIN
    INSERT INTO public.idea_votes (idea_id, user_id)
    SELECT p_idea_id, p_user_id
    WHERE EXISTS (
        SELECT 1
        FROM public.brainstorm_ideas
        WHERE id = p_idea_id AND team_id = p_team_id
    )
    ON CONFLICT (idea_id, user_id) DO NOTHING;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;

    IF inserted_rows > 0 THEN
        RETURN QUERY
        UPDATE public.brainstorm_ideas AS idea
        SET vote_count = idea.vote_count + 1
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
    DELETE FROM public.idea_votes
    WHERE idea_id = p_idea_id AND user_id = p_user_id;

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

REVOKE ALL ON FUNCTION public.cast_idea_vote(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_idea_vote(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cast_idea_vote(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_idea_vote(UUID, UUID, UUID) TO service_role;
