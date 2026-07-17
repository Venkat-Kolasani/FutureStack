/**
 * Builds a chainable Supabase query mock.
 * Usage: mockFrom.mockReturnValue(createChain({ data: [], error: null }));
 */
function createChain(result = { data: null, error: null }) {
    const chain = {
        select: jest.fn(() => chain),
        insert: jest.fn(() => chain),
        update: jest.fn(() => chain),
        upsert: jest.fn(() => chain),
        delete: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        or: jest.fn(() => chain),
        in: jest.fn(() => chain),
        order: jest.fn(() => chain),
        limit: jest.fn(() => chain),
        single: jest.fn(() => Promise.resolve(result)),
        maybeSingle: jest.fn(() => Promise.resolve(result)),
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };

    Object.defineProperty(chain, 'data', { get: () => result.data });
    Object.defineProperty(chain, 'error', { get: () => result.error });

    return chain;
}

function createCountChain(count = 0, error = null) {
    return {
        select: jest.fn(function () {
            return this;
        }),
        eq: jest.fn(function () {
            return this;
        }),
        then: (resolve) => resolve({ count, error }),
    };
}

module.exports = { createChain, createCountChain };
