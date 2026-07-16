const request = require('supertest');
const app = require('../../src/app');

describe('Internal job dispatcher API', () => {
    const originalToken = process.env.JOB_DISPATCH_TOKEN;

    afterEach(() => {
        if (originalToken === undefined) delete process.env.JOB_DISPATCH_TOKEN;
        else process.env.JOB_DISPATCH_TOKEN = originalToken;
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
});
