/**
 * Provider-agnostic LLM layer for the AI Resume Checker.
 *
 * Supports per-user BYOK credentials via llmOptions passed to each call.
 * Falls back to server env vars when no user key is provided.
 */

'use strict';

const { generateText: aiGenerateText, generateObject: aiGenerateObject } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { createOllama } = require('ollama-ai-provider');

const DEFAULT_PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
const DEFAULT_MODEL = process.env.LLM_MODEL || (DEFAULT_PROVIDER === 'ollama' ? 'llama3.2' : 'gemini-3.1-flash-lite');
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '180000', 10);

/**
 * @typedef {object} LlmOptions
 * @property {string} [provider]  gemini | groq | anthropic | ollama
 * @property {string} [model]
 * @property {string} [apiKey]    User or server API key (Gemini)
 */

function resolveOptions(llmOptions = {}) {
    const provider = (llmOptions.provider || DEFAULT_PROVIDER).toLowerCase();
    const model = llmOptions.model || DEFAULT_MODEL;
    return { provider, model, apiKey: llmOptions.apiKey };
}

function createModel(llmOptions = {}) {
    const { provider, model, apiKey } = resolveOptions(llmOptions);

    switch (provider) {
        case 'gemini': {
            const geminiKey = apiKey || process.env.GEMINI_API_KEY;
            if (!geminiKey) {
                throw new Error('No Gemini API key configured. Add your key in AI Settings.');
            }
            const google = createGoogleGenerativeAI({ apiKey: geminiKey });
            return google(model);
        }
        case 'groq': {
            if (!apiKey) {
                throw new Error('No Groq API key configured. Add your key in AI Settings.');
            }
            const { createGroq } = require('@ai-sdk/groq');
            return createGroq({ apiKey })(model);
        }
        case 'anthropic': {
            if (!apiKey) {
                throw new Error('No Claude API key configured. Add your key in AI Settings.');
            }
            const { createAnthropic } = require('@ai-sdk/anthropic');
            return createAnthropic({ apiKey })(model);
        }
        case 'ollama': {
            const ollama = createOllama({ baseURL: `${OLLAMA_BASE_URL}/api` });
            return ollama(model);
        }
        default:
            throw new Error(`LLM: Unknown provider "${provider}". Supported: gemini, groq, anthropic, ollama`);
    }
}

async function generateText({ system, prompt, maxTokens = 2048, llmOptions } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
        const result = await aiGenerateText({
            model: createModel(llmOptions),
            system,
            prompt,
            maxTokens,
            abortSignal: controller.signal,
        });
        return result.text;
    } finally {
        clearTimeout(timer);
    }
}

async function generateObject({ system, prompt, schema, schemaName = 'output', maxTokens = 4096, llmOptions } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
        const result = await aiGenerateObject({
            model: createModel(llmOptions),
            system,
            prompt,
            schema,
            schemaName,
            maxTokens,
            abortSignal: controller.signal,
        });
        return result.object;
    } finally {
        clearTimeout(timer);
    }
}

function getProviderInfo(llmOptions = {}) {
    const { provider, model } = resolveOptions(llmOptions);
    return { provider, model };
}

module.exports = { generateText, generateObject, getProviderInfo, createModel, resolveOptions };
