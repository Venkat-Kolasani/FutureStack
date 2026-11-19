'use strict';

process.env.SHARE_LINK_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';

const { encryptApiKey, decryptApiKey, tryDecryptApiKey, keyHint } = require('../../src/lib/apiKeyVault');

describe('apiKeyVault', () => {
    it('encrypts and decrypts an API key round-trip', () => {
        const original = 'AIzaSyTestKey1234567890';
        const encrypted = encryptApiKey(original);
        expect(Buffer.from(encrypted.api_key_auth_tag, 'base64')).toHaveLength(16);
        const decrypted = decryptApiKey(encrypted);
        expect(decrypted).toBe(original);
    });

    it('returns null when ciphertext fields are missing', () => {
        expect(decryptApiKey({})).toBeNull();
    });

    it('returns a safe key hint', () => {
        expect(keyHint('AIzaSyTestKey7890')).toBe('…7890');
    });

    it('tryDecryptApiKey reports failure on a short tag without throwing', () => {
        const encrypted = encryptApiKey('AIzaSyTestKey1234567890');
        const tampered = {
            ...encrypted,
            api_key_auth_tag: Buffer.alloc(12).toString('base64'),
        };
        expect(tryDecryptApiKey(tampered)).toEqual({ key: null, failed: true });
    });

    it('tryDecryptApiKey returns key on valid ciphertext', () => {
        const original = 'AIzaSyTestKey1234567890';
        const encrypted = encryptApiKey(original);
        expect(tryDecryptApiKey(encrypted)).toEqual({ key: original, failed: false });
    });
});
