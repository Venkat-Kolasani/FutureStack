const { createChain } = require('../mocks/supabase');
const { mockRequireAuth, TEST_AUTH } = require('../mocks/auth');

jest.mock('../../src/middleware/auth', () => ({
    requireAuth: (...args) => mockRequireAuth(...args),
}));

const mockFrom = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
    supabase: {
        from: (...args) => mockFrom(...args),
    },
}));

const request = require('supertest');
const app = require('../../src/app');

const authHeader = { Authorization: 'Bearer test-token' };
const OPPORTUNITY_ID = '00000000-0000-4000-8000-000000000010';
const ROUND_ID = '00000000-0000-4000-8000-000000000020';

function listChain(data, error = null) {
    const chain = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        not: jest.fn(() => chain),
        gte: jest.fn(() => chain),
        lte: jest.fn(() => chain),
        order: jest.fn(() => chain),
        limit: jest.fn(() => Promise.resolve({ data, error })),
        then: (resolve, reject) => Promise.resolve({ data, error }).then(resolve, reject),
    };
    return chain;
}

describe('Interview rounds API', () => {
    beforeEach(() => {
        mockFrom.mockReset();
    });

    it('GET /api/opportunities/:id/rounds returns 401 without auth', async () => {
        const res = await request(app).get(`/api/opportunities/${OPPORTUNITY_ID}/rounds`);
        expect(res.status).toBe(401);
    });

    it('POST /api/opportunities/:id/rounds returns 400 for invalid round_type', async () => {
        mockFrom.mockReturnValue(
            createChain({
                data: { id: OPPORTUNITY_ID, category: 'internship' },
                error: null
            })
        );

        const res = await request(app)
            .post(`/api/opportunities/${OPPORTUNITY_ID}/rounds`)
            .set(authHeader)
            .send({ round_type: 'invalid_type' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    it('POST /api/opportunities/:id/rounds returns 400 for hackathon opportunities', async () => {
        mockFrom.mockReturnValue(
            createChain({
                data: { id: OPPORTUNITY_ID, category: 'hackathon' },
                error: null
            })
        );

        const res = await request(app)
            .post(`/api/opportunities/${OPPORTUNITY_ID}/rounds`)
            .set(authHeader)
            .send({ round_type: 'oa' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/internship/i);
    });

    it('creates a round and syncs opportunity to rejected when result is rejected', async () => {
        const createdRound = {
            id: ROUND_ID,
            opportunity_id: OPPORTUNITY_ID,
            user_id: TEST_AUTH.internalUserId,
            round_number: 1,
            round_type: 'oa',
            result: 'rejected'
        };

        let opportunityCalls = 0;
        let roundCalls = 0;

        mockFrom.mockImplementation((table) => {
            if (table === 'opportunities') {
                opportunityCalls += 1;
                if (opportunityCalls === 1) {
                    return createChain({
                        data: { id: OPPORTUNITY_ID, category: 'internship', status: 'applied' },
                        error: null
                    });
                }
                return createChain({
                    data: {
                        id: OPPORTUNITY_ID,
                        status: 'rejected',
                        rejected_round_number: 1,
                        current_round_number: null
                    },
                    error: null
                });
            }

            if (table === 'opportunity_rounds') {
                roundCalls += 1;
                if (roundCalls === 1) {
                    return listChain([]);
                }
                if (roundCalls === 2) {
                    return createChain({ data: createdRound, error: null });
                }
                return listChain([
                    { round_number: 1, round_type: 'oa', result: 'rejected' }
                ]);
            }

            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .post(`/api/opportunities/${OPPORTUNITY_ID}/rounds`)
            .set(authHeader)
            .send({ round_type: 'oa', result: 'rejected' });

        expect(res.status).toBe(201);
        expect(res.body.round.round_type).toBe('oa');
        expect(res.body.opportunity.status).toBe('rejected');
        expect(mockFrom).toHaveBeenCalledWith('opportunity_rounds');
    });

    it('PATCH round to rejected syncs opportunity status', async () => {
        let opportunityCalls = 0;
        let roundCalls = 0;

        mockFrom.mockImplementation((table) => {
            if (table === 'opportunities') {
                opportunityCalls += 1;
                if (opportunityCalls === 1) {
                    return createChain({
                        data: { id: OPPORTUNITY_ID, category: 'internship', status: 'applied' },
                        error: null
                    });
                }
                return createChain({
                    data: {
                        id: OPPORTUNITY_ID,
                        category: 'internship',
                        status: 'rejected',
                        rejected_round_number: 1,
                        current_round_number: null
                    },
                    error: null
                });
            }

            if (table === 'opportunity_rounds') {
                roundCalls += 1;
                if (roundCalls === 1) {
                    return createChain({
                        data: {
                            id: ROUND_ID,
                            opportunity_id: OPPORTUNITY_ID,
                            round_number: 1,
                            round_type: 'oa',
                            result: 'rejected'
                        },
                        error: null
                    });
                }
                return listChain([
                    {
                        id: ROUND_ID,
                        opportunity_id: OPPORTUNITY_ID,
                        round_number: 1,
                        round_type: 'oa',
                        result: 'rejected'
                    }
                ]);
            }

            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .patch(`/api/opportunities/${OPPORTUNITY_ID}/rounds/${ROUND_ID}`)
            .set(authHeader)
            .send({ result: 'rejected' });

        expect(res.status).toBe(200);
        expect(res.body.round.result).toBe('rejected');
        expect(res.body.opportunity.status).toBe('rejected');
    });

    it('GET /api/opportunities/:id/rounds returns 404 for unknown opportunity', async () => {
        mockFrom.mockReturnValue(
            createChain({
                data: null,
                error: { code: 'PGRST116', message: 'not found' }
            })
        );

        const res = await request(app)
            .get(`/api/opportunities/${OPPORTUNITY_ID}/rounds`)
            .set(authHeader);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Opportunity not found');
    });

    it('GET /api/opportunities/rounds/upcoming returns 401 without auth', async () => {
        const res = await request(app).get(
            '/api/opportunities/rounds/upcoming?from=2026-01-01&to=2026-01-31'
        );
        expect(res.status).toBe(401);
    });

    it('GET /api/opportunities/rounds/upcoming returns pending rounds in date range', async () => {
        const upcomingData = [
            {
                id: ROUND_ID,
                opportunity_id: OPPORTUNITY_ID,
                round_number: 2,
                round_type: 'technical',
                scheduled_date: '2026-06-15',
                scheduled_time: '15:00:00',
                result: 'pending',
                opportunities: { id: OPPORTUNITY_ID, title: 'Acme Intern', category: 'internship' },
            },
        ];

        mockFrom.mockReturnValue(listChain(upcomingData));

        const res = await request(app)
            .get('/api/opportunities/rounds/upcoming?from=2026-06-01&to=2026-06-30')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toMatchObject({
            id: ROUND_ID,
            opportunityId: OPPORTUNITY_ID,
            opportunityTitle: 'Acme Intern',
            roundNumber: 2,
            roundType: 'technical',
            scheduledDate: '2026-06-15',
            scheduledTime: '15:00:00',
            result: 'pending',
        });
    });

    it('POST /api/opportunities/:id/rounds rejects malformed scheduled times', async () => {
        const res = await request(app)
            .post(`/api/opportunities/${OPPORTUNITY_ID}/rounds`)
            .set(authHeader)
            .send({ round_type: 'oa', scheduled_time: '3pm' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('GET /api/opportunities/rounds/upcoming returns 400 when from is after to', async () => {
        const res = await request(app)
            .get('/api/opportunities/rounds/upcoming?from=2026-06-30&to=2026-06-01')
            .set(authHeader);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    it('GET /api/opportunities/rounds/upcoming returns 400 for impossible calendar dates', async () => {
        const res = await request(app)
            .get('/api/opportunities/rounds/upcoming?from=2026-02-30&to=2026-03-01')
            .set(authHeader);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });
});
