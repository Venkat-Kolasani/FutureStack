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

describe('Opportunities API', () => {
    beforeEach(() => {
        mockFrom.mockReset();
    });

    it('GET /api/opportunities returns 401 without auth', async () => {
        const res = await request(app).get('/api/opportunities');
        expect(res.status).toBe(401);
    });

    it('GET /api/v1/opportunities returns a paginated response', async () => {
        const rows = [
            {
                id: '00000000-0000-4000-8000-000000000002',
                user_id: TEST_AUTH.internalUserId,
                title: 'Newest',
                created_at: '2026-07-16T10:00:00.000Z',
            },
            {
                id: '00000000-0000-4000-8000-000000000001',
                user_id: TEST_AUTH.internalUserId,
                title: 'Older',
                created_at: '2026-07-15T10:00:00.000Z',
            },
        ];
        const chain = createChain({ data: rows, error: null });
        mockFrom.mockReturnValue(chain);

        const res = await request(app)
            .get('/api/v1/opportunities?limit=1')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([expect.objectContaining({ title: 'Newest' })]);
        expect(res.body.nextCursor).toEqual(expect.any(String));
        expect(chain.limit).toHaveBeenCalledWith(2);
        expect(chain.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
        expect(chain.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    });

    it('GET /api/v1/opportunities rejects an invalid cursor', async () => {
        const res = await request(app)
            .get('/api/v1/opportunities?cursor=not-a-cursor')
            .set(authHeader);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
        expect(res.body.details).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'cursor' })])
        );
    });

    it('POST /api/opportunities returns 400 for invalid body', async () => {
        const res = await request(app)
            .post('/api/opportunities')
            .set(authHeader)
            .send({ title: '' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
        expect(res.body.details).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'title' })])
        );
    });

    it('POST /api/opportunities creates opportunity when valid', async () => {
        const created = {
            id: 'opp-1',
            user_id: TEST_AUTH.internalUserId,
            title: 'Backend Intern',
            status: 'applied',
            category: 'internship',
        };

        mockFrom.mockReturnValue(
            createChain({ data: created, error: null })
        );

        const res = await request(app)
            .post('/api/opportunities')
            .set(authHeader)
            .send({
                title: 'Backend Intern',
                category: 'internship',
                link: 'https://example.com/jobs/1',
            });

        expect(res.status).toBe(201);
        expect(res.body.title).toBe('Backend Intern');
        expect(mockFrom).toHaveBeenCalledWith('opportunities');
    });

    it('POST /api/opportunities accepts campus_mode', async () => {
        const created = {
            id: 'opp-2',
            user_id: TEST_AUTH.internalUserId,
            title: 'Campus Drive',
            status: 'applied',
            category: 'internship',
            campus_mode: 'on_campus',
        };

        const chain = createChain({ data: created, error: null });
        mockFrom.mockReturnValue(chain);

        const res = await request(app)
            .post('/api/opportunities')
            .set(authHeader)
            .send({
                title: 'Campus Drive',
                category: 'internship',
                campus_mode: 'on_campus',
            });

        expect(res.status).toBe(201);
        expect(res.body.campus_mode).toBe('on_campus');
        expect(chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ campus_mode: 'on_campus' })
        );
    });

    it('POST /api/opportunities rejects invalid campus_mode', async () => {
        const res = await request(app)
            .post('/api/opportunities')
            .set(authHeader)
            .send({
                title: 'Invalid Campus',
                category: 'internship',
                campus_mode: 'hybrid',
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
        expect(res.body.details).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'campus_mode' })])
        );
    });

    it('PATCH /api/opportunities/:id clears campus_mode', async () => {
        const updated = {
            id: '00000000-0000-4000-8000-000000000001',
            user_id: TEST_AUTH.internalUserId,
            title: 'Campus Drive',
            campus_mode: null,
        };

        const chain = createChain({ data: updated, error: null });
        mockFrom.mockReturnValue(chain);

        const res = await request(app)
            .patch('/api/opportunities/00000000-0000-4000-8000-000000000001')
            .set(authHeader)
            .send({ campus_mode: null });

        expect(res.status).toBe(200);
        expect(chain.update).toHaveBeenCalledWith({ campus_mode: null });
    });

    it('PATCH /api/opportunities/:id returns 404 when not found', async () => {
        mockFrom.mockReturnValue(
            createChain({ data: null, error: { code: 'PGRST116', message: 'not found' } })
        );

        const res = await request(app)
            .patch('/api/opportunities/00000000-0000-4000-8000-000000000099')
            .set(authHeader)
            .send({ status: 'rejected' });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Opportunity not found');
    });
});
