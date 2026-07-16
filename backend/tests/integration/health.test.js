jest.mock('../../src/lib/supabase', () => {
    const { createChain } = require('../mocks/supabase');
    const chain = createChain({ data: [{ id: 'user-1' }], error: null });
    return {
        supabase: {
            from: jest.fn(() => chain),
        },
    };
});

const request = require('supertest');
const app = require('../../src/app');

describe('Health endpoints', () => {
    it('GET /api/health returns ok', async () => {
        const res = await request(app).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body).toHaveProperty('timestamp');
    });

    it('GET /api/v1/health returns ok and emits a request ID', async () => {
        const res = await request(app).get('/api/v1/health');

        expect(res.status).toBe(200);
        expect(res.headers['x-request-id']).toEqual(expect.any(String));
        expect(res.headers.deprecation).toBeUndefined();
    });

    it('legacy API responses include deprecation headers', async () => {
        const res = await request(app).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.headers.deprecation).toBe('true');
        expect(res.headers.sunset).toBeDefined();
    });

    it('GET /api/health/deps returns ok when supabase is healthy', async () => {
        const res = await request(app).get('/api/health/deps');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.checks.supabase.status).toBe('ok');
    });

    it('GET /api/health/deps returns degraded when supabase fails', async () => {
        const { supabase } = require('../../src/lib/supabase');
        const { createChain } = require('../mocks/supabase');
        supabase.from.mockReturnValueOnce(
            createChain({ data: null, error: { message: 'connection refused' } })
        );

        const res = await request(app).get('/api/health/deps');

        expect(res.status).toBe(503);
        expect(res.body.status).toBe('degraded');
        expect(res.body.checks.supabase.status).toBe('down');
    });

    it('GET /api/v1/health/deps becomes degraded when dead reminder jobs exceed the threshold', async () => {
        const { supabase } = require('../../src/lib/supabase');
        const { createChain } = require('../mocks/supabase');
        const deadJobCountChain = {
            select: jest.fn(function select() { return this; }),
            eq: jest.fn(function eq() { return this; }),
            then: (resolve) => resolve({ count: 1, error: null }),
        };

        supabase.from
            .mockReturnValueOnce(createChain({ data: [{ id: 'user-1' }], error: null }))
            .mockReturnValueOnce(deadJobCountChain)
            .mockReturnValueOnce(createChain({ data: [{ user_id: 'user-1' }], error: null }));

        const res = await request(app).get('/api/v1/health/deps');

        expect(res.status).toBe(503);
        expect(res.body.checks.reminderJobs).toEqual(expect.objectContaining({
            status: 'degraded',
            deadJobs: 1,
            threshold: 0,
        }));
    });
});
