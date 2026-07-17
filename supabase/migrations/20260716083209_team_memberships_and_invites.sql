-- Account-backed collaboration for hackathon workspaces.
--
-- This migration deliberately leaves `team_members` in place. Those rows are a
-- display roster (for example, a designer who does not have a FutureStack
-- account); `team_memberships` is the authorization source of truth.

CREATE TABLE public.team_memberships (
    team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, user_id)
);

CREATE INDEX idx_team_memberships_user_id ON public.team_memberships(user_id, team_id);
CREATE INDEX idx_team_memberships_team_role ON public.team_memberships(team_id, role);
CREATE INDEX idx_team_memberships_invited_by ON public.team_memberships(invited_by)
    WHERE invited_by IS NOT NULL;

CREATE TABLE public.team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
    role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
    invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT team_invites_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX idx_team_invites_team_id ON public.team_invites(team_id);
CREATE INDEX idx_team_invites_team_active
    ON public.team_invites(team_id, expires_at)
    WHERE accepted_at IS NULL;
CREATE INDEX idx_team_invites_invited_by ON public.team_invites(invited_by);
CREATE INDEX idx_team_invites_accepted_by ON public.team_invites(accepted_by)
    WHERE accepted_by IS NOT NULL;

-- Existing team owners gain the same explicit authorization model as new teams.
INSERT INTO public.team_memberships (team_id, user_id, role, invited_by, accepted_at, created_at)
SELECT id, user_id, 'owner', user_id, created_at, created_at
FROM public.hackathon_teams
ON CONFLICT (team_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_owner_team_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.team_memberships (team_id, user_id, role, invited_by)
    VALUES (NEW.id, NEW.user_id, 'owner', NEW.user_id)
    ON CONFLICT (team_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_owner_team_membership ON public.hackathon_teams;
CREATE TRIGGER create_owner_team_membership
    AFTER INSERT ON public.hackathon_teams
    FOR EACH ROW
    EXECUTE FUNCTION public.create_owner_team_membership();

-- The API receives only a hash of the opaque invite token. Locking the invite
-- row makes redemption single-use even if two clients submit it concurrently.
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
      AND expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    INSERT INTO public.team_memberships (team_id, user_id, role, invited_by)
    VALUES (invite_row.team_id, p_user_id, invite_row.role, invite_row.invited_by)
    ON CONFLICT (team_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        invited_by = EXCLUDED.invited_by,
        accepted_at = now();

    UPDATE public.team_invites
    SET accepted_at = now(),
        accepted_by = p_user_id
    WHERE id = invite_row.id;

    RETURN QUERY
    SELECT invite_row.team_id, team.opportunity_id, invite_row.role
    FROM public.hackathon_teams AS team
    WHERE team.id = invite_row.team_id;
END;
$$;

ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.team_memberships FROM anon, authenticated;
REVOKE ALL ON TABLE public.team_invites FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_team_invite(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invite(TEXT, UUID) TO service_role;
