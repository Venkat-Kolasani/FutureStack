const express = require('express');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');
const {
    hashToken,
    isShareExpired,
    sanitizeShareForPublic,
    verifyPasscode,
} = require('../lib/shareLinks');
const {
    publicTokenParamSchema,
    verifyPasscodeSchema,
} = require('../validation/share-links-schemas');

const router = express.Router();

const PUBLIC_SHARE_FIELDS =
    'id, token_hash, snapshot, snapshot_type, expires_at, is_active, view_count, passcode_hash, passcode_salt, created_at, updated_at';

const publicShareReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Share Link Rate Limit Exceeded',
            message: 'Too many share link requests. Please wait and try again.',
        });
    },
});

const publicShareVerifyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const ip = req.ips?.[0] || req.ip;
        return `${req.params.token}:${ipKeyGenerator(ip)}`;
    },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Passcode Rate Limit Exceeded',
            message: 'Too many passcode attempts. Please wait and try again.',
        });
    },
});

function handlePublicShareError(res, action, error, defaultMessage) {
    console.error(`${action} error:`, {
        type: 'ROUTE_ERROR',
        service: 'public-share-links',
        message: error?.message,
        code: error?.code,
    });

    return res.status(500).json({ error: defaultMessage });
}

async function findActiveShareByToken(token) {
    const { data, error } = await supabase
        .from('share_links')
        .select(PUBLIC_SHARE_FIELDS)
        .eq('token_hash', hashToken(token))
        .eq('is_active', true)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }

    if (isShareExpired(data)) {
        return null;
    }

    return data;
}

async function serveActiveShare(shareId) {
    const { data, error } = await supabase.rpc('serve_public_share_link', {
        p_share_id: shareId,
    });

    if (error) {
        throw error;
    }

    const served = Array.isArray(data) ? data[0] : data;
    return served || null;
}

function sendUnavailable(res) {
    return res.status(410).json({
        error: 'Share Link Unavailable',
        message: 'This link has expired or been revoked.',
    });
}

function sendPublicShare(res, share) {
    return res.json(sanitizeShareForPublic(share));
}

/**
 * GET /api/public/share-links/:token
 * Public read. If a passcode is configured, return a gated response without the
 * snapshot until POST /verify succeeds.
 */
router.get('/:token', publicShareReadLimiter, validate(publicTokenParamSchema, 'params'), async (req, res) => {
    try {
        const share = await findActiveShareByToken(req.params.token);

        if (!share) {
            return sendUnavailable(res);
        }

        if (share.passcode_hash) {
            return res.json({
                requiresPasscode: true,
                expiresAt: share.expires_at,
                createdAt: share.created_at,
                message: 'Enter the 4-digit passcode to view this shared dashboard.',
            });
        }

        const served = await serveActiveShare(share.id);
        if (!served) {
            return sendUnavailable(res);
        }

        return sendPublicShare(res, served);
    } catch (error) {
        return handlePublicShareError(res, 'FETCH_PUBLIC_SHARE', error, 'Failed to fetch shared dashboard');
    }
});

/**
 * POST /api/public/share-links/:token/verify
 * Verify passcode and return the public share snapshot.
 */
router.post(
    '/:token/verify',
    publicShareVerifyLimiter,
    validate(publicTokenParamSchema, 'params'),
    validate(verifyPasscodeSchema),
    async (req, res) => {
        try {
            const share = await findActiveShareByToken(req.params.token);

            if (!share) {
                return sendUnavailable(res);
            }

            if (!verifyPasscode(req.body.passcode, share.passcode_hash, share.passcode_salt)) {
                return res.status(401).json({
                    error: 'Invalid Passcode',
                    message: 'That passcode is incorrect. Please try again.',
                });
            }

            const served = await serveActiveShare(share.id);
            if (!served) {
                return sendUnavailable(res);
            }

            return sendPublicShare(res, served);
        } catch (error) {
            return handlePublicShareError(res, 'VERIFY_PUBLIC_SHARE', error, 'Failed to verify shared dashboard');
        }
    }
);

module.exports = router;
