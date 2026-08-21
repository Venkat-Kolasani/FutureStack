const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
    const email = String(value || '').trim();
    return EMAIL_PATTERN.test(email) ? email : null;
}

function pickPrimaryEmail(user) {
    const emailAddresses = user?.emailAddresses || [];
    const primary = emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)
        || emailAddresses[0];
    return normalizeEmail(primary?.emailAddress);
}

function getClerkClient(clerkClientImpl) {
    if (clerkClientImpl) return clerkClientImpl;
    const { clerkClient } = require('@clerk/express');
    return clerkClient;
}

/**
 * Resolve the Clerk user's primary email via the Backend API.
 * Throws on API/network failures so callers that can retry (the reminder
 * worker) do so. Returns null when Clerk has no usable email address.
 */
async function fetchPrimaryEmailFromClerk(clerkId, clerkClientImpl) {
    if (!clerkId) return null;

    const user = await getClerkClient(clerkClientImpl).users.getUser(clerkId);
    return pickPrimaryEmail(user);
}

/**
 * Same lookup as fetchPrimaryEmailFromClerk, but never throws. Use this on
 * the authentication path so a Clerk outage cannot block sign-in.
 */
async function tryFetchPrimaryEmailFromClerk(clerkId, clerkClientImpl) {
    try {
        return await fetchPrimaryEmailFromClerk(clerkId, clerkClientImpl);
    } catch (error) {
        console.error('Clerk email lookup failed:', {
            type: 'CLERK_EMAIL_LOOKUP_ERROR',
            clerkId,
            message: error?.message,
        });
        return null;
    }
}

module.exports = {
    fetchPrimaryEmailFromClerk,
    normalizeEmail,
    pickPrimaryEmail,
    tryFetchPrimaryEmailFromClerk,
};
