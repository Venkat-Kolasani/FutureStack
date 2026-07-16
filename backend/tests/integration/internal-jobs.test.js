const request = require('supertest');

const mockDispatchReminderJobs = jest.fn();
jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('../../src/lib/reminderJobs', () => ({
    dispatchReminderJobs: (...args) => mockDispatchReminderJobs(...args),
}));

const app = require('../../src/app');

describe('Internal job dispatcher API', () => {
    const originalToken = process.env.JOB_DISPATCH_TOKEN;

    afterEach(() => {
        if (originalToken === undefined) delete process.env.JOB_DISPATCH_TOKEN;
        else process.env.JOB_DISPATCH_TOKEN = originalToken;
        mockDispatchReminderJobs.mockReset();
    });

    it('returns 503 when no dispatcher secret is configured', async () => {
        delete process.env.JOB_DISPATCH_TOKEN;

        const res = await request(app).post('/api/v1/internal/jobs/dispatch').send({});

        expect(res.status).toBe(503);
    });

    it('rejects requests without the configured dispatcher secret', async () => {
        process.env.JOB_DISPATCH_TOKEN = 'test-dispatch-token';

        const res = await request(app).post('/api/v1/internal/jobs/dispatch').send({});

        expect(res.status).toBe(401);
    });

    it.each([
        ['the default limit', {}, 10],
        ['the minimum limit', { limit: 1 }, 1],
        ['the maximum limit', { limit: 50 }, 50],
    ])('dispatches jobs with %s', async (_description, body, expectedLimit) => {
        process.env.JOB_DISPATCH_TOKEN = 'test-dispatch-token';
        mockDispatchReminderJobs.mockResolvedValue({ leased: 1, completed: 1, retried: 0, dead: 0 });

        const res = await request(app)
            .post('/api/v1/internal/jobs/dispatch')
            .set('Authorization', 'Bearer test-dispatch-token')
            .send(body);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok', leased: 1, completed: 1, retried: 0, dead: 0 });
        expect(mockDispatchReminderJobs).toHaveBeenCalledWith(expect.any(Object), { limit: expectedLimit });
    });

    it.each([0, 51])('rejects an out-of-range dispatch limit of %i', async (limit) => {
        process.env.JOB_DISPATCH_TOKEN = 'test-dispatch-token';

        const res = await request(app)
            .post('/api/v1/internal/jobs/dispatch')
            .set('Authorization', 'Bearer test-dispatch-token')
            .send({ limit });

        expect(res.status).toBe(400);
        expect(mockDispatchReminderJobs).not.toHaveBeenCalled();
    });
});
