const { createChain } = require('../mocks/supabase');
const { mockRequireAuth, TEST_AUTH } = require('../mocks/auth');

jest.mock('../../src/middleware/auth', () => ({
    requireAuth: (...args) => mockRequireAuth(...args),
}));

jest.mock('../../src/lib/reminderEmail', () => ({
    getReminderEmailConfig: () => ({ enabled: false }),
}));

const mockFrom = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
    supabase: { from: (...args) => mockFrom(...args) },
}));

const request = require('supertest');
const app = require('../../src/app');

const authHeader = { Authorization: 'Bearer test-token' };

describe('Notification preferences API', () => {
    beforeEach(() => mockFrom.mockReset());

    it('returns a safe default when the user has not chosen an email preference', async () => {
        const chain = createChain({ data: null, error: null });
        mockFrom.mockReturnValue(chain);

        const res = await request(app).get('/api/v1/notification-preferences').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ deadlineEmailEnabled: false, emailDeliveryAvailable: false });
        expect(mockFrom).toHaveBeenCalledWith('user_notification_preferences');
        expect(chain.eq).toHaveBeenCalledWith('user_id', TEST_AUTH.internalUserId);
    });

    it('stores the authenticated user email preference', async () => {
        const chain = createChain({ data: { deadline_email_enabled: true }, error: null });
        mockFrom.mockReturnValue(chain);

        const res = await request(app)
            .put('/api/v1/notification-preferences')
            .set(authHeader)
            .send({ deadlineEmailEnabled: true });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ deadlineEmailEnabled: true, emailDeliveryAvailable: false });
        expect(chain.upsert).toHaveBeenCalledWith(expect.objectContaining({
            user_id: TEST_AUTH.internalUserId,
            deadline_email_enabled: true,
        }));
    });

    it('rejects a malformed preference without querying Supabase', async () => {
        const res = await request(app)
            .put('/api/v1/notification-preferences')
            .set(authHeader)
            .send({ deadlineEmailEnabled: 'yes' });

        expect(res.status).toBe(400);
        expect(mockFrom).not.toHaveBeenCalled();
    });
});
