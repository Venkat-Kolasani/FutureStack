/**
 * Encrypt/decrypt user-provided LLM API keys at rest (BYOK).
 * Uses AES-256-GCM with a server-side secret — keys are never stored in plaintext.
 */

'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
    const secret = process.env.AI_KEY_ENCRYPTION_KEY
        || process.env.SHARE_LINK_ENCRYPTION_KEY
        || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) {
        throw new Error('Server encryption key not configured for API key storage');
    }
    return crypto.createHash('sha256').update(secret).digest();
}

function encryptApiKey(apiKey) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        api_key_ciphertext: ciphertext.toString('base64'),
        api_key_iv: iv.toString('base64'),
        api_key_auth_tag: authTag.toString('base64'),
    };
}

function decryptApiKey(row) {
    if (!row?.api_key_ciphertext || !row?.api_key_iv || !row?.api_key_auth_tag) {
        return null;
    }

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(row.api_key_iv, 'base64'),
        { authTagLength: AUTH_TAG_LENGTH }
    );
    decipher.setAuthTag(Buffer.from(row.api_key_auth_tag, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(row.api_key_ciphertext, 'base64')),
        decipher.final(),
    ]).toString('utf8');
}

function isDecryptFailure(err) {
    const msg = err?.message || '';
    return (
        err?.code === 'ERR_CRYPTO_INVALID_AUTH_TAG' ||
        msg.includes('Unsupported state or unable to authenticate data')
    );
}

/**
 * Decrypt without throwing on stale/corrupt ciphertext (e.g. encryption secret changed).
 * @returns {{ key: string|null, failed: boolean }}
 */
function tryDecryptApiKey(row) {
    if (!row?.api_key_ciphertext || !row?.api_key_iv || !row?.api_key_auth_tag) {
        return { key: null, failed: false };
    }
    try {
        return { key: decryptApiKey(row), failed: false };
    } catch (err) {
        if (isDecryptFailure(err)) {
            return { key: null, failed: true };
        }
        throw err;
    }
}

/** Return a safe hint like "…abc1" for UI display. */
function keyHint(apiKey) {
    if (!apiKey || apiKey.length < 4) return null;
    return `…${apiKey.slice(-4)}`;
}

module.exports = { encryptApiKey, decryptApiKey, tryDecryptApiKey, isDecryptFailure, keyHint };
