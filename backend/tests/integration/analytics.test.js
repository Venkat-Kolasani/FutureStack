const { createChain } = require('../mocks/supabase');
const { mockRequireAuth } = require('../mocks/auth');

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

describe('Analytics API', () => {
    beforeEach(() => {
        mockFrom.mockReset();
    });

    it('GET /api/analytics returns campusModeCounts', async () => {
        const opportunities = [
            { id: '1', title: 'A', status: 'applied', category: 'internship', campus_mode: 'on_campus', created_at: '2026-01-01', deadline: null },
            { id: '2', title: 'B', status: 'applied', category: 'internship', campus_mode: 'off_campus', created_at: '2026-01-02', deadline: null },
            { id: '3', title: 'C', status: 'applied', category: 'hackathon', campus_mode: null, created_at: '2026-01-03', deadline: null },
        ];

        mockFrom.mockImplementation((table) => {
            if (table === 'opportunities') {
                return createChain({ data: opportunities, error: null });
            }
            if (table === 'opportunity_rounds') {
                return createChain({ data: [], error: null });
            }
            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .get('/api/analytics')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body.campusModeCounts).toEqual({
            on_campus: 1,
            off_campus: 1,
            unspecified: 1,
        });
    });

    it('counts only hackathon submission deadlines in the heatmap', async () => {
        const today = new Date();
        const todayKey = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0'),
        ].join('-');
        const opportunities = [
            { id: '1', title: 'Internship', status: 'applied', category: 'internship', campus_mode: null, created_at: todayKey, deadline: todayKey },
            { id: '2', title: 'Hackathon', status: 'applied', category: 'hackathon', campus_mode: null, created_at: todayKey, deadline: todayKey },
        ];

        mockFrom.mockImplementation((table) => {
            if (table === 'opportunities') return createChain({ data: opportunities, error: null });
            if (table === 'opportunity_rounds') return createChain({ data: [], error: null });
            return createChain({ data: null, error: null });
        });

        const res = await request(app).get('/api/analytics').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body.deadlineDistribution[0]).toEqual(expect.objectContaining({
            date: todayKey,
            count: 1,
        }));
    });
});
