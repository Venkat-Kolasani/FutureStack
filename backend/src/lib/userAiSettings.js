/**
 * Load and resolve per-user LLM credentials for the AI Resume Checker.
 */

'use strict';

const { supabase } = require('./supabase');
const { tryDecryptApiKey, keyHint } = require('./apiKeyVault');

const KEY_REFRESH_MESSAGE =
    'Your saved API key could not be read. Enter your Gemini API key again in AI Settings.';

/**
 * Fetch user's saved AI settings (safe for API response — no raw key).
 *
 * @param {string} userId - Internal users.id UUID
 * @returns {Promise<{ configured: boolean, provider?: string, model?: string, keyHint?: string, needsKeyRefresh?: boolean, message?: string }>}
 */
function summarizeRow(row) {
    const { key: apiKey, failed } = tryDecryptApiKey(row);
    if (failed) {
        return {
            configured: false,
            needsKeyRefresh: true,
            provider: row.provider,
            model: row.model,
            keyHint: null,
            message: KEY_REFRESH_MESSAGE,
        };
    }
    return {
        configured: Boolean(apiKey),
        needsKeyRefresh: false,
        provider: row.provider,
        model: row.model,
        keyHint: apiKey ? keyHint(apiKey) : null,
    };
}

async function getUserAiSettingsSummary(userId) {
    const { data, error } = await supabase
        .from('user_ai_settings')
        .select('provider, model, api_key_ciphertext, api_key_iv, api_key_auth_tag')
        .eq('user_id', userId);

    if (error) throw error;
    const providers = (data || []).map(summarizeRow);
    if (providers.length === 0) {
        return { configured: false, providers: [] };
    }

    const usable = providers.find((row) => row.provider === 'gemini' && row.configured)
        || providers.find((row) => row.configured);
    const refresh = providers.find((row) => row.needsKeyRefresh);

    return {
        configured: Boolean(usable),
        provider: usable?.provider || refresh?.provider,
        model: usable?.model || refresh?.model,
        keyHint: usable?.keyHint || null,
        needsKeyRefresh: !usable && Boolean(refresh),
        message: !usable && refresh ? refresh.message : undefined,
        providers,
    };
}

/**
 * Decrypt stored BYOK key for server-side verification (never expose to client).
 *
 * @param {string} userId
 * @returns {Promise<{ apiKey: string } | { failed: true } | null>}
 */
async function getUserDecryptedApiKey(userId, provider = 'gemini') {
    const { data, error } = await supabase
        .from('user_ai_settings')
        .select('provider, model, api_key_ciphertext, api_key_iv, api_key_auth_tag')
        .eq('user_id', userId)
        .eq('provider', provider)
        .maybeSingle();

    if (error) throw error;
    if (!data?.api_key_ciphertext) return null;

    const { key: apiKey, failed } = tryDecryptApiKey(data);
    if (failed) return { failed: true };
    if (!apiKey) return null;
    return { apiKey, provider: data.provider, model: data.model };
}

/**
 * Resolve LLM options for pipeline execution.
 * User BYOK key takes priority; falls back to server GEMINI_API_KEY.
 *
 * @param {string} userId
 * @returns {Promise<{ provider: string, model: string, apiKey?: string }>}
 */
async function resolveUserLlmOptions(userId) {
    const { data, error } = await supabase
        .from('user_ai_settings')
        .select('provider, model, api_key_ciphertext, api_key_iv, api_key_auth_tag')
        .eq('user_id', userId)
        .eq('provider', 'gemini')
        .maybeSingle();

    if (error) throw error;

    if (data) {
        const { key: apiKey, failed } = tryDecryptApiKey(data);
        if (failed) {
            const err = new Error(KEY_REFRESH_MESSAGE);
            err.code = 'KEY_DECRYPT_FAILED';
            throw err;
        }
        if (apiKey) {
            return { provider: data.provider, model: data.model, apiKey };
        }
    }

    if (process.env.GEMINI_API_KEY) {
        return {
            provider: process.env.LLM_PROVIDER || 'gemini',
            model: process.env.LLM_MODEL || 'gemini-3.1-flash-lite',
            apiKey: process.env.GEMINI_API_KEY,
        };
    }

    throw new Error('No API key configured. Open AI Settings and save your Gemini API key.');
}

module.exports = { getUserAiSettingsSummary, getUserDecryptedApiKey, resolveUserLlmOptions, KEY_REFRESH_MESSAGE };
