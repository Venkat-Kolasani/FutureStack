const { createChain } = require('../mocks/supabase');
const { mockRequireAuth, TEST_AUTH } = require('../mocks/auth');

jest.mock('../../src/middleware/auth', () => ({
    requireAuth: (...args) => mockRequireAuth(...args),
}));

const mockFrom = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
    supabase: { from: (...args) => mockFrom(...args) },
}));

const request = require('supertest');
const app = require('../../src/app');

const authHeader = { Authorization: 'Bearer test-token' };

describe('Notifications API', () => {
    beforeEach(() => mockFrom.mockReset());

    it('requires authentication to list notifications', async () => {
        const res = await request(app).get('/api/v1/notifications');
        expect(res.status).toBe(401);
    });

    it('lists the authenticated user notifications', async () => {
        const chain = createChain({
            data: [{ id: 'notification-1', user_id: TEST_AUTH.internalUserId, title: 'Deadline tomorrow' }],
            error: null,
        });
        mockFrom.mockReturnValue(chain);

        const res = await request(app).get('/api/v1/notifications?limit=10').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body.notifications).toEqual([expect.objectContaining({ title: 'Deadline tomorrow' })]);
        expect(chain.eq).toHaveBeenCalledWith('user_id', TEST_AUTH.internalUserId);
        expect(chain.limit).toHaveBeenCalledWith(10);
    });

    it('rejects invalid notification identifiers', async () => {
        const res = await request(app)
            .patch('/api/v1/notifications/not-a-uuid/read')
            .set(authHeader);

        expect(res.status).toBe(400);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('marks only the authenticated user notification as read', async () => {
        const notificationId = '00000000-0000-4000-8000-000000000010';
        const chain = createChain({
            data: { id: notificationId, read_at: '2026-07-16T00:00:00.000Z' },
            error: null,
        });
        mockFrom.mockReturnValue(chain);

        const res = await request(app)
            .patch(`/api/v1/notifications/${notificationId}/read`)
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: notificationId, read_at: '2026-07-16T00:00:00.000Z' });
        expect(chain.eq).toHaveBeenCalledWith('id', notificationId);
        expect(chain.eq).toHaveBeenCalledWith('user_id', TEST_AUTH.internalUserId);
        expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ read_at: expect.any(String) }));
    });
});
