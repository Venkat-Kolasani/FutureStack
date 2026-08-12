const { createChain } = require('../mocks/supabase');

jest.mock('@clerk/express', () => ({
    clerkClient: {
        users: {
            getUser: jest.fn(),
        },
    },
}));

const mockFrom = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
    supabase: { from: (...args) => mockFrom(...args) },
}));

const { clerkClient } = require('@clerk/express');
const { ensureUserExists } = require('../../src/middleware/auth');

const primaryClerkUser = {
    id: 'clerk_user_primary',
    primaryEmailAddressId: 'email_primary',
    emailAddresses: [
        { id: 'email_primary', emailAddress: 'primary@example.com' },
        { id: 'email_second', emailAddress: 'second@example.com' },
    ],
};

describe('ensureUserExists email backfill', () => {
    beforeEach(() => {
        mockFrom.mockReset();
        clerkClient.users.getUser.mockReset();
    });

    it('fetches the primary email from Clerk and stores it for a new user', async () => {
        clerkClient.users.getUser.mockResolvedValue(primaryClerkUser);

        const selectChain = createChain({ data: null, error: null });
        const insertChain = createChain({ data: { id: 'user-new-a' }, error: null });
        mockFrom
            .mockReturnValueOnce(selectChain)
            .mockReturnValueOnce(insertChain);

        const auth = { userId: 'clerk_user_new_a', sessionId: 'sess', email: undefined };
        await ensureUserExists(auth);

        expect(clerkClient.users.getUser).toHaveBeenCalledWith('clerk_user_new_a');
        expect(insertChain.insert).toHaveBeenCalledWith({
            clerk_id: 'clerk_user_new_a',
            email: 'primary@example.com',
        });
        expect(auth.internalUserId).toBe('user-new-a');
    });

    it('prefers req.auth.email for a new user and does not query Clerk', async () => {
        const selectChain = createChain({ data: null, error: null });
        const insertChain = createChain({ data: { id: 'user-new-g' }, error: null });
        mockFrom
            .mockReturnValueOnce(selectChain)
            .mockReturnValueOnce(insertChain);

        const auth = { userId: 'clerk_user_new_g', sessionId: 'sess', email: 'jwt@example.com' };
        await ensureUserExists(auth);

        expect(clerkClient.users.getUser).not.toHaveBeenCalled();
        expect(insertChain.insert).toHaveBeenCalledWith({
            clerk_id: 'clerk_user_new_g',
            email: 'jwt@example.com',
        });
        expect(auth.internalUserId).toBe('user-new-g');
    });

    it('creates a new user with a null email when Clerk has no usable email', async () => {
        clerkClient.users.getUser.mockResolvedValue({
            id: 'clerk_user_new_b',
            emailAddresses: [],
        });

        const selectChain = createChain({ data: null, error: null });
        const insertChain = createChain({ data: { id: 'user-new-b' }, error: null });
        mockFrom
            .mockReturnValueOnce(selectChain)
            .mockReturnValueOnce(insertChain);

        const auth = { userId: 'clerk_user_new_b', sessionId: 'sess', email: undefined };
        await ensureUserExists(auth);

        expect(clerkClient.users.getUser).toHaveBeenCalledWith('clerk_user_new_b');
        expect(insertChain.insert).toHaveBeenCalledWith({
            clerk_id: 'clerk_user_new_b',
            email: null,
        });
        expect(auth.internalUserId).toBe('user-new-b');
    });

    it('backfills the email for an existing user whose email is NULL', async () => {
        clerkClient.users.getUser.mockResolvedValue(primaryClerkUser);

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

        expect(clerkClient.users.getUser).toHaveBeenCalledWith('clerk_user_existing_c');
        expect(updateChain.update).toHaveBeenCalledWith({ email: 'primary@example.com' });
        expect(updateChain.eq).toHaveBeenCalledWith('id', 'user-existing-c');
        expect(auth.internalUserId).toBe('user-existing-c');
    });

    it('does not query Clerk or update the email when the existing user already has one', async () => {
        const selectChain = createChain({
            data: { id: 'user-existing-d', email: 'already@example.com' },
            error: null,
        });
        mockFrom.mockReturnValueOnce(selectChain);

        const auth = { userId: 'clerk_user_existing_d', sessionId: 'sess', email: undefined };
        await ensureUserExists(auth);

        expect(clerkClient.users.getUser).not.toHaveBeenCalled();
        expect(selectChain.update).not.toHaveBeenCalled();
        expect(auth.internalUserId).toBe('user-existing-d');
    });

    it('continues authentication when the Clerk email lookup fails', async () => {
        clerkClient.users.getUser.mockRejectedValue(new Error('Clerk API unavailable'));

        const selectChain = createChain({
            data: { id: 'user-existing-e', email: null },
            error: null,
        });
        mockFrom.mockReturnValueOnce(selectChain);

        const auth = { userId: 'clerk_user_existing_e', sessionId: 'sess', email: undefined };
        await expect(ensureUserExists(auth)).resolves.toBeUndefined();

        expect(clerkClient.users.getUser).toHaveBeenCalledWith('clerk_user_existing_e');
        expect(selectChain.update).not.toHaveBeenCalled();
        expect(auth.internalUserId).toBe('user-existing-e');
    });

    it('uses the cache and does not query Supabase or Clerk on a cache hit', async () => {
        const selectChain = createChain({
            data: { id: 'user-existing-f', email: 'already@example.com' },
            error: null,
        });
        mockFrom.mockReturnValueOnce(selectChain);

        const auth = { userId: 'clerk_user_existing_f', sessionId: 'sess', email: undefined };
        await ensureUserExists(auth);
        expect(auth.internalUserId).toBe('user-existing-f');

        mockFrom.mockClear();
        await ensureUserExists(auth);

        expect(mockFrom).not.toHaveBeenCalled();
        expect(clerkClient.users.getUser).not.toHaveBeenCalled();
        expect(auth.internalUserId).toBe('user-existing-f');
    });
});
