'use strict';

const PREP_PROVIDERS = ['gemini', 'groq', 'anthropic', 'ollama'];

const PROVIDER_MODELS = {
    gemini: [
        'gemini-2.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.5-pro',
    ],
    groq: ['openai/gpt-oss-120b'],
    anthropic: ['claude-sonnet-4-5'],
};

const DEFAULT_MODELS = {
    gemini: 'gemini-2.5-flash',
    groq: 'openai/gpt-oss-120b',
    anthropic: 'claude-sonnet-4-5',
    ollama: 'llama3.2',
};

function defaultModelFor(provider) {
    return DEFAULT_MODELS[provider] || DEFAULT_MODELS.gemini;
}

function isAllowedModel(provider, model) {
    if (provider === 'ollama') {
        return typeof model === 'string' && model.trim().length > 0 && model.length <= 100;
    }
    const allowed = PROVIDER_MODELS[provider];
    return Array.isArray(allowed) && allowed.includes(model);
}

module.exports = {
    PREP_PROVIDERS,
    PROVIDER_MODELS,
    DEFAULT_MODELS,
    defaultModelFor,
    isAllowedModel,
};
