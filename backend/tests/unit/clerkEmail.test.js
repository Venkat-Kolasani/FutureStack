const {
    fetchPrimaryEmailFromClerk,
    normalizeEmail,
    pickPrimaryEmail,
    tryFetchPrimaryEmailFromClerk,
} = require('../../src/lib/clerkEmail');

const primaryUser = {
    id: 'user_clerk_1',
    primaryEmailAddressId: 'email_primary',
    emailAddresses: [
        { id: 'email_primary', emailAddress: 'primary@example.com' },
        { id: 'email_second', emailAddress: 'second@example.com' },
    ],
};

describe('clerkEmail', () => {
    it('normalizes valid addresses and rejects empty or malformed values', () => {
        expect(normalizeEmail('  owner@example.com  ')).toBe('owner@example.com');
        expect(normalizeEmail('')).toBeNull();
        expect(normalizeEmail('not-an-email')).toBeNull();
        expect(normalizeEmail(null)).toBeNull();
    });

    it('prefers the Clerk primary email address', () => {
        expect(pickPrimaryEmail(primaryUser)).toBe('primary@example.com');
        expect(pickPrimaryEmail({ emailAddresses: [] })).toBeNull();
        expect(pickPrimaryEmail({
            emailAddresses: [{ id: 'email_only', emailAddress: 'only@example.com' }],
        })).toBe('only@example.com');
    });

    it('fetches the primary email through the Clerk client', async () => {
        const getUser = jest.fn().mockResolvedValue(primaryUser);

        await expect(fetchPrimaryEmailFromClerk('user_clerk_1', { users: { getUser } }))
            .resolves.toBe('primary@example.com');
        expect(getUser).toHaveBeenCalledWith('user_clerk_1');
    });

    it('returns null when Clerk has no usable email', async () => {
        const getUser = jest.fn().mockResolvedValue({ emailAddresses: [] });

        await expect(fetchPrimaryEmailFromClerk('user_clerk_1', { users: { getUser } }))
            .resolves.toBeNull();
    });

    it('throws when the Clerk API fails so the outbox can retry', async () => {
        const getUser = jest.fn().mockRejectedValue(new Error('Clerk API unavailable'));

        await expect(fetchPrimaryEmailFromClerk('user_clerk_1', { users: { getUser } }))
            .rejects.toThrow('Clerk API unavailable');
    });

    it('swallows Clerk failures on the auth path', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const getUser = jest.fn().mockRejectedValue(new Error('Clerk API unavailable'));

        await expect(tryFetchPrimaryEmailFromClerk('user_clerk_1', { users: { getUser } }))
            .resolves.toBeNull();
        expect(errorSpy).toHaveBeenCalledWith(
            'Clerk email lookup failed:',
            expect.objectContaining({
                type: 'CLERK_EMAIL_LOOKUP_ERROR',
                clerkId: 'user_clerk_1',
            })
        );
        errorSpy.mockRestore();
    });
});
