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
            if (table !== 'hackathon_teams') {
                throw new Error(`Unexpected table: ${table}`);
            }

            return createChain({
                data: { id: TEAM_ID, opportunity_id: OPPORTUNITY_ID, user_id: TEST_AUTH.internalUserId },
                error: null,
            });
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
});
