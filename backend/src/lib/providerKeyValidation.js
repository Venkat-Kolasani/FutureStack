'use strict';

const { generateText } = require('ai');
const { verifyGeminiApiKey } = require('./geminiKeyValidation');
const { classifyLlmError } = require('./llm/errors');
const { defaultModelFor, isAllowedModel } = require('./providerModels');

const VERIFY_TIMEOUT_MS = 10_000;

async function probeModel(model) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
    try {
        await generateText({
            model,
            prompt: 'Reply with ok.',
            maxTokens: 8,
            abortSignal: controller.signal,
        });
        return { ok: true };
    } catch (error) {
        const classified = classifyLlmError(error);
        return {
            ok: false,
            code: classified.code || 'LLM_AUTH_ERROR',
            message: classified.message || 'The API key could not be verified.',
        };
    } finally {
        clearTimeout(timer);
    }
}

async function verifyProviderKey(provider, apiKey, model) {
    if (provider === 'ollama') {
        return { ok: true, model: model || defaultModelFor('ollama') };
    }
    if (!isAllowedModel(provider, model)) {
        return {
            ok: false,
            code: 'LLM_MODEL_ERROR',
            message: `Model "${model}" is not available for ${provider}.`,
        };
    }
    if (provider === 'gemini') {
        return verifyGeminiApiKey(apiKey, model, { strictPreferredModel: true });
    }
    if (!apiKey || apiKey.length < 10) {
        return { ok: false, code: 'LLM_AUTH_ERROR', message: 'API key looks too short.' };
    }

    const { createGroq } = require('@ai-sdk/groq');
    const { createAnthropic } = require('@ai-sdk/anthropic');
    const client = provider === 'groq' ? createGroq({ apiKey }) : createAnthropic({ apiKey });
    const result = await probeModel(client(model));
    return result.ok ? { ok: true, model } : result;
}

module.exports = { verifyProviderKey };
