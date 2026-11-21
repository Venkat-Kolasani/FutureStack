/**
 * AI Settings routes (BYOK)
 *
 * GET    /api/ai-settings  – whether user has a saved key (safe summary)
 * PUT    /api/ai-settings  – save/update encrypted API key + provider/model
 * DELETE /api/ai-settings  – remove saved key
 */

'use strict';

const express = require('express');
const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');
const { saveAiSettingsSchema } = require('../validation/ai-settings-schemas');
const { encryptApiKey } = require('../lib/apiKeyVault');
const { getUserAiSettingsSummary, getUserDecryptedApiKey } = require('../lib/userAiSettings');
const { mapDbError } = require('../lib/dbSetup');
const { sanitizeApiKey } = require('../lib/geminiKeyValidation');
const { verifyProviderKey } = require('../lib/providerKeyValidation');
const { defaultModelFor, isAllowedModel } = require('../lib/providerModels');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const summary = await getUserAiSettingsSummary(req.auth.internalUserId);
        return res.json(summary);
    } catch (err) {
        console.error('[ai-settings] GET error:', err.message);
        const mapped = mapDbError(err);
        if (mapped) {
            return res.status(503).json(mapped);
        }
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to load AI settings.',
        });
    }
});

router.put('/', validate(saveAiSettingsSchema), async (req, res) => {
    const userId = req.auth.internalUserId;
    const { provider, model, apiKey } = req.body;
    const trimmedKey = sanitizeApiKey(typeof apiKey === 'string' ? apiKey : '');

    try {
        if (!trimmedKey) {
            if (provider === 'ollama') {
                const modelToSave = model || defaultModelFor('ollama');
                const encrypted = encryptApiKey('local');
                const { error } = await supabase
                    .from('user_ai_settings')
                    .upsert({
                        user_id: userId,
                        provider,
                        model: modelToSave,
                        ...encrypted,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id,provider' });
                if (error) throw error;
                return res.json(await getUserAiSettingsSummary(userId));
            }

            const summary = await getUserAiSettingsSummary(userId);
            const existing = (summary.providers || []).find((row) => row.provider === provider);
            if (!existing?.configured) {
                return res.status(400).json({
                    error: 'API Key Required',
                    code: existing?.needsKeyRefresh ? 'KEY_DECRYPT_FAILED' : 'API_KEY_REQUIRED',
                    needsKeyRefresh: Boolean(existing?.needsKeyRefresh),
                    message: existing?.needsKeyRefresh
                        ? existing.message
                        : 'Enter an API key for this provider.',
                });
            }

            if (provider !== 'ollama') {
                const stored = await getUserDecryptedApiKey(userId, provider);
                if (!stored || stored.failed) {
                    return res.status(400).json({
                        error: 'API Key Required',
                        code: stored?.failed ? 'KEY_DECRYPT_FAILED' : 'API_KEY_REQUIRED',
                        needsKeyRefresh: Boolean(stored?.failed),
                        message: 'Enter an API key for this provider.',
                    });
                }
                const verification = await verifyProviderKey(provider, stored.apiKey, model);
                if (!verification.ok) {
                    return res.status(400).json({
                        error: verification.code || 'Invalid Model',
                        code: verification.code || 'LLM_MODEL_ERROR',
                        message: verification.message
                            || `Your saved API key cannot use model "${model}".`,
                        needsApiKey: verification.code === 'LLM_AUTH_ERROR',
                    });
                }
            } else if (!isAllowedModel(provider, model)) {
                return res.status(400).json({
                    error: 'Invalid Model',
                    code: 'LLM_MODEL_ERROR',
                    message: 'Enter a local model name.',
                });
            }

            const { error } = await supabase
                .from('user_ai_settings')
                .update({
                    model,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('provider', provider);

            if (error) throw error;
            return res.json(await getUserAiSettingsSummary(userId));
        }

        const modelToSave = model || defaultModelFor(provider);
        if (provider !== 'ollama') {
            const verification = await verifyProviderKey(provider, trimmedKey, modelToSave);
            if (!verification.ok) {
                return res.status(400).json({
                    error: verification.code || 'Invalid API Key',
                    code: verification.code || 'LLM_AUTH_ERROR',
                    message: verification.message,
                    needsApiKey: true,
                });
            }
        }

        const encrypted = encryptApiKey(trimmedKey);

        const { error } = await supabase
            .from('user_ai_settings')
            .upsert({
                user_id: userId,
                provider,
                model: modelToSave,
                ...encrypted,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,provider' });

        if (error) throw error;

        const summary = await getUserAiSettingsSummary(userId);
        return res.json({
            ...summary,
            message: 'API key saved securely. You will not need to enter it again.',
        });
    } catch (err) {
        console.error('[ai-settings] PUT error:', err.message);
        const mapped = mapDbError(err);
        if (mapped) {
            return res.status(503).json(mapped);
        }
        return res.status(500).json({
            error: 'Internal Server Error',
            message: err.message.includes('encryption key')
                ? 'Server is not configured for API key storage.'
                : 'Failed to save AI settings.',
        });
    }
});

router.delete('/', async (req, res) => {
    const userId = req.auth.internalUserId;

    try {
        const provider = typeof req.query.provider === 'string' ? req.query.provider : '';
        let query = supabase.from('user_ai_settings').delete().eq('user_id', userId);
        if (provider) {
            query = query.eq('provider', provider);
        }
        const { error } = await query;

        if (error) throw error;

        return res.json({ configured: false, message: 'API key removed.' });
    } catch (err) {
        console.error('[ai-settings] DELETE error:', err.message);
        const mapped = mapDbError(err);
        if (mapped) {
            return res.status(503).json(mapped);
        }
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to remove AI settings.',
        });
    }
});

module.exports = router;
