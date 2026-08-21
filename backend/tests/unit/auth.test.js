const { createChain } = require('../mocks/supabase');

const mockTryFetchPrimaryEmailFromClerk = jest.fn();
jest.mock('../../src/lib/clerkEmail', () => {
    const actual = jest.requireActual('../../src/lib/clerkEmail');
    return {
        ...actual,
        tryFetchPrimaryEmailFromClerk: (...args) => mockTryFetchPrimaryEmailFromClerk(...args),
    };
});

const mockFrom = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
    supabase: { from: (...args) => mockFrom(...args) },
}));

const { ensureUserExists } = require('../../src/middleware/auth');

describe('ensureUserExists email resolution', () => {
    beforeEach(() => {
        mockFrom.mockReset();
        mockTryFetchPrimaryEmailFromClerk.mockReset();
    });

    it('stores the Clerk primary email for a new user when the JWT has none', async () => {
        mockTryFetchPrimaryEmailFromClerk.mockResolvedValue('primary@example.com');

        const selectChain = createChain({ data: null, error: null });
        const insertChain = createChain({ data: { id: 'user-new-a', email: 'primary@example.com' }, error: null });
        mockFrom
            .mockReturnValueOnce(selectChain)
            .mockReturnValueOnce(insertChain);

        const auth = { userId: 'clerk_user_new_a', sessionId: 'sess', email: undefined };
        await ensureUserExists(auth);

        expect(mockTryFetchPrimaryEmailFromClerk).toHaveBeenCalledWith('clerk_user_new_a');
        expect(insertChain.insert).toHaveBeenCalledWith({
            clerk_id: 'clerk_user_new_a',
            email: 'primary@example.com',
        });
        expect(auth.internalUserId).toBe('user-new-a');
    });

    it('prefers a JWT email for a new user and does not query Clerk', async () => {
        const selectChain = createChain({ data: null, error: null });
        const insertChain = createChain({ data: { id: 'user-new-g', email: 'jwt@example.com' }, error: null });
        mockFrom
            .mockReturnValueOnce(selectChain)
            .mockReturnValueOnce(insertChain);

        const auth = { userId: 'clerk_user_new_g', sessionId: 'sess', email: 'jwt@example.com' };
        await ensureUserExists(auth);

        expect(mockTryFetchPrimaryEmailFromClerk).not.toHaveBeenCalled();
        expect(insertChain.insert).toHaveBeenCalledWith({
            clerk_id: 'clerk_user_new_g',
            email: 'jwt@example.com',
        });
        expect(auth.internalUserId).toBe('user-new-g');
    });

    it('backfills a missing email for an existing user', async () => {
        mockTryFetchPrimaryEmailFromClerk.mockResolvedValue('primary@example.com');

        const selectChain = createChain({
            data: { id: 'user-existing-c', email: null },
            error: null,
        });
        const updateChain = createChain({ data: null, error: null });
        mockFrom
            .mockReturnValueOnce(selectChain)
            .mockReturnValueOnce(updateChain);

        const auth = { userId: 'clerk_user_existing_c', sessionId: 'sess', email: undefined };
        await ensureUserExists(auth);

        expect(mockTryFetchPrimaryEmailFromClerk).toHaveBeenCalledWith('clerk_user_existing_c');
        expect(updateChain.update).toHaveBeenCalledWith({ email: 'primary@example.com' });
        expect(updateChain.eq).toHaveBeenCalledWith('id', 'user-existing-c');
        expect(auth.internalUserId).toBe('user-existing-c');
    });

    it('does not query Clerk when the existing user already has an email', async () => {
        const selectChain = createChain({
            data: { id: 'user-existing-d', email: 'already@example.com' },
            error: null,
        });
        mockFrom.mockReturnValueOnce(selectChain);

        const auth = { userId: 'clerk_user_existing_d', sessionId: 'sess', email: undefined };
        await ensureUserExists(auth);

        expect(mockTryFetchPrimaryEmailFromClerk).not.toHaveBeenCalled();
        expect(selectChain.update).not.toHaveBeenCalled();
        expect(auth.internalUserId).toBe('user-existing-d');
    });

    it('continues authentication when Clerk email lookup fails', async () => {
        mockTryFetchPrimaryEmailFromClerk.mockResolvedValue(null);

        const selectChain = createChain({
            data: { id: 'user-existing-e', email: null },
            error: null,
        });
        mockFrom.mockReturnValueOnce(selectChain);

        const auth = { userId: 'clerk_user_existing_e', sessionId: 'sess', email: undefined };
        await expect(ensureUserExists(auth)).resolves.toBeUndefined();

        expect(mockTryFetchPrimaryEmailFromClerk).toHaveBeenCalledWith('clerk_user_existing_e');
        expect(selectChain.update).not.toHaveBeenCalled();
        expect(auth.internalUserId).toBe('user-existing-e');
    });

    it('backfills after a first-login insert race', async () => {
        mockTryFetchPrimaryEmailFromClerk.mockResolvedValue('primary@example.com');

        const selectChain = createChain({ data: null, error: null });
        const insertChain = createChain({
            data: null,
            error: { code: '23505', message: 'duplicate' },
        });
        const raceSelect = createChain({
            data: { id: 'user-race', email: null },
            error: null,
        });
        const updateChain = createChain({ data: null, error: null });
        mockFrom
            .mockReturnValueOnce(selectChain)
            .mockReturnValueOnce(insertChain)
            .mockReturnValueOnce(raceSelect)
            .mockReturnValueOnce(updateChain);

        const auth = { userId: 'clerk_user_race', sessionId: 'sess', email: undefined };
        await ensureUserExists(auth);

        expect(updateChain.update).toHaveBeenCalledWith({ email: 'primary@example.com' });
        expect(auth.internalUserId).toBe('user-race');
    });
});
