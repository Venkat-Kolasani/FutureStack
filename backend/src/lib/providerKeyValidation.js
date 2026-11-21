'use strict';

const { generateText } = require('ai');
const { verifyGeminiApiKey } = require('./geminiKeyValidation');
const { classifyLlmError } = require('./llm/errors');
const { defaultModelFor, isAllowedModel } = require('./providerModels');

const VERIFY_TIMEOUT_MS = 10_000;

function verificationFailure(classified, providerLabel) {
    if (classified?.code === 'LLM_QUOTA_EXCEEDED' || classified?.code === 'LLM_RATE_LIMITED') {
        return { ok: true };
    }
    if (!classified) {
        return {
            ok: false,
            code: 'LLM_AUTH_ERROR',
            message: `The ${providerLabel} API key could not be verified.`,
        };
    }
    const message = classified.code === 'LLM_AUTH_ERROR'
        ? `${providerLabel} rejected this API key.`
        : classified.code === 'LLM_TIMEOUT'
            ? `${providerLabel} did not respond in time. Try again.`
            : classified.message;
    return { ok: false, code: classified.code, message };
}

async function probeModel(model, providerLabel) {
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
        return verificationFailure(classifyLlmError(error), providerLabel);
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
    const providerLabel = provider === 'groq' ? 'Groq' : 'Claude';
    const client = provider === 'groq' ? createGroq({ apiKey }) : createAnthropic({ apiKey });
    const result = await probeModel(client(model), providerLabel);
    return result.ok ? { ok: true, model } : result;
}

module.exports = { verifyProviderKey };
