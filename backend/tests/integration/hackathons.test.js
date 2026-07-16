const { createChain } = require('../mocks/supabase');
const { mockRequireAuth, TEST_AUTH } = require('../mocks/auth');

jest.mock('../../src/middleware/auth', () => ({
    requireAuth: (...args) => mockRequireAuth(...args),
}));

const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
    supabase: {
        from: (...args) => mockFrom(...args),
        rpc: (...args) => mockRpc(...args),
    },
}));

const request = require('supertest');
const app = require('../../src/app');

const authHeader = { Authorization: 'Bearer test-token' };
const OPPORTUNITY_ID = '00000000-0000-4000-8000-000000000010';
const IDEA_ID = '00000000-0000-4000-8000-000000000020';
const TEAM_ID = '00000000-0000-4000-8000-000000000030';

describe('Hackathon voting API', () => {
    beforeEach(() => {
        mockFrom.mockReset();
        mockRpc.mockReset();
        mockFrom.mockImplementation((table) => {
            if (table === 'hackathon_teams') {
                return createChain({
                    data: { id: TEAM_ID, opportunity_id: OPPORTUNITY_ID, user_id: TEST_AUTH.internalUserId },
                    error: null,
                });
            }

            if (table === 'team_memberships') {
                return createChain({
                    data: { team_id: TEAM_ID, user_id: TEST_AUTH.internalUserId, role: 'owner' },
                    error: null,
                });
            }

            throw new Error(`Unexpected table: ${table}`);
        });
    });

    it('PUT /api/v1/hackathons/:opportunityId/ideas/:ideaId/vote is idempotent', async () => {
        mockRpc.mockResolvedValue({
            data: [{ idea_id: IDEA_ID, vote_count: 4, created: false }],
            error: null,
        });

        const res = await request(app)
            .put(`/api/v1/hackathons/${OPPORTUNITY_ID}/ideas/${IDEA_ID}/vote`)
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: IDEA_ID,
            vote_count: 4,
            current_user_voted: true,
            created: false,
        });
        expect(mockRpc).toHaveBeenCalledWith('cast_idea_vote', {
            p_idea_id: IDEA_ID,
            p_team_id: TEAM_ID,
            p_user_id: TEST_AUTH.internalUserId,
        });
    });

    it('DELETE /api/v1/hackathons/:opportunityId/ideas/:ideaId/vote is idempotent', async () => {
        mockRpc.mockResolvedValue({
            data: [{ idea_id: IDEA_ID, vote_count: 3, removed: false }],
            error: null,
        });

        const res = await request(app)
            .delete(`/api/v1/hackathons/${OPPORTUNITY_ID}/ideas/${IDEA_ID}/vote`)
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: IDEA_ID,
            vote_count: 3,
            current_user_voted: false,
            removed: false,
        });
        expect(mockRpc).toHaveBeenCalledWith('remove_idea_vote', {
            p_idea_id: IDEA_ID,
            p_team_id: TEAM_ID,
            p_user_id: TEST_AUTH.internalUserId,
        });
    });

    it('rejects malformed vote route parameters before database access', async () => {
        const res = await request(app)
            .put(`/api/v1/hackathons/${OPPORTUNITY_ID}/ideas/not-a-uuid/vote`)
            .set(authHeader);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
        expect(mockFrom).not.toHaveBeenCalled();
        expect(mockRpc).not.toHaveBeenCalled();
    });

    it('redeems a valid invite without exposing the stored token hash', async () => {
        mockRpc.mockResolvedValue({
            data: [{ team_id: TEAM_ID, opportunity_id: OPPORTUNITY_ID, role: 'editor' }],
            error: null,
        });

        const res = await request(app)
            .post('/api/v1/hackathons/invites/1234567890123456789012345678901234567890123/accept')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            teamId: TEAM_ID,
            opportunityId: OPPORTUNITY_ID,
            role: 'editor',
        });
        expect(mockRpc).toHaveBeenCalledWith(
            'accept_team_invite',
            expect.objectContaining({ p_user_id: TEST_AUTH.internalUserId, p_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/) })
        );
    });

    it('creates an owner-only invite while persisting only a token hash', async () => {
        const inviteChain = createChain({
            data: {
                id: '00000000-0000-4000-8000-000000000050',
                role: 'viewer',
                expires_at: '2026-07-23T08:00:00.000Z',
                created_at: '2026-07-16T08:00:00.000Z',
            },
            error: null,
        });
        mockFrom.mockImplementation((table) => {
            if (table === 'hackathon_teams') {
                return createChain({
                    data: { id: TEAM_ID, opportunity_id: OPPORTUNITY_ID, user_id: TEST_AUTH.internalUserId },
                    error: null,
                });
            }
            if (table === 'team_memberships') {
                return createChain({
                    data: { team_id: TEAM_ID, user_id: TEST_AUTH.internalUserId, role: 'owner' },
                    error: null,
                });
            }
            if (table === 'team_invites') return inviteChain;
            throw new Error(`Unexpected table: ${table}`);
        });

        const res = await request(app)
            .post(`/api/v1/hackathons/${OPPORTUNITY_ID}/invites`)
            .set(authHeader)
            .send({ role: 'viewer', expiresInHours: 24 });

        expect(res.status).toBe(201);
        expect(res.body.invite).not.toHaveProperty('token_hash');
        expect(res.body.inviteUrl).toMatch(/\/hackathons\/invites\/[A-Za-z0-9_-]{43}$/);
        expect(inviteChain.insert).toHaveBeenCalledWith(expect.objectContaining({
            token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
            role: 'viewer',
        }));
    });

    it('prevents a viewer from creating workspace content', async () => {
        mockFrom.mockImplementation((table) => {
            if (table === 'hackathon_teams') {
                return createChain({
                    data: { id: TEAM_ID, opportunity_id: OPPORTUNITY_ID, user_id: TEST_AUTH.internalUserId },
                    error: null,
                });
            }

            if (table === 'team_memberships') {
                return createChain({
                    data: { team_id: TEAM_ID, user_id: TEST_AUTH.internalUserId, role: 'viewer' },
                    error: null,
                });
            }

            throw new Error(`Unexpected table: ${table}`);
        });

        const res = await request(app)
            .post(`/api/v1/hackathons/${OPPORTUNITY_ID}/ideas`)
            .set(authHeader)
            .send({ title: 'Forbidden idea' });

        expect(res.status).toBe(403);
        expect(mockFrom).not.toHaveBeenCalledWith('brainstorm_ideas');
    });
});
