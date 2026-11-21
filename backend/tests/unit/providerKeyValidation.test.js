'use strict';

jest.mock('ai', () => ({ generateText: jest.fn() }));
jest.mock('@ai-sdk/groq', () => ({
    createGroq: () => () => ({ provider: 'groq' }),
}));
jest.mock('@ai-sdk/anthropic', () => ({
    createAnthropic: () => () => ({ provider: 'anthropic' }),
}));

const { generateText } = require('ai');
const { verifyProviderKey } = require('../../src/lib/providerKeyValidation');

const GROQ_MODEL = 'openai/gpt-oss-120b';
const KEY = 'gsk_test_key_value';

describe('verifyProviderKey', () => {
    beforeEach(() => {
        generateText.mockReset();
    });

    it('treats quota and rate limits as a valid key', async () => {
        generateText.mockRejectedValueOnce(new Error('exceeded your current quota'));
        await expect(verifyProviderKey('groq', KEY, GROQ_MODEL)).resolves.toEqual({
            ok: true,
            model: GROQ_MODEL,
        });

        generateText.mockRejectedValueOnce(new Error('rate limit reached, please retry in 2s'));
        await expect(verifyProviderKey('anthropic', KEY, 'claude-sonnet-4-5')).resolves.toEqual({
            ok: true,
            model: 'claude-sonnet-4-5',
        });
    });

    it('reports an unclassified probe error as a provider key failure', async () => {
        generateText.mockRejectedValueOnce(new Error('socket hang up'));
        await expect(verifyProviderKey('groq', KEY, GROQ_MODEL)).resolves.toEqual({
            ok: false,
            code: 'LLM_AUTH_ERROR',
            message: 'The Groq API key could not be verified.',
        });
    });
});
